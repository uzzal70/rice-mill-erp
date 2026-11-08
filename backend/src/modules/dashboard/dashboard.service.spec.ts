import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, GateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    factory: { findMany: jest.fn() },
    gateEntry: { groupBy: jest.fn() },
    purchaseOrder: { groupBy: jest.fn() },
    goodsReceipt: { groupBy: jest.fn() },
    stockMovement: { groupBy: jest.fn() },
  } as unknown as PrismaService;
  const service = new DashboardService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('compares factory-scoped operational counts without mixing stock positions', async () => {
    (prisma.factory.findMany as jest.Mock).mockResolvedValue([
      { id: 'factory-a', name: 'Factory A', code: 'FA' },
      { id: 'factory-b', name: 'Factory B', code: 'FB' },
    ]);
    (prisma.gateEntry.groupBy as jest.Mock)
      .mockResolvedValueOnce([{ factoryId: 'factory-a', _count: { _all: 4 } }])
      .mockResolvedValueOnce([{ factoryId: 'factory-a', _count: { _all: 2 } }, { factoryId: 'factory-b', _count: { _all: 1 } }]);
    (prisma.purchaseOrder.groupBy as jest.Mock).mockResolvedValue([{ factoryId: 'factory-b', _count: { _all: 3 } }]);
    (prisma.goodsReceipt.groupBy as jest.Mock).mockResolvedValue([{ factoryId: 'factory-a', _count: { _all: 1 } }]);
    (prisma.stockMovement.groupBy as jest.Mock).mockResolvedValue([
      { factoryId: 'factory-a', itemId: 'item-1', stackId: 'stack-1', _sum: { quantity: new Prisma.Decimal(20) } },
      { factoryId: 'factory-a', itemId: 'item-1', stackId: 'stack-2', _sum: { quantity: new Prisma.Decimal(-20) } },
      { factoryId: 'factory-b', itemId: 'item-2', stackId: 'stack-3', _sum: { quantity: new Prisma.Decimal(10) } },
    ]);

    const result = await service.compareFactories({ companyId: 'company-1' });

    expect(result).toEqual([
      { id: 'factory-a', name: 'Factory A', code: 'FA', gateEntries: 4, openGates: 2, openPurchases: 0, unpostedReceipts: 1, stockPositions: 1 },
      { id: 'factory-b', name: 'Factory B', code: 'FB', gateEntries: 0, openGates: 1, openPurchases: 3, unpostedReceipts: 0, stockPositions: 1 },
    ]);
    expect(prisma.gateEntry.groupBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ status: { notIn: [GateStatus.COMPLETED, GateStatus.REJECTED, GateStatus.CANCELLED] } }),
    }));
    expect(prisma.purchaseOrder.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { notIn: [DocumentStatus.POSTED, DocumentStatus.CANCELLED] } }),
    }));
  });

  it('rejects a selected factory outside the company', async () => {
    (prisma.factory.findMany as jest.Mock).mockResolvedValue([]);

    await expect(service.compareFactories({ companyId: 'company-1', factoryId: 'foreign-factory' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
