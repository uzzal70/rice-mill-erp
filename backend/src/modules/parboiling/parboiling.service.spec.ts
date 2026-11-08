import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, ItemKind, ParboilingStageType, Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateParboilingBatchDto } from './parboiling.dto';
import { ParboilingService } from './parboiling.service';

describe('ParboilingService', () => {
  const tx: any = {
    factory: { findFirst: jest.fn() },
    item: { findMany: jest.fn() },
    stack: { findMany: jest.fn() },
    parboilingBatch: { create: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
    parboilingStage: { createMany: jest.fn() },
    stockMovement: { aggregate: jest.fn(), groupBy: jest.fn(), createMany: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new ParboilingService(prisma as PrismaService);
  const batch = {
    id: 'parboil-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    inputItemId: 'raw-paddy',
    outputItemId: 'parboiled-paddy',
    inputStackId: 'raw-stack',
    outputStackId: 'processed-stack',
    inputQuantityKg: new Prisma.Decimal('4000'),
    outputQuantityKg: new Prisma.Decimal('3800'),
    processLossKg: new Prisma.Decimal('200'),
    completedAt: new Date('2026-01-01T14:00:00Z'),
    status: DocumentStatus.APPROVED,
    inputItem: { active: true, kind: ItemKind.PADDY },
    outputItem: { active: true, kind: ItemKind.PADDY },
    inputStack: { godown: { active: true } },
    outputStack: { godown: { active: true } },
    stages: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.factory.findFirst.mockResolvedValue({ id: 'factory-1' });
    tx.item.findMany.mockResolvedValue([
      { id: 'raw-paddy', kind: ItemKind.PADDY, baseUnit: 'KG', active: true },
      { id: 'parboiled-paddy', kind: ItemKind.PADDY, baseUnit: 'KG', active: true },
    ]);
    tx.stack.findMany.mockResolvedValue([
      { id: 'raw-stack', capacityKg: new Prisma.Decimal('10000'), godown: { active: true } },
      { id: 'processed-stack', capacityKg: new Prisma.Decimal('10000'), godown: { active: true } },
    ]);
    tx.parboilingBatch.create.mockResolvedValue(batch);
    tx.parboilingBatch.findFirst.mockResolvedValue(batch);
    tx.parboilingBatch.findUniqueOrThrow.mockResolvedValue({ ...batch, status: DocumentStatus.POSTED });
    tx.parboilingBatch.updateMany.mockResolvedValue({ count: 1 });
    tx.parboilingStage.createMany.mockResolvedValue({ count: 3 });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('5000') } });
    tx.stockMovement.groupBy.mockResolvedValue([
      { stackId: 'raw-stack', _sum: { quantity: new Prisma.Decimal('5000') } },
      { stackId: 'processed-stack', _sum: { quantity: new Prisma.Decimal('0') } },
    ]);
    tx.stockMovement.createMany.mockResolvedValue({ count: 2 });
    tx.auditEvent.create.mockResolvedValue({});
  });

  const createDto: CreateParboilingBatchDto = {
    companyId: 'company-1',
    factoryId: 'factory-1',
    batchNumber: 'PAR-1',
    inputItemId: 'raw-paddy',
    outputItemId: 'parboiled-paddy',
    inputStackId: 'raw-stack',
    outputStackId: 'processed-stack',
    inputQuantityKg: '4000',
    outputQuantityKg: '3800',
    startedAt: '2026-01-01T08:00:00.000Z',
    completedAt: '2026-01-01T14:00:00.000Z',
    stages: [
      {
        stageType: ParboilingStageType.SOAKING,
        startedAt: '2026-01-01T08:00:00.000Z',
        completedAt: '2026-01-01T10:00:00.000Z',
        inputQuantityKg: '4000',
        outputQuantityKg: '4300',
        moistureBeforePct: 14,
        moistureAfterPct: 30,
        waterQuantity: '300',
      },
      {
        stageType: ParboilingStageType.STEAMING,
        startedAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T11:00:00.000Z',
        inputQuantityKg: '4300',
        outputQuantityKg: '4200',
        moistureBeforePct: 30,
        moistureAfterPct: 32,
        temperatureC: '100',
        pressureBar: '1',
        fuelQuantity: '20',
        electricityKwh: '12',
        labourCost: '500',
      },
      {
        stageType: ParboilingStageType.DRYING,
        startedAt: '2026-01-01T11:00:00.000Z',
        completedAt: '2026-01-01T14:00:00.000Z',
        inputQuantityKg: '4200',
        outputQuantityKg: '3800',
        moistureBeforePct: 32,
        moistureAfterPct: 14,
        fuelQuantity: '35',
        electricityKwh: '20',
        labourCost: '300',
      },
    ],
  };

  it('creates a fully reconciled soak, steam, and dry batch with measured process resources', async () => {
    await service.create(createDto, 'user-1');

    expect(tx.parboilingBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        inputQuantityKg: new Prisma.Decimal('4000'),
        outputQuantityKg: new Prisma.Decimal('3800'),
        processLossKg: new Prisma.Decimal('200'),
      }),
    }));
    const stages = tx.parboilingStage.createMany.mock.calls[0][0].data;
    expect(stages).toHaveLength(3);
    expect(stages.map((stage: { stageType: ParboilingStageType }) => stage.stageType)).toEqual([
      ParboilingStageType.SOAKING, ParboilingStageType.STEAMING, ParboilingStageType.DRYING,
    ]);
    expect(stages[1]).toMatchObject({
      temperatureC: new Prisma.Decimal('100'),
      pressureBar: new Prisma.Decimal('1'),
      fuelQuantity: new Prisma.Decimal('20'),
      electricityKwh: new Prisma.Decimal('12'),
    });
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects stages submitted outside soaking, steaming, drying order', async () => {
    const invalid = { ...createDto, stages: [createDto.stages[1], createDto.stages[0], createDto.stages[2]] };
    await expect(service.create(invalid, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.parboilingBatch.create).not.toHaveBeenCalled();
  });

  it('rejects stage weights that fail to reconcile', async () => {
    const invalid = { ...createDto, stages: [{ ...createDto.stages[0], outputQuantityKg: '4299' }, ...createDto.stages.slice(1)] };
    await expect(service.create(invalid, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.parboilingBatch.create).not.toHaveBeenCalled();
  });

  it('posts the raw paddy issue and processed paddy receipt atomically', async () => {
    await service.post('parboil-1', 'company-1', 'factory-1', 'user-1');
    const movements = tx.stockMovement.createMany.mock.calls[0][0].data;

    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({
      type: StockMovementType.PRODUCTION_IN,
      sourceType: 'PARBOILING_INPUT',
      quantity: new Prisma.Decimal('-4000'),
    });
    expect(movements[1]).toMatchObject({
      type: StockMovementType.PRODUCTION_OUT,
      sourceType: 'PARBOILING_OUTPUT',
      quantity: new Prisma.Decimal('3800'),
    });
    expect(tx.parboilingBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: DocumentStatus.APPROVED }),
      data: expect.objectContaining({ status: DocumentStatus.POSTED, postedById: 'user-1' }),
    }));
  });

  it('rejects posting if raw paddy stock is insufficient', async () => {
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('3999.999') } });

    await expect(service.post('parboil-1', 'company-1', 'factory-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
  });
});
