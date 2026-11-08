import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthChallengePurpose } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { MailerService } from './mailer.service';
import { PrismaService } from '../../common/prisma.service';

describe('AuthService challenge flows', () => {
  let prisma: any;
  let mailer: any;
  let service: AuthService;

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-which-is-at-least-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-which-is-at-least-32-characters-long';
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ failedLoginCount: 1 }) },
      authChallenge: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      authSession: { create: jest.fn(), updateMany: jest.fn() },
      authLoginEvent: { create: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(prisma)),
    };
    mailer = { assertConfigured: jest.fn(), send: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma as PrismaService, mailer as MailerService);
  });

  it('refuses password reset requests when SMTP delivery is not configured', async () => {
    mailer.assertConfigured.mockImplementation(() => { throw new ServiceUnavailableException(); });
    await expect(service.requestPasswordReset('user@example.com')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('stores only a hash of an email OTP and does not return the code', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com', status: 'ACTIVE' });
    prisma.authChallenge.create.mockImplementation(({ data }: { data: Record<string, any> }) => Promise.resolve({ id: 'challenge-1', ...data }));
    const result = await service.requestOtp('USER@example.com');
    const storedHash = prisma.authChallenge.create.mock.calls[0][0].data.secretHash;
    const sentCode = mailer.send.mock.calls[0][2].match(/\b\d{6}\b/)?.[0];
    expect(sentCode).toBeDefined();
    expect(storedHash).not.toBe(sentCode);
    expect(prisma.authChallenge.create.mock.calls[0][0].data.purpose).toBe(AuthChallengePurpose.OTP_LOGIN);
    expect(result).not.toHaveProperty('code');
  });

  it('consumes a valid OTP once and returns a session-bound access token', async () => {
    const code = '123456';
    const secretHash = createHmac('sha256', process.env.JWT_REFRESH_SECRET!).update(`OTP_LOGIN:${code}`).digest('hex');
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com', fullName: 'Test User', status: 'ACTIVE', emailVerifiedAt: null });
    prisma.authChallenge.findFirst.mockResolvedValue({ id: 'challenge-1', secretHash });
    prisma.authChallenge.updateMany.mockResolvedValue({ count: 1 });
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });
    const result = await service.verifyOtp('user@example.com', code, 'Chrome');
    expect(prisma.authChallenge.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'challenge-1', secretHash }) }));
    const claims = jwt.verify(result.accessToken, process.env.JWT_ACCESS_SECRET!) as jwt.JwtPayload;
    expect(claims.sub).toBe('user-1');
    expect(claims.sid).toBe('session-1');
    expect(result.sessionId).toBe('session-1');
    expect(result.user.email).toBe('user@example.com');
    expect(prisma.authLoginEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-1', result: 'SUCCESS' }),
    }));
  });

  it('counts wrong OTP attempts and rejects the code', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
    prisma.authChallenge.findFirst.mockResolvedValue({ id: 'challenge-1', secretHash: 'wrong-hash' });
    prisma.authChallenge.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.verifyOtp('user@example.com', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.authChallenge.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.authSession.create).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { failedLoginCount: { increment: 1 } },
    }));
  });

  it('creates a password session and records successful device history', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', fullName: 'Test User', status: 'ACTIVE',
      passwordHash: 'password-hash', failedLoginCount: 2, lockedUntil: null,
    });
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });

    const result = await service.login('USER@example.com', 'valid-password', 'Laptop', '127.0.0.1', 'Test Browser');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: expect.any(Date) },
    }));
    expect(prisma.authLoginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', result: 'SUCCESS', deviceName: 'Laptop', ipAddress: '127.0.0.1' }),
    });
    expect(result.sessionId).toBe('session-1');
    jest.restoreAllMocks();
  });

  it('increments failed password attempts atomically and records the login event', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', status: 'ACTIVE', passwordHash: 'password-hash', failedLoginCount: 2, lockedUntil: null,
    });

    await expect(service.login('user@example.com', 'wrong-password', 'Laptop', '127.0.0.1', 'Test Browser'))
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { failedLoginCount: { increment: 1 } },
    }));
    expect(prisma.authLoginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', result: 'FAILED', deviceName: 'Laptop' }),
    });
    jest.restoreAllMocks();
  });

  it('locks an account after the configured failed-login threshold', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', status: 'ACTIVE', passwordHash: 'password-hash', failedLoginCount: 7, lockedUntil: null,
    });
    prisma.user.update.mockResolvedValue({ failedLoginCount: 8 });

    await expect(service.login('user@example.com', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { lockedUntil: expect.any(Date) },
    }));
    expect(prisma.authLoginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: 'LOCKED' }),
    });
    jest.restoreAllMocks();
  });

  it('records and rejects attempts while an account lock is active', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', status: 'ACTIVE', passwordHash: 'password-hash', lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(service.login('user@example.com', 'password')).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.authLoginEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', result: 'LOCKED' }),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not allow OTP to bypass an active account lock', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'ACTIVE', lockedUntil: new Date(Date.now() + 60_000) });

    await expect(service.verifyOtp('user@example.com', '123456')).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.authChallenge.findFirst).not.toHaveBeenCalled();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('updates the password, consumes the reset challenge, and revokes existing sessions', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-password-hash' as never);
    prisma.authChallenge.findFirst.mockResolvedValue({ id: 'challenge-1', userId: 'user-1' });
    prisma.authChallenge.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.completePasswordReset('a'.repeat(43), 'a-strong-password');

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-password-hash', failedLoginCount: 0, lockedUntil: null },
    }));
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', revokedAt: null },
    }));
    jest.restoreAllMocks();
  });

  it('consumes email verification links once', async () => {
    prisma.authChallenge.findFirst.mockResolvedValue({ id: 'challenge-1', userId: 'user-1' });
    prisma.authChallenge.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.completeEmailVerification('a'.repeat(43));

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { emailVerifiedAt: expect.any(Date) },
    }));
  });

  it('does not require email delivery to report an already verified account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'user@example.com', emailVerifiedAt: new Date(),
    });

    await expect(service.requestEmailVerification('user-1')).resolves.toMatchObject({ success: true });

    expect(mailer.assertConfigured).not.toHaveBeenCalled();
    expect(prisma.authChallenge.create).not.toHaveBeenCalled();
  });

  it('returns only the authenticated user’s most recent login events', async () => {
    prisma.authLoginEvent.findMany.mockResolvedValue([]);

    await service.listLoginHistory('user-1');

    expect(prisma.authLoginEvent.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true, result: true, deviceName: true, ipAddress: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('rotates refresh tokens exactly once per session', async () => {
    prisma.authSession.findUnique = jest.fn().mockResolvedValue({
      id: 'session-1', userId: 'user-1', revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
      user: { status: 'ACTIVE' },
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.refresh('original-refresh-token'.repeat(2));

    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-1', revokedAt: null }),
      data: expect.objectContaining({ refreshTokenHash: expect.any(String) }),
    }));
    expect(result.refreshToken).not.toBe('original-refresh-token'.repeat(2));
    const claims = jwt.verify(result.accessToken, process.env.JWT_ACCESS_SECRET!) as jwt.JwtPayload;
    expect(claims.sid).toBe('session-1');
  });
});
