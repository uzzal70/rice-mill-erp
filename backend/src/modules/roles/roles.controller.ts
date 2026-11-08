import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { IsArray, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';

export class CreateRoleDto {
  @IsString() companyId!: string;
  @IsString() @Length(2, 80) name!: string;
  @IsString() @Length(2, 48) code!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissionIds?: string[];
}
export class UpdateRoleDto {
  @IsString() companyId!: string;
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissionIds?: string[];
}
export class AssignRoleDto { @IsString() membershipId!: string; @IsString() companyId!: string; }
export class RoleAssignmentQueryDto { @IsString() companyId!: string; }

function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  private async grantedPermissionIds(userId: string, companyId: string) {
    const grants = await this.prisma.userRole.findMany({
      where: {
        membership: { userId, companyId, active: true, factoryId: null },
        role: { OR: [{ companyId }, { companyId: null, systemRole: true }] },
      },
      select: { role: { select: { permissions: { select: { permissionId: true } } } } },
    });
    return new Set(grants.flatMap(grant => grant.role.permissions.map(permission => permission.permissionId)));
  }

  @Get('permissions') @RequirePermission('roles', PermissionAction.READ) listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  @Get() @RequirePermission('roles', PermissionAction.READ) list(@Req() req: AuthenticatedRequest, @Query('companyId') companyId?: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ companyId: companyId ?? { in: req.user!.companyIds } }, { companyId: null, systemRole: true }] },
      include: { permissions: { include: { permission: true } } },
      orderBy: [{ systemRole: 'desc' }, { name: 'asc' }],
    });
  }

  @Post() @RequirePermission('roles', PermissionAction.CREATE) async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoleDto) {
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Company not found.');
    const permissionIds = [...new Set(dto.permissionIds ?? [])];
    const allowedIds = await this.grantedPermissionIds(req.user!.id, dto.companyId);
    if (permissionIds.some(id => !allowedIds.has(id))) throw new ForbiddenException('A role cannot grant permissions you do not hold.');
    if (permissionIds.length) {
      const count = await this.prisma.permission.count({ where: { id: { in: permissionIds } } });
      if (count !== permissionIds.length) throw new NotFoundException('One or more permissions were not found.');
    }
    return this.prisma.$transaction(async tx => {
      const role = await tx.role.create({
        data: {
          companyId: dto.companyId, name: dto.name.trim(), code: dto.code.trim().toUpperCase(),
          description: dto.description?.trim(),
          permissions: { create: permissionIds.map(permissionId => ({ permissionId })) },
        },
        include: { permissions: { include: { permission: true } } },
      });
      await tx.auditEvent.create({
        data: {
          companyId: dto.companyId,
          userId: req.user!.id,
          resource: 'roles',
          action: 'CREATE',
          resourceId: role.id,
          after: jsonSnapshot(role),
        },
      });
      return role;
    });
  }

  @Patch(':roleId') @RequirePermission('roles', PermissionAction.UPDATE) async update(
    @Req() req: AuthenticatedRequest,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    if (dto.name === undefined && dto.description === undefined && dto.permissionIds === undefined) {
      throw new BadRequestException('Provide at least one role field to update.');
    }
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, companyId: dto.companyId, systemRole: false },
      include: { permissions: { select: { permissionId: true } } },
    });
    if (!role) throw new NotFoundException('Company role not found.');

    const permissionIds = dto.permissionIds === undefined ? undefined : [...new Set(dto.permissionIds)];
    if (permissionIds) {
      const allowedIds = await this.grantedPermissionIds(req.user!.id, dto.companyId);
      if (permissionIds.some(id => !allowedIds.has(id))) {
        throw new ForbiddenException('A role cannot grant permissions you do not hold.');
      }
      if (permissionIds.length) {
        const count = await this.prisma.permission.count({ where: { id: { in: permissionIds } } });
        if (count !== permissionIds.length) throw new NotFoundException('One or more permissions were not found.');
      }
    }

    return this.prisma.$transaction(async tx => {
      const updated = await tx.role.update({
        where: { id: role.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(permissionIds !== undefined ? {
            permissions: {
              deleteMany: {},
              ...(permissionIds.length ? { create: permissionIds.map(permissionId => ({ permissionId })) } : {}),
            },
          } : {}),
        },
        include: { permissions: { include: { permission: true } } },
      });
      await tx.auditEvent.create({
        data: {
          companyId: dto.companyId,
          userId: req.user!.id,
          resource: 'roles',
          action: 'UPDATE',
          resourceId: role.id,
          before: jsonSnapshot(role),
          after: jsonSnapshot(updated),
        },
      });
      return updated;
    });
  }

  @Post(':roleId/assignments') @RequirePermission('roles', PermissionAction.UPDATE) async assign(@Req() req: AuthenticatedRequest, @Param('roleId') roleId: string, @Body() dto: AssignRoleDto) {
    const [role, membership] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId }, select: { id: true, companyId: true } }),
      this.prisma.membership.findUnique({ where: { id: dto.membershipId }, select: { id: true, companyId: true, active: true } }),
    ]);
    if (!role || !membership || !membership.active || membership.companyId !== dto.companyId || role.companyId !== membership.companyId) {
      throw new NotFoundException('Role or company membership not found.');
    }
    const roleGrants = await this.prisma.rolePermission.findMany({ where: { roleId: role.id }, select: { permissionId: true } });
    const allowedIds = await this.grantedPermissionIds(req.user!.id, dto.companyId);
    if (roleGrants.some(grant => !allowedIds.has(grant.permissionId))) throw new ForbiddenException('You cannot assign a role with permissions you do not hold.');
    return this.prisma.$transaction(async tx => {
      const assignment = await tx.userRole.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
        create: { membershipId: membership.id, roleId: role.id }, update: {},
      });
      await tx.auditEvent.create({
        data: {
          companyId: dto.companyId,
          userId: req.user!.id,
          resource: 'role-assignments',
          action: 'ASSIGN',
          resourceId: `${membership.id}:${role.id}`,
          after: jsonSnapshot(assignment),
        },
      });
      return assignment;
    });
  }

  @Delete(':roleId/assignments/:membershipId') @RequirePermission('roles', PermissionAction.UPDATE) async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('roleId') roleId: string,
    @Param('membershipId') membershipId: string,
    @Query() query: RoleAssignmentQueryDto,
  ) {
    const [role, membership, assignment] = await Promise.all([
      this.prisma.role.findFirst({ where: { id: roleId, companyId: query.companyId, systemRole: false }, select: { id: true } }),
      this.prisma.membership.findFirst({ where: { id: membershipId, companyId: query.companyId }, select: { id: true } }),
      this.prisma.userRole.findUnique({
        where: { membershipId_roleId: { membershipId, roleId } },
        include: { membership: { select: { companyId: true } }, role: { select: { companyId: true, systemRole: true } } },
      }),
    ]);
    if (!role || !membership || !assignment || assignment.membership.companyId !== query.companyId || assignment.role.companyId !== query.companyId || assignment.role.systemRole) {
      throw new NotFoundException('Company role assignment not found.');
    }

    return this.prisma.$transaction(async tx => {
      await tx.userRole.delete({ where: { membershipId_roleId: { membershipId, roleId } } });
      await tx.auditEvent.create({
        data: {
          companyId: query.companyId,
          userId: req.user!.id,
          resource: 'role-assignments',
          action: 'REVOKE',
          resourceId: `${membershipId}:${roleId}`,
          before: jsonSnapshot(assignment),
        },
      });
      return { revoked: true };
    });
  }
}
