import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateDryingBatchDto } from './drying.dto';
import { DryingService } from './drying.service';

describe('DryingService', () => {
  const tx: any = {
    factory: { findFirst: jest.fn() },
    item: { findFirst: jest.fn() },
    stack: { findMany: jest.fn() },
    dryingBatch: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    stockMovement: { aggregate: jest.fn(), groupBy: jest.fn(), createMany: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new DryingService(prisma as PrismaService);
  const batch = {
    id: 'drying-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    itemId: 'paddy-1',
    sourceStackId: 'source-stack',
    destinationStackId: 'destination-stack',
    inputQuantityKg: new Prisma.Decimal('4000'),
    outputQuantityKg: new Prisma.Decimal('3800'),
    lossKg: new Prisma.Decimal('200'),
    completedAt: new Date('2026-01-01T10:00:00Z'),
    status: DocumentStatus.APPROVED,
    item: { active: true, kind: ItemKind.PADDY },
    sourceStack: { godown: { active: true } },
    destinationStack: { godown: { active: true } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.factory.findFirst.mockResolvedValue({ id: 'factory-1' });
    tx.item.findFirst.mockResolvedValue({ id: 'paddy-1', kind: ItemKind.PADDY, baseUnit: 'KG', active: true });
    tx.stack.findMany.mockResolvedValue([
      { id: 'source-stack', capacityKg: new Prisma.Decimal('10000'), godown: { active: true } },
      { id: 'destination-stack', capacityKg: new Prisma.Decimal('10000'), godown: { active: true } },
    ]);
    tx.dryingBatch.create.mockResolvedValue(batch);
    tx.dryingBatch.findFirst.mockResolvedValue(batch);
    tx.dryingBatch.updateMany.mockResolvedValue({ count: 1 });
    tx.dryingBatch.findUniqueOrThrow.mockResolvedValue({ ...batch, status: DocumentStatus.POSTED });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('5000') } });
    tx.stockMovement.groupBy.mockResolvedValue([
      { stackId: 'source-stack', _sum: { quantity: new Prisma.Decimal('5000') } },
      { stackId: 'destination-stack', _sum: { quantity: new Prisma.Decimal('0') } },
    ]);
    tx.stockMovement.createMany.mockResolvedValue({ count: 2 });
    tx.auditEvent.create.mockResolvedValue({});
  });

  const createDto: CreateDryingBatchDto = {
    companyId: 'company-1',
    factoryId: 'factory-1',
    batchNumber: 'DRY-1',
    itemId: 'paddy-1',
    sourceStackId: 'source-stack',
    destinationStackId: 'destination-stack',
    inputQuantityKg: '4000',
    outputQuantityKg: '3800',
    moistureBeforePct: 18,
    moistureAfterPct: 14,
    dryingMethod: 'SUN',
    durationMinutes: 120,
    fuelQuantity: '20',
    electricityKwh: '12',
    labourCost: '500',
    startedAt: '2026-01-01T08:00:00.000Z',
    completedAt: '2026-01-01T10:00:00.000Z',
  };

  it('records drying measurements, actual weight loss and resource usage', async () => {
    await service.create(createDto, 'user-1');

    expect(tx.dryingBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        inputQuantityKg: new Prisma.Decimal('4000'),
        outputQuantityKg: new Prisma.Decimal('3800'),
        lossKg: new Prisma.Decimal('200'),
        moistureBeforePct: new Prisma.Decimal('18'),
        moistureAfterPct: new Prisma.Decimal('14'),
        fuelQuantity: new Prisma.Decimal('20'),
        electricityKwh: new Prisma.Decimal('12'),
        labourCost: new Prisma.Decimal('500'),
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects moisture increasing during drying before accessing the database', async () => {
    await expect(service.create({ ...createDto, moistureAfterPct: 19 }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.dryingBatch.create).not.toHaveBeenCalled();
  });

  it('posts the measured loss and both stock movements atomically', async () => {
    await service.post('drying-1', 'company-1', 'factory-1', 'user-1');
    const movements = tx.stockMovement.createMany.mock.calls[0][0].data;

    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({
      type: StockMovementType.PRODUCTION_IN,
      sourceType: 'DRYING_INPUT',
      quantity: new Prisma.Decimal('-4000'),
    });
    expect(movements[1]).toMatchObject({
      type: StockMovementType.PRODUCTION_OUT,
      sourceType: 'DRYING_OUTPUT',
      quantity: new Prisma.Decimal('3800'),
    });
    expect(tx.dryingBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: DocumentStatus.APPROVED }),
      data: expect.objectContaining({ status: DocumentStatus.POSTED, postedById: 'user-1' }),
    }));
  });

  it('rejects drying when available paddy stock is insufficient', async () => {
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('3999.999') } });

    await expect(service.post('drying-1', 'company-1', 'factory-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
  });

  it('accounts for input removal before checking capacity when both stacks are the same', async () => {
    const sameStack = { ...batch, destinationStackId: 'source-stack' };
    tx.dryingBatch.findFirst.mockResolvedValue(sameStack);
    tx.stockMovement.groupBy.mockResolvedValue([
      { stackId: 'source-stack', _sum: { quantity: new Prisma.Decimal('9000') } },
    ]);
    tx.stack.findMany.mockResolvedValue([
      { id: 'source-stack', capacityKg: new Prisma.Decimal('10000') },
    ]);

    await service.post('drying-1', 'company-1', 'factory-1', 'user-1');
    expect(tx.stockMovement.createMany).toHaveBeenCalled();
  });
});
