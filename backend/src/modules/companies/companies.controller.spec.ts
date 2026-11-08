import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CompaniesController, CreateCompanyDto, UpdateCompanyDto } from './companies.controller';

describe('CompaniesController', () => {
  const tx = {
    company: { create: jest.fn(), update: jest.fn() },
    permission: { findMany: jest.fn() },
    role: { create: jest.fn() },
    membership: { create: jest.fn() },
    userRole: { create: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = {
    company: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const controller = new CompaniesController(prisma as unknown as PrismaService);
  const request = { user: { id: 'admin-1', companyIds: ['company-1'] } } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates the company profile, owner membership and audit record in one transaction', async () => {
    const company = { id: 'company-new', code: 'ABC', currency: 'BDT', fiscalYearStart: 7 };
    tx.company.create.mockResolvedValue(company);
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-read', resource: 'companies', action: 'READ' },
      { id: 'permission-create', resource: 'companies', action: 'CREATE' },
    ]);
    tx.role.create.mockResolvedValue({ id: 'owner-role' });
    tx.membership.create.mockResolvedValue({ id: 'membership-new' });

    await expect(controller.create(request, {
      name: 'ABC Rice Mill',
      code: ' abc ',
      tin: 'TIN-123',
      fiscalYearStart: 7,
    })).resolves.toEqual(company);

    expect(tx.company.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'ABC Rice Mill', code: 'ABC', currency: 'BDT', fiscalYearStart: 7 }),
    });
    expect(tx.role.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        permissions: { create: [{ permissionId: 'permission-read' }] },
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId: 'company-new', action: 'CREATE', resource: 'companies' }),
    }));
  });

  it('fails and rolls back company setup when the permission catalog is not initialized', async () => {
    tx.company.create.mockResolvedValue({ id: 'company-new' });
    tx.permission.findMany.mockResolvedValue([]);

    await expect(controller.create(request, { name: 'ABC Mill', code: 'ABC' }))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(tx.role.create).not.toHaveBeenCalled();
    expect(tx.membership.create).not.toHaveBeenCalled();
  });

  it('updates company fields and audits before and after values transactionally', async () => {
    const before = { id: 'company-1', name: 'Old Name', code: 'OLD', currency: 'BDT' };
    const updated = { ...before, name: 'New Name', tin: 'TIN-NEW' };
    prisma.company.findUnique.mockResolvedValue(before);
    tx.company.update.mockResolvedValue(updated);

    await expect(controller.update(request, 'company-1', {
      name: ' New Name ',
      tin: 'TIN-NEW',
    })).resolves.toEqual(updated);

    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: { name: 'New Name', tin: 'TIN-NEW' },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'UPDATE', before, after: updated }),
    }));
  });

  it('rejects empty updates and missing company records', async () => {
    await expect(controller.update(request, 'company-1', {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(controller.update(request, 'missing', { name: 'New Name' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps duplicate company-code conflicts to a human-readable conflict', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1', name: 'Mill', code: 'MILL' });
    const uniqueError = new Prisma.PrismaClientKnownRequestError('unique constraint', {
      code: 'P2002',
      clientVersion: '5.22.0',
    });
    prisma.$transaction.mockRejectedValue(uniqueError);

    await expect(controller.update(request, 'company-1', { code: 'TAKEN' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('validates fiscal start month, currency format and company URL fields', async () => {
    const dto = Object.assign(new CreateCompanyDto(), {
      name: 'ABC Mill',
      code: 'ABC',
      fiscalYearStart: 13,
      currency: 'BDT-BDT',
      website: 'not a URL',
    });

    const errors = await validate(dto);

    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['fiscalYearStart', 'currency', 'website']));
  });

  it('validates updates and permits clearing optional profile fields', async () => {
    const dto = Object.assign(new UpdateCompanyDto(), { logoUrl: null, tin: null, fiscalYearStart: 1 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
