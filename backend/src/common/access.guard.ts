import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, Prisma } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma.service';
import { AuthenticatedRequest, PUBLIC_ROUTE, REQUIRED_PERMISSION } from './authz';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer access token required.');
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) throw new UnauthorizedException('Authentication is not configured.');
    let subject: string;
    let sessionId: string;
    try {
      const decoded = jwt.verify(header.slice(7), secret);
      if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.sid !== 'string') throw new Error('Invalid token claims');
      subject = decoded.sub;
      sessionId = decoded.sid;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: { id: true, status: true, memberships: { where: { active: true }, select: { companyId: true, factoryId: true } } },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account is unavailable.');
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!session) throw new UnauthorizedException('Session is no longer active.');
    request.user = { id: user.id, sessionId, memberships: user.memberships, companyIds: [...new Set(user.memberships.map(m => m.companyId))] };

    let requestedCompanyId = (request.params?.companyId as string | undefined)
      ?? (request.query?.companyId as string | undefined)
      ?? (request.body?.companyId as string | undefined);
    if (requestedCompanyId && !request.user.companyIds.includes(requestedCompanyId)) {
      throw new ForbiddenException('You do not have access to this company.');
    }
    const requiredMetadata = this.reflector.getAllAndOverride<{ resource: string; action: PermissionAction; platformOnly?: boolean } | Array<{ resource: string; action: PermissionAction; platformOnly?: boolean }>>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
    const requiredPermissions = Array.isArray(requiredMetadata) ? requiredMetadata : requiredMetadata ? [requiredMetadata] : [];
    const requestedFactoryId = (request.params?.factoryId as string | undefined)
      ?? (request.query?.factoryId as string | undefined)
      ?? (request.body?.factoryId as string | undefined);
    if (requestedFactoryId) {
      const factory = await this.prisma.factory.findUnique({ where: { id: requestedFactoryId }, select: { companyId: true, active: true } });
      if (!factory || (requestedCompanyId && factory.companyId !== requestedCompanyId)) throw new ForbiddenException('You do not have access to this factory.');
      const canManageFactoryStatus = requiredPermissions.length === 1
        && requiredPermissions[0].resource === 'factories'
        && requiredPermissions[0].action === PermissionAction.UPDATE;
      if (factory.active === false && !canManageFactoryStatus && requiredPermissions.some(permission => permission.action !== PermissionAction.READ)) {
        throw new ForbiddenException('This factory is inactive and cannot accept operational changes.');
      }
      requestedCompanyId = factory.companyId;
      if (!request.user.memberships.some(m => m.companyId === factory.companyId && (m.factoryId === null || m.factoryId === requestedFactoryId))) {
        throw new ForbiddenException('You do not have access to this factory.');
      }
    }

    for (const required of requiredPermissions) {
      const membershipScope: Prisma.MembershipWhereInput = {
        userId: user.id,
        active: true,
        companyId: requestedCompanyId ?? { in: user.memberships.map(m => m.companyId) },
        ...(requestedFactoryId
          ? { OR: [{ factoryId: null }, { factoryId: requestedFactoryId }] }
          : { factoryId: null }),
      };
      const roleScope: Prisma.RoleWhereInput = required.platformOnly
        ? { companyId: null, systemRole: true }
        : { OR: [{ companyId: requestedCompanyId ?? { in: user.memberships.map(m => m.companyId) } }, { companyId: null, systemRole: true }] };
      const grants = await this.prisma.userRole.findMany({
        where: {
          membership: membershipScope,
          role: { AND: [
            roleScope,
            { permissions: { some: { permission: { resource: required.resource, action: required.action } } } },
          ] },
        },
        select: { membershipId: true },
      });
      if (!grants.length) throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
