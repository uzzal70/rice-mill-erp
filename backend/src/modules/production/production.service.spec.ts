import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ProductionService } from './production.service';

describe('ProductionService', () => {
  const tx: any = {
    factory: { findFirst: jest.fn() },
    item: { findFirst: jest.fn(), findMany: jest.fn() },
    productionBatch: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    productionLine: { findFirst: jest.fn() },
    productionOutput: { createMany: jest.fn() },
    stockMovement: { aggregate: jest.fn(), groupBy: jest.fn(), createMany: jest.fn() },
    stack: { findFirst: jest.fn(), findMany: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new ProductionService(prisma as PrismaService);
  const batch = {
    id: 'batch-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    status: DocumentStatus.APPROVED,
    inputItemId: 'paddy-1',
    inputStackId: 'input-stack',
    inputQuantityKg: new Prisma.Decimal('4000'),
    completedAt: new Date('2026-01-01T10:00:00Z'),
    inputItem: { active: true, kind: ItemKind.PADDY },
    inputStack: { godown: { active: true } },
    totalRiceRecoveryPct: new Prisma.Decimal('65'),
    standardRecoveryPct: new Prisma.Decimal('70'),
    outputs: [
      { id: 'output-1', itemId: 'rice-1', stackId: 'output-stack', quantityKg: new Prisma.Decimal('2600'), item: { active: true }, stack: { godown: { active: true } } },
      { id: 'output-2', itemId: 'broken-1', stackId: 'output-stack', quantityKg: new Prisma.Decimal('300'), item: { active: true }, stack: { godown: { active: true } } },
      { id: 'output-3', itemId: 'bran-1', stackId: 'output-stack', quantityKg: new Prisma.Decimal('1000'), item: { active: true }, stack: { godown: { active: true } } },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.factory.findFirst.mockResolvedValue({ id: 'factory-1' });
    tx.productionBatch.create.mockResolvedValue({ id: 'batch-new' });
    tx.productionBatch.findFirst.mockResolvedValue(batch);
    tx.productionBatch.updateMany.mockResolvedValue({ count: 1 });
    tx.productionBatch.findUniqueOrThrow.mockResolvedValue({ ...batch, status: DocumentStatus.POSTED });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('5000') } });
    tx.stockMovement.groupBy.mockResolvedValue([
      { stackId: 'input-stack', _sum: { quantity: new Prisma.Decimal('5000') } },
      { stackId: 'output-stack', _sum: { quantity: new Prisma.Decimal('0') } },
    ]);
    tx.stack.findMany.mockResolvedValue([
      { id: 'input-stack', capacityKg: new Prisma.Decimal('10000') },
      { id: 'output-stack', capacityKg: new Prisma.Decimal('10000') },
    ]);
    tx.stockMovement.createMany.mockResolvedValue({ count: 4 });
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates a batch with an active production line when provided', async () => {
    tx.item.findFirst.mockResolvedValue({ id: 'paddy-1', kind: ItemKind.PADDY, baseUnit: 'KG', standardRecovery: new Prisma.Decimal('70') });
    tx.item.findMany.mockResolvedValue([
      { id: 'rice-1', kind: ItemKind.RICE, baseUnit: 'KG', riceType: 'HEAD' },
      { id: 'bran-1', kind: ItemKind.BY_PRODUCT, baseUnit: 'KG', riceType: null },
    ]);
    tx.stack.findFirst.mockResolvedValue({ id: 'input-stack', godown: { active: true } });
    tx.stack.findMany.mockResolvedValue([
      { id: 'input-stack', godown: { active: true } },
      { id: 'output-stack', godown: { active: true } },
    ]);
    tx.productionLine.findFirst.mockResolvedValue({ id: 'line-1' });
    tx.productionBatch.create.mockResolvedValue({ id: 'batch-new' });
    tx.productionBatch.findUniqueOrThrow.mockResolvedValue({
      id: 'batch-new',
      companyId: 'company-1',
      factoryId: 'factory-1',
      productionLine: { id: 'line-1', name: 'Line 1', code: 'L1' },
      totalRiceRecoveryPct: new Prisma.Decimal('65'),
      standardRecoveryPct: new Prisma.Decimal('70'),
      inputItem: { active: true, kind: ItemKind.PADDY },
      inputStack: { godown: { active: true } },
      outputs: [{
        item: { active: true },
        stack: { godown: { active: true } },
      }],
    });

    const result = await service.create({
      companyId: 'company-1',
      factoryId: 'factory-1',
      productionLineId: 'line-1',
      batchNumber: 'B-100',
      inputItemId: 'paddy-1',
      inputStackId: 'input-stack',
      inputQuantityKg: '4000',
      startedAt: '2026-01-01T08:00:00.000Z',
      completedAt: '2026-01-01T10:00:00.000Z',
      outputs: [
        { itemId: 'rice-1', stackId: 'output-stack', quantityKg: '2600' },
        { itemId: 'bran-1', stackId: 'output-stack', quantityKg: '1000' },
      ],
    }, 'user-1');

    expect(tx.productionLine.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'line-1', factoryId: 'factory-1' }),
    }));
    expect(tx.productionBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ productionLineId: 'line-1' }),
    }));
    expect(result.productionLine).not.toBeNull();
    expect(result.productionLine?.id).toBe('line-1');
  });

  it('posts input and output stock movements atomically and reports below-standard recovery', async () => {
    const result = await service.post('batch-1', 'company-1', 'factory-1', 'user-1');
    const movements = tx.stockMovement.createMany.mock.calls[0][0].data;

    expect(movements).toHaveLength(4);
    expect(movements[0]).toMatchObject({
      type: StockMovementType.PRODUCTION_IN,
      sourceType: 'PRODUCTION_INPUT',
      quantity: new Prisma.Decimal('-4000'),
    });
    expect(movements.slice(1).every((movement: { type: StockMovementType; quantity: Prisma.Decimal }) =>
      movement.type === StockMovementType.PRODUCTION_OUT && movement.quantity.gt(0))).toBe(true);
    expect(result.belowStandardRecovery).toBe(true);
    expect(tx.productionBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: DocumentStatus.APPROVED }),
      data: expect.objectContaining({ status: DocumentStatus.POSTED, postedById: 'user-1' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects posting when paddy stock is insufficient', async () => {
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('3999.999') } });

    await expect(service.post('batch-1', 'company-1', 'factory-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
    expect(tx.productionBatch.updateMany).not.toHaveBeenCalled();
  });

  it('rejects posting when an output stack would exceed capacity', async () => {
    tx.stack.findMany.mockResolvedValue([
      { id: 'input-stack', capacityKg: new Prisma.Decimal('10000') },
      { id: 'output-stack', capacityKg: new Prisma.Decimal('3899.999') },
    ]);

    await expect(service.post('batch-1', 'company-1', 'factory-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
    expect(tx.productionBatch.updateMany).not.toHaveBeenCalled();
  });
});
