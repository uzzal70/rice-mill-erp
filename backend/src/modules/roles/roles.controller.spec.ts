import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';
import { CreateRoleDto, RolesController, UpdateRoleDto } from './roles.controller';

describe('RolesController', () => {
  const tx = {
    role: { create: jest.fn(), update: jest.fn() },
    userRole: { upsert: jest.fn(), delete: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = {
    company: { findUnique: jest.fn() },
    role: { findFirst: jest.fn(), findUnique: jest.fn() },
    permission: { count: jest.fn() },
    userRole: { findMany: jest.fn(), findUnique: jest.fn() },
    membership: { findUnique: jest.fn(), findFirst: jest.fn() },
    rolePermission: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const controller = new RolesController(prisma as unknown as PrismaService);
  const request = { user: { id: 'admin-1' } } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    prisma.userRole.findMany.mockResolvedValue([
      { role: { permissions: [{ permissionId: 'permission-read' }] } },
    ]);
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates a role only with permissions held by the administrator and audits it', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.permission.count.mockResolvedValue(1);
    const role = { id: 'role-1', companyId: 'company-1', code: 'VIEWER' };
    tx.role.create.mockResolvedValue(role);

    await expect(controller.create(request, {
      companyId: 'company-1',
      name: 'Viewer',
      code: 'viewer',
      permissionIds: ['permission-read'],
    })).resolves.toEqual(role);

    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CREATE', resource: 'roles', resourceId: 'role-1' }),
    }));
  });

  it('rejects role creation that escalates permissions', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });

    await expect(controller.create(request, {
      companyId: 'company-1',
      name: 'Administrator',
      code: 'ADMIN',
      permissionIds: ['permission-admin'],
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates role permissions atomically and audits the before/after state', async () => {
    const before = { id: 'role-1', companyId: 'company-1', systemRole: false, permissions: [] };
    prisma.role.findFirst.mockResolvedValue(before);
    prisma.permission.count.mockResolvedValue(1);
    const updated = { ...before, name: 'Store Reader', permissions: [{ permissionId: 'permission-read' }] };
    tx.role.update.mockResolvedValue(updated);

    await expect(controller.update(request, 'role-1', {
      companyId: 'company-1',
      name: 'Store Reader',
      permissionIds: ['permission-read', 'permission-read'],
    } as UpdateRoleDto)).resolves.toEqual(updated);

    expect(tx.role.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'role-1' },
      data: expect.objectContaining({
        name: 'Store Reader',
        permissions: { deleteMany: {}, create: [{ permissionId: 'permission-read' }] },
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'UPDATE', before: expect.any(Object), after: expect.any(Object) }),
    }));
  });

  it('prevents assigning unheld permissions while editing an existing role', async () => {
    prisma.role.findFirst.mockResolvedValue({
      id: 'role-1', companyId: 'company-1', systemRole: false, permissions: [],
    });

    await expect(controller.update(request, 'role-1', {
      companyId: 'company-1',
      permissionIds: ['permission-admin'],
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects empty updates and protects system roles from company edits', async () => {
    await expect(controller.update(request, 'role-1', { companyId: 'company-1' }))
      .rejects.toBeInstanceOf(BadRequestException);

    prisma.role.findFirst.mockResolvedValue(null);
    await expect(controller.update(request, 'system-role', {
      companyId: 'company-1',
      name: 'Changed',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes an assignment and records the change in the audit log', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'role-1' });
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership-1' });
    prisma.userRole.findUnique.mockResolvedValue({
      membership: { companyId: 'company-1' },
      role: { companyId: 'company-1', systemRole: false },
    });
    tx.userRole.delete.mockResolvedValue({});

    await expect(controller.revoke(request, 'role-1', 'membership-1', { companyId: 'company-1' }))
      .resolves.toEqual({ revoked: true });

    expect(tx.userRole.delete).toHaveBeenCalledWith({
      where: { membershipId_roleId: { membershipId: 'membership-1', roleId: 'role-1' } },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'REVOKE', resource: 'role-assignments' }),
    }));
  });

  it('rejects attempts to revoke an assignment from another company', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'role-1' });
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership-1' });
    prisma.userRole.findUnique.mockResolvedValue({
      membership: { companyId: 'company-2' },
      role: { companyId: 'company-1', systemRole: false },
    });

    await expect(controller.revoke(request, 'role-1', 'membership-1', { companyId: 'company-1' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('validates role grant payloads as permission ID arrays', async () => {
    const dto = Object.assign(new CreateRoleDto(), {
      companyId: 'company-1',
      name: 'Viewer',
      code: 'VIEWER',
      permissionIds: 'permission-read',
    });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'permissionIds')).toBe(true);
  });
});
