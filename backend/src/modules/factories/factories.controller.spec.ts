import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { BusinessMode, ProductionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateFactoryDto, FactoriesController, UpdateFactoryDto } from './factories.controller';

function createDto(overrides: Partial<CreateFactoryDto> = {}): CreateFactoryDto {
  return Object.assign(new CreateFactoryDto(), {
    companyId: 'company-id',
    name: 'Bogura Factory',
    code: 'BOGURA',
    productionType: ProductionType.AUTO,
    ...overrides,
  });
}

describe('CreateFactoryDto', () => {
  it('accepts multiple configured business modes', async () => {
    const errors = await validate(createDto({
      businessModes: [BusinessMode.PADDY_TRADING, BusinessMode.WHOLESALE],
    }));

    expect(errors).toHaveLength(0);
  });

  it('rejects non-array and unknown business modes', async () => {
    const nonArrayErrors = await validate(Object.assign(createDto(), { businessModes: 'PADDY_TRADING' }));
    const unknownModeErrors = await validate(Object.assign(createDto(), { businessModes: ['UNSUPPORTED'] }));

    expect(nonArrayErrors.some(error => error.property === 'businessModes')).toBe(true);
    expect(unknownModeErrors.some(error => error.property === 'businessModes')).toBe(true);
  });

  it('rejects invalid codes, negative or malformed capacity, and missing production type', async () => {
    const errors = await validate(createDto({
      code: 'bad code',
      capacityPerDay: '-1',
      productionType: 'UNKNOWN' as ProductionType,
    }));

    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['code', 'capacityPerDay', 'productionType']));
  });
});

describe('FactoriesController', () => {
  const tx = {
    factory: { create: jest.fn(), update: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = {
    company: { findUnique: jest.fn() },
    factory: { findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const controller = new FactoriesController(prisma as unknown as PrismaService);
  const request = { user: { id: 'manager-1', companyIds: ['company-1'] } } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates a factory with manager, capacity, modes and audit data transactionally', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    const factory = { id: 'factory-1', companyId: 'company-1', code: 'BOGURA', managerName: 'Manager' };
    tx.factory.create.mockResolvedValue(factory);

    await expect(controller.create({
      companyId: 'company-1',
      name: 'Bogura Factory',
      code: ' bogura ',
      productionType: ProductionType.AUTO,
      businessModes: [BusinessMode.PADDY_TRADING],
      managerName: ' Manager ',
      capacityPerDay: '25.500',
    }, request)).resolves.toEqual(factory);

    expect(tx.factory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'BOGURA',
        managerName: 'Manager',
        capacityPerDay: new Prisma.Decimal('25.500'),
      }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resource: 'factories', action: 'CREATE', resourceId: 'factory-1' }),
    }));
  });

  it('creates a factory without a configured daily capacity', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    const factory = { id: 'factory-1', companyId: 'company-1', capacityPerDay: null };
    tx.factory.create.mockResolvedValue(factory);

    await expect(controller.create(createDto({ capacityPerDay: null }), request)).resolves.toEqual(factory);
    expect(tx.factory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ capacityPerDay: null }),
    });
  });

  it('updates capacity/status and logs the factory snapshot', async () => {
    const before = { id: 'factory-1', companyId: 'company-1', name: 'Factory', active: true };
    const updated = { ...before, active: false, capacityPerDay: new Prisma.Decimal('12.500') };
    prisma.factory.findUnique.mockResolvedValue(before);
    tx.factory.update.mockResolvedValue(updated);

    await expect(controller.update(request, 'factory-1', {
      active: false,
      capacityPerDay: '12.500',
    })).resolves.toEqual(updated);

    expect(tx.factory.update).toHaveBeenCalledWith({
      where: { id: 'factory-1' },
      data: { active: false, capacityPerDay: new Prisma.Decimal('12.500') },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        before: expect.objectContaining({ id: 'factory-1', active: true }),
        after: expect.objectContaining({ id: 'factory-1', active: false, capacityPerDay: '12.5' }),
        action: 'UPDATE',
      }),
    }));
  });

  it('rejects empty updates and missing factories', async () => {
    await expect(controller.update(request, 'factory-1', {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.factory.findUnique.mockResolvedValue(null);
    await expect(controller.update(request, 'missing', { name: 'New name' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps duplicate factory codes to a human-readable conflict', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    prisma.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique constraint', {
      code: 'P2002',
      clientVersion: '5.22.0',
    }));
    await expect(controller.create(createDto(), request)).rejects.toBeInstanceOf(ConflictException);
  });
});
