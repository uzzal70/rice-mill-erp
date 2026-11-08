import { HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomInt, createHash, createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma.service';
import { AuthChallengePurpose, AuthLoginResult } from '@prisma/client';
import { MailerService } from './mailer.service';

@Injectable()
export class AuthService {
  private static readonly MAX_LOGIN_FAILURES = 8;
  private static readonly LOCK_DURATION_MS = 15 * 60_000;

  constructor(private readonly prisma: PrismaService, private readonly mailer: MailerService) {}
  private secret(name: string): string {
    const value = process.env[name];
    if (!value || value.length < 32) throw new Error(`${name} must be configured with at least 32 characters`);
    return value;
  }
  private accessToken(userId: string, sessionId: string) {
    const expiresIn = (process.env.ACCESS_TOKEN_TTL ?? '15m') as jwt.SignOptions['expiresIn'];
    return jwt.sign({ sub: userId, sid: sessionId }, this.secret('JWT_ACCESS_SECRET'), { expiresIn });
  }
  private tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  private challengeHash(secret: string, purpose: AuthChallengePurpose) {
    if (purpose === AuthChallengePurpose.OTP_LOGIN) {
      return createHmac('sha256', this.secret('JWT_REFRESH_SECRET')).update(`${purpose}:${secret}`).digest('hex');
    }
    return this.tokenHash(`${purpose}:${secret}`);
  }

  private async canIssueChallenge(userId: string, purpose: AuthChallengePurpose) {
    const count = await this.prisma.authChallenge.count({
      where: { userId, purpose, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } },
    });
    return count < 5;
  }

  private async recordFailedLogin(
    userId: string,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { failedLoginCount: { increment: 1 } },
        select: { failedLoginCount: true },
      });
      const locked = user.failedLoginCount >= AuthService.MAX_LOGIN_FAILURES;
      if (locked) {
        await tx.user.update({
          where: { id: userId },
          data: { lockedUntil: new Date(now.getTime() + AuthService.LOCK_DURATION_MS) },
        });
      }
      await tx.authLoginEvent.create({
        data: {
          userId,
          result: locked ? AuthLoginResult.LOCKED : AuthLoginResult.FAILED,
          deviceName,
          ipAddress,
          userAgent,
          createdAt: now,
        },
      });
    });
  }

  private async issueEmailChallenge(userId: string, email: string, purpose: AuthChallengePurpose, token: string, expiresAt: Date, route: string, subject: string) {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new ServiceUnavailableException('Account email links are not configured.');
    let url: URL;
    try { url = new URL(route, appUrl); }
    catch { throw new ServiceUnavailableException('Account email links are not configured.'); }
    url.searchParams.set('token', token);
    const challenge = await this.prisma.authChallenge.create({
      data: { userId, purpose, secretHash: this.challengeHash(token, purpose), expiresAt },
    });
    try {
      await this.mailer.send(email, subject, `Use this link to continue: ${url.toString()}\nThis link expires at ${expiresAt.toISOString()}.`);
    } catch (error) {
      await this.prisma.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw error;
    }
  }

  async login(email: string, password: string, deviceName?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.status !== 'ACTIVE' || !user.passwordHash) {
      throw new UnauthorizedException('Email or password is incorrect, or the account cannot sign in.');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.prisma.authLoginEvent.create({
        data: { userId: user.id, result: AuthLoginResult.LOCKED, deviceName, ipAddress, userAgent },
      });
      throw new UnauthorizedException('Email or password is incorrect, or the account cannot sign in.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(user.id, deviceName, ipAddress, userAgent);
      throw new UnauthorizedException('Email or password is incorrect, or the account cannot sign in.');
    }
    const refreshToken = randomBytes(48).toString('base64url');
    const ttl = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
    const session = await this.prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
      const created = await tx.authSession.create({
        data: { userId: user.id, refreshTokenHash: this.tokenHash(refreshToken), deviceName, ipAddress, userAgent, expiresAt: new Date(Date.now() + ttl * 86400_000) },
      });
      await tx.authLoginEvent.create({
        data: { userId: user.id, result: AuthLoginResult.SUCCESS, deviceName, ipAddress, userAgent },
      });
      return created;
    });
    return { accessToken: this.accessToken(user.id, session.id), refreshToken, sessionId: session.id, user: { id: user.id, email: user.email, fullName: user.fullName } };
  }

  async refresh(token: string) {
    const hash = this.tokenHash(token);
    const session = await this.prisma.authSession.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedException('Session expired. Please sign in again.');
    const next = randomBytes(48).toString('base64url');
    const ttl = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
    const result = await this.prisma.authSession.updateMany({ where: { id: session.id, refreshTokenHash: hash, revokedAt: null }, data: { refreshTokenHash: this.tokenHash(next), expiresAt: new Date(Date.now() + ttl * 86400_000) } });
    if (result.count !== 1) throw new UnauthorizedException('Session has already been refreshed. Please sign in again.');
    return { accessToken: this.accessToken(session.userId, session.id), refreshToken: next };
  }

  async logout(token: string) {
    await this.prisma.authSession.updateMany({ where: { refreshTokenHash: this.tokenHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async requestPasswordReset(email: string) {
    this.mailer.assertConfigured();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, email: true, status: true } });
    if (user?.status === 'ACTIVE' && await this.canIssueChallenge(user.id, AuthChallengePurpose.PASSWORD_RESET)) {
      const token = randomBytes(32).toString('base64url');
      await this.issueEmailChallenge(user.id, user.email, AuthChallengePurpose.PASSWORD_RESET, token, new Date(Date.now() + 30 * 60_000), '/reset-password', 'Reset your Rice Mill ERP password');
    }
    return { success: true, message: 'If the account is eligible, password reset instructions have been sent.' };
  }

  async completePasswordReset(token: string, password: string) {
    const challenge = await this.prisma.authChallenge.findFirst({
      where: { purpose: AuthChallengePurpose.PASSWORD_RESET, secretHash: this.challengeHash(token, AuthChallengePurpose.PASSWORD_RESET), consumedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
    if (!challenge) throw new UnauthorizedException('Reset link is invalid or expired.');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.authChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('Reset link is invalid or expired.');
      await tx.user.update({ where: { id: challenge.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } });
      await tx.authSession.updateMany({ where: { userId: challenge.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { success: true, message: 'Password updated. Sign in with your new password.' };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (!user) throw new UnauthorizedException('Account is unavailable.');
    if (user.emailVerifiedAt) return { success: true, message: 'Email address is already verified.' };
    if (!await this.canIssueChallenge(user.id, AuthChallengePurpose.EMAIL_VERIFICATION)) throw new HttpException('Too many verification requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    this.mailer.assertConfigured();
    const token = randomBytes(32).toString('base64url');
    await this.issueEmailChallenge(user.id, user.email, AuthChallengePurpose.EMAIL_VERIFICATION, token, new Date(Date.now() + 24 * 60 * 60_000), '/verify-email', 'Verify your Rice Mill ERP email');
    return { success: true, message: 'Verification instructions have been sent.' };
  }

  async completeEmailVerification(token: string) {
    const challenge = await this.prisma.authChallenge.findFirst({
      where: { purpose: AuthChallengePurpose.EMAIL_VERIFICATION, secretHash: this.challengeHash(token, AuthChallengePurpose.EMAIL_VERIFICATION), consumedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
    if (!challenge) throw new UnauthorizedException('Verification link is invalid or expired.');
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.authChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('Verification link is invalid or expired.');
      await tx.user.update({ where: { id: challenge.userId }, data: { emailVerifiedAt: new Date() } });
    });
    return { success: true, message: 'Email address verified.' };
  }

  async requestOtp(email: string) {
    this.mailer.assertConfigured();
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true, status: true, lockedUntil: true } });
    if (user?.status === 'ACTIVE' && (!user.lockedUntil || user.lockedUntil <= new Date()) && await this.canIssueChallenge(user.id, AuthChallengePurpose.OTP_LOGIN)) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      await this.prisma.authChallenge.updateMany({
        where: { userId: user.id, purpose: AuthChallengePurpose.OTP_LOGIN, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      const challenge = await this.prisma.authChallenge.create({
        data: { userId: user.id, purpose: AuthChallengePurpose.OTP_LOGIN, secretHash: this.challengeHash(code, AuthChallengePurpose.OTP_LOGIN), expiresAt },
      });
      try {
        await this.mailer.send(user.email, 'Your Rice Mill ERP sign-in code', `Your sign-in code is ${code}. It expires in 5 minutes.`);
      } catch (error) {
        await this.prisma.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
        throw error;
      }
    }
    return { success: true, message: 'If the account is eligible, a sign-in code has been sent.' };
  }

  async verifyOtp(email: string, code: string, deviceName?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Sign-in code is invalid or expired.');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.prisma.authLoginEvent.create({
        data: { userId: user.id, result: AuthLoginResult.LOCKED, deviceName, ipAddress, userAgent },
      });
      throw new UnauthorizedException('Sign-in code is invalid or expired.');
    }
    const challenge = await this.prisma.authChallenge.findFirst({
      where: { userId: user.id, purpose: AuthChallengePurpose.OTP_LOGIN, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) throw new UnauthorizedException('Sign-in code is invalid or expired.');
    const matches = challenge.secretHash === this.challengeHash(code, AuthChallengePurpose.OTP_LOGIN);
    if (!matches) {
      const failed = await this.prisma.authChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, failedAttempts: { lt: 5 } }, data: { failedAttempts: { increment: 1 } } });
      await this.prisma.authChallenge.updateMany({ where: { id: challenge.id, failedAttempts: { gte: 5 }, consumedAt: null }, data: { consumedAt: new Date() } });
      if (failed.count === 1) await this.recordFailedLogin(user.id, deviceName, ipAddress, userAgent);
      throw new UnauthorizedException('Sign-in code is invalid or expired.');
    }
    const refreshToken = randomBytes(48).toString('base64url');
    const ttl = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);
    const session = await this.prisma.$transaction(async tx => {
      const consumed = await tx.authChallenge.updateMany({
        where: { id: challenge.id, secretHash: challenge.secretHash, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new UnauthorizedException('Sign-in code is invalid or expired.');
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date(), lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null } });
      const created = await tx.authSession.create({ data: { userId: user.id, refreshTokenHash: this.tokenHash(refreshToken), deviceName, ipAddress, userAgent, expiresAt: new Date(Date.now() + ttl * 86400_000) } });
      await tx.authLoginEvent.create({ data: { userId: user.id, result: AuthLoginResult.SUCCESS, deviceName, ipAddress, userAgent } });
      return created;
    });
    return { accessToken: this.accessToken(user.id, session.id), refreshToken, sessionId: session.id, user: { id: user.id, email: user.email, fullName: user.fullName } };
  }

  async listSessions(userId: string) {
    return this.prisma.authSession.findMany({
      where: { userId },
      select: { id: true, deviceName: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true, revokedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listLoginHistory(userId: string) {
    return this.prisma.authLoginEvent.findMany({
      where: { userId },
      select: { id: true, result: true, deviceName: true, ipAddress: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
