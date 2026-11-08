import { SetMetadata, createParamDecorator, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { Request } from 'express';

export const PUBLIC_ROUTE = 'public-route';
export const REQUIRED_PERMISSION = 'required-permission';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequirePermission = (resource: string, action: PermissionAction, platformOnly = false) =>
  SetMetadata(REQUIRED_PERMISSION, { resource, action, platformOnly });
export const RequireAllPermissions = (...permissions: Array<{ resource: string; action: PermissionAction }>) =>
  SetMetadata(REQUIRED_PERMISSION, permissions);

export type AuthenticatedRequest = Request & {
  user?: { id: string; sessionId: string; companyIds: string[]; memberships: Array<{ companyId: string; factoryId: string | null }> };
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthorizedException();
  return user;
});

export function assertCompanyAccess(user: NonNullable<AuthenticatedRequest['user']>, companyId: string) {
  if (!user.companyIds.includes(companyId)) throw new ForbiddenException('You do not have access to this company.');
}
