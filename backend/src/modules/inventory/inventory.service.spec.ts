import { BadRequestException } from '@nestjs/common';
import { ItemKind, Prisma, UnitOfMeasure } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../common/prisma.service';
import { InventoryService } from './inventory.service';
import { ListByProductActivityDto } from './inventory.dto';

describe('InventoryService', () => {
  const tx: any = {
    item: { findFirst: jest.fn() },
    godown: { findFirst: jest.fn() },
    stack: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    stockMovement: { aggregate: jest.fn(), createMany: jest.fn(), create: jest.fn(), groupBy: jest.fn() },
    stockTransfer: { create: jest.fn() },
    stockAdjustment: { create: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new InventoryService(prisma as PrismaService);
  const activeStack = {
    id: 'stack-a',
    godownId: 'godown-a',
    capacityKg: new Prisma.Decimal('500'),
    godown: { active: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.auditEvent.create.mockResolvedValue({});
    tx.stockMovement.groupBy.mockResolvedValue([]);
  });

  it('rejects transfers that would create negative stock before recording movements', async () => {
    tx.item.findFirst.mockResolvedValue({ id: 'paddy-1', kind: ItemKind.PADDY, baseUnit: UnitOfMeasure.KG });
    tx.stack.findFirst.mockResolvedValueOnce(activeStack).mockResolvedValueOnce({ ...activeStack, id: 'stack-b', godownId: 'godown-b' });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('10') } });

    await expect(service.createTransfer({
      companyId: 'company-1',
      factoryId: 'factory-1',
      transferNumber: 'TR-1',
      itemId: 'paddy-1',
      sourceStackId: 'stack-a',
      destinationStackId: 'stack-b',
      quantity: '11',
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockTransfer.create).not.toHaveBeenCalled();
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
  });

  it('rejects adjustments that would exceed stack capacity', async () => {
    tx.item.findFirst.mockResolvedValue({ id: 'paddy-1', kind: ItemKind.PADDY, baseUnit: UnitOfMeasure.KG });
    tx.stack.findFirst.mockResolvedValue(activeStack);
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('495') } });
    tx.stockMovement.groupBy.mockResolvedValue([{ unit: UnitOfMeasure.KG, _sum: { quantity: new Prisma.Decimal('495') } }]);

    await expect(service.createAdjustment({
      companyId: 'company-1',
      factoryId: 'factory-1',
      adjustmentNumber: 'ADJ-1',
      itemId: 'paddy-1',
      stackId: 'stack-a',
      quantity: '6',
      reason: 'Physical count correction',
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockAdjustment.create).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('creates a stack with validated rice-mill lot metadata and audit trail', async () => {
    tx.item.findFirst.mockResolvedValue({ id: 'paddy-1' });
    tx.godown.findFirst.mockResolvedValue({ id: 'godown-a' });
    const receivedAt = new Date(Date.now() - 86_400_000);
    const stack = { id: 'stack-new', code: 'A-01', materialItemId: 'paddy-1', capacityKg: new Prisma.Decimal(500) };
    tx.stack.create.mockResolvedValue(stack);

    await expect(service.createStack({
      companyId: 'company-1',
      factoryId: 'factory-1',
      godownId: 'godown-a',
      code: ' a-01 ',
      capacityKg: '500',
      materialItemId: 'paddy-1',
      varietyName: 'BRRI Dhan 29',
      cropYear: 2025,
      batchNumber: 'BATCH-4',
      lotNumber: 'LOT-9',
      receivedAt: receivedAt.toISOString(),
    }, 'user-1')).resolves.toEqual(stack);

    expect(tx.stack.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'A-01',
        capacityKg: new Prisma.Decimal(500),
        materialItemId: 'paddy-1',
        varietyName: 'BRRI Dhan 29',
        cropYear: 2025,
        batchNumber: 'BATCH-4',
        lotNumber: 'LOT-9',
        receivedAt,
      }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resource: 'stacks', action: 'CREATE', resourceId: 'stack-new' }),
    }));
  });

  it('does not reduce stack capacity below current stock', async () => {
    tx.stack.findFirst.mockResolvedValue({ ...activeStack, godown: { active: true } });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('250') } });
    tx.stockMovement.groupBy.mockResolvedValue([{ unit: UnitOfMeasure.KG, _sum: { quantity: new Prisma.Decimal('250') } }]);

    await expect(service.updateStack('stack-a', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      capacityKg: '200',
    }, 'user-1')).rejects.toThrow('Stack capacity cannot be less than current occupancy (250.000 KG).');
    expect(tx.stack.update).not.toHaveBeenCalled();
  });

  it('returns occupied and available capacity with age bands for stack balances', async () => {
    const receivedAt = new Date();
    receivedAt.setUTCDate(receivedAt.getUTCDate() - 31);
    prisma.factory = { findFirst: jest.fn().mockResolvedValue({ id: 'factory-1' }) };
    prisma.stack = {
      findMany: jest.fn().mockResolvedValue([{
        ...activeStack,
        capacityKg: new Prisma.Decimal('100'),
        receivedAt,
        materialItem: null,
        godown: { id: 'godown-a', name: 'Godown A' },
      }]),
    };
    tx.stockMovement.groupBy.mockResolvedValue([{ unit: UnitOfMeasure.KG, _sum: { quantity: new Prisma.Decimal('80') } }]);

    const stacks = await service.listStacks({ companyId: 'company-1', factoryId: 'factory-1' });
    expect(stacks[0]).toEqual(expect.objectContaining({
      onHand: new Prisma.Decimal('80'),
      availableCapacityKg: new Prisma.Decimal('20'),
      occupancyPercent: 80,
      ageDays: 31,
      agingBand: '31_60',
    }));
  });

  it('reports by-product stock, production and net sales from scoped ledger movements', async () => {
    prisma.factory = { findFirst: jest.fn().mockResolvedValue({ id: 'factory-1' }) };
    prisma.item = { findMany: jest.fn().mockResolvedValue([{ id: 'bran-1' }]), count: jest.fn().mockResolvedValue(1) };
    prisma.stockMovement = {
      groupBy: jest.fn().mockResolvedValue([
        { itemId: 'bran-1', type: 'RECEIPT', sourceType: 'PURCHASE', _sum: { quantity: new Prisma.Decimal(50) } },
        { itemId: 'bran-1', type: 'PRODUCTION_OUT', sourceType: 'PRODUCTION_OUTPUT', _sum: { quantity: new Prisma.Decimal(100) } },
        { itemId: 'bran-1', type: 'ISSUE', sourceType: 'SALES_DISPATCH', _sum: { quantity: new Prisma.Decimal(-20) } },
        { itemId: 'bran-1', type: 'RECEIPT', sourceType: 'SALES_RETURN', _sum: { quantity: new Prisma.Decimal(5) } },
      ]),
    };
    prisma.$transaction.mockResolvedValueOnce([[{ id: 'bran-1' }], 1]);

    const result = await service.listByProductActivity({
      companyId: 'company-1',
      factoryId: 'factory-1',
      page: 1,
      pageSize: 25,
    });

    expect(result.data[0]).toEqual(expect.objectContaining({
      itemId: 'bran-1',
      stockKg: new Prisma.Decimal(135),
      productionKg: new Prisma.Decimal(100),
      salesKg: new Prisma.Decimal(15),
    }));
  });

    it('returns company-scoped packaging stock from factory ledger movements', async () => {
      prisma.factory = { findFirst: jest.fn().mockResolvedValue({ id: 'factory-1' }) };
      prisma.item = { findMany: jest.fn().mockResolvedValue([{ id: 'bag-1', code: 'BAG-25', name: '25 KG Bag', baseUnit: UnitOfMeasure.PIECE }]), count: jest.fn().mockResolvedValue(1) };
      prisma.stockMovement = {
        groupBy: jest.fn().mockResolvedValue([{ itemId: 'bag-1', _sum: { quantity: new Prisma.Decimal(42) } }]),
      };
      prisma.$transaction.mockResolvedValueOnce([[{ id: 'bag-1' }], 1]);

      const result = await service.listPackagingStock({
        companyId: 'company-1',
        factoryId: 'factory-1',
        active: true,
        search: 'woven',
        page: 1,
        pageSize: 25,
      });

      expect(result.data[0]).toEqual(expect.objectContaining({ id: 'bag-1', stock: new Prisma.Decimal(42) }));
      expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-1', kind: ItemKind.PACKAGING, active: true }),
      }));
      expect(prisma.stockMovement.groupBy).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'company-1', factoryId: 'factory-1', itemId: { in: ['bag-1'] } },
      }));
    });

    it('rejects packaging stock requests for factories outside the company', async () => {
      prisma.factory = { findFirst: jest.fn().mockResolvedValue(null) };
      await expect(service.listPackagingStock({
        companyId: 'company-1',
        factoryId: 'other-factory',
        page: 1,
        pageSize: 25,
      })).rejects.toBeInstanceOf(BadRequestException);
    });

  it('rejects by-product activity requests for another company factory and parses filters', async () => {
    prisma.factory = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(service.listByProductActivity({
      companyId: 'company-1',
      factoryId: 'other-factory',
      page: 1,
      pageSize: 25,
    })).rejects.toBeInstanceOf(BadRequestException);

    const dto = plainToInstance(ListByProductActivityDto, {
      companyId: 'company-1',
      factoryId: 'factory-1',
      active: 'false',
      page: '2',
      pageSize: '50',
    });
    expect(dto.active).toBe(false);
    expect(dto.page).toBe(2);
    expect(await validate(dto)).toHaveLength(0);
  });
});
