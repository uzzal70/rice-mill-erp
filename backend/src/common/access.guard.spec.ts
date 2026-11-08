import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { AccessGuard } from './access.guard';
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from './authz';
import { PrismaService } from './prisma.service';

const SECRET = 'test-access-secret-which-is-at-least-32-characters-long';

function setup(
  publicRoute = false,
  permissionMetadata: unknown = { resource: 'users', action: PermissionAction.READ },
  memberships: Array<{ companyId: string; factoryId: string | null }> = [{ companyId: 'company-1', factoryId: null }],
) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({
      id: 'user-1', status: 'ACTIVE', memberships,
    }) },
    authSession: { findFirst: jest.fn().mockResolvedValue({ id: 'session-1' }) },
    factory: { findUnique: jest.fn() },
    userRole: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === PUBLIC_ROUTE) return publicRoute;
      if (key === REQUIRED_PERMISSION) return permissionMetadata;
      return undefined;
    }),
  } as unknown as Reflector;
  const guard = new AccessGuard(prisma, reflector);
  const request: any = { headers: {}, params: {}, query: {}, body: {} };
  const context = {
    getHandler: jest.fn(), getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard, prisma, request, context };
}

function bearer(request: any) {
  request.headers.authorization = `Bearer ${jwt.sign({ sub: 'user-1', sid: 'session-1' }, SECRET, { expiresIn: '15m' })}`;
}

describe('AccessGuard', () => {
  beforeEach(() => { process.env.JWT_ACCESS_SECRET = SECRET; });

  it('allows explicitly public routes without loading a user', async () => {
    const { guard, prisma, context } = setup(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without a bearer token', async () => {
    const { guard, context } = setup();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a tenant id outside the user memberships', async () => {
    const { guard, context, request } = setup();
    bearer(request);
    request.query.companyId = 'another-company';
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies access when no matching role grant exists', async () => {
    const { guard, context, request } = setup();
    bearer(request);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an active session with a matching permission grant', async () => {
    const { guard, context, request, prisma } = setup();
    bearer(request);
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ membershipId: 'membership-1' }]);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a factory-scoped role only for its assigned factory', async () => {
    const { guard, context, request, prisma } = setup(
      false,
      { resource: 'reports', action: PermissionAction.READ },
      [{ companyId: 'company-1', factoryId: 'factory-1' }],
    );
    bearer(request);
    request.query.companyId = 'company-1';
    request.query.factoryId = 'factory-1';
    (prisma.factory.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-1' });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ membershipId: 'membership-1' }]);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    request.query.factoryId = 'factory-2';
    (prisma.factory.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-1' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks operational writes to inactive factories but allows factory status management', async () => {
    const operational = setup(
      false,
      { resource: 'production', action: PermissionAction.CREATE },
      [{ companyId: 'company-1', factoryId: null }],
    );
    bearer(operational.request);
    operational.request.params.factoryId = 'factory-1';
    (operational.prisma.factory.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-1', active: false });
    await expect(operational.guard.canActivate(operational.context)).rejects.toBeInstanceOf(ForbiddenException);

    const management = setup(
      false,
      { resource: 'factories', action: PermissionAction.UPDATE },
      [{ companyId: 'company-1', factoryId: null }],
    );
    bearer(management.request);
    management.request.params.factoryId = 'factory-1';
    (management.prisma.factory.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-1', active: false });
    (management.prisma.userRole.findMany as jest.Mock).mockResolvedValue([{ membershipId: 'membership-1' }]);
    await expect(management.guard.canActivate(management.context)).resolves.toBe(true);
  });

  it('rejects access after the backing session is revoked', async () => {
    const { guard, context, request, prisma } = setup();
    bearer(request);
    (prisma.authSession.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires every permission on financial update routes', async () => {
    const permissions = [
      { resource: 'items', action: PermissionAction.UPDATE },
      { resource: 'items', action: PermissionAction.VIEW_FINANCIAL },
    ];
    const { guard, context, request, prisma } = setup(false, permissions);
    bearer(request);
    (prisma.userRole.findMany as jest.Mock).mockResolvedValueOnce([{ membershipId: 'membership-1' }]).mockResolvedValueOnce([]);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userRole.findMany).toHaveBeenCalledTimes(2);
  });
});
