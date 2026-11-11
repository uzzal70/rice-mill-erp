import { BadRequestException } from '@nestjs/common';
import { DocumentStatus, GateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    factory: { findMany: jest.fn() },
    gateEntry: { groupBy: jest.fn(), count: jest.fn() },
    purchaseOrder: { groupBy: jest.fn(), findMany: jest.fn() },
    goodsReceipt: { groupBy: jest.fn(), findMany: jest.fn() },
    stockMovement: { groupBy: jest.fn(), findMany: jest.fn() },
    salesOrder: { findMany: jest.fn() },
    journal: { findMany: jest.fn() },
    journalLine: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    item: { findMany: jest.fn() },
    account: { findMany: jest.fn() },
    vehicle: { count: jest.fn() },
    vehicleTrip: { count: jest.fn() },
    approvalRequest: { count: jest.fn() },
    productionBatch: { findMany: jest.fn(), count: jest.fn() },
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

  it('aggregates complete owner dashboard metrics accurately across today, stock, finance, and operations', async () => {
    (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
      { orderedQuantity: new Prisma.Decimal(1000), unitRate: new Prisma.Decimal(40) },
    ]);
    (prisma.goodsReceipt.findMany as jest.Mock).mockResolvedValue([
      { purchaseOrder: { orderedQuantity: new Prisma.Decimal(950) } },
    ]);
    (prisma.productionBatch.findMany as jest.Mock).mockResolvedValue([
      {
        inputQuantityKg: new Prisma.Decimal(5000),
        outputs: [{ item: { kind: 'RICE' }, quantityKg: new Prisma.Decimal(3200) }],
      },
    ]);
    (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([
      { totalAmount: new Prisma.Decimal(120000), lines: [{ quantityKg: new Prisma.Decimal(2000) }] },
    ]);
    (prisma.journalLine.findMany as jest.Mock).mockResolvedValue([
      { credit: new Prisma.Decimal(50000) },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      { totalAmount: new Prisma.Decimal(15000) },
    ]);
    (prisma.stockMovement.groupBy as jest.Mock).mockResolvedValue([
      { itemId: 'item-paddy', _sum: { quantity: new Prisma.Decimal(10000) } },
      { itemId: 'item-rice', _sum: { quantity: new Prisma.Decimal(4000) } },
    ]);
    (prisma.item.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-paddy', kind: 'PADDY', name: 'Miniket Paddy' },
      { id: 'item-rice', kind: 'RICE', name: 'Miniket Rice' },
    ]);
    (prisma.account.findMany as jest.Mock).mockResolvedValue([
      { code: '1010', name: 'Cash in Hand', journalLines: [{ debit: 25000, credit: 5000 }] },
      { code: '1020', name: 'Bank Account', journalLines: [{ debit: 100000, credit: 20000 }] },
      { code: '1050', name: 'Accounts Receivable', journalLines: [{ debit: 45000, credit: 0 }] },
      { code: '2010', name: 'Accounts Payable', journalLines: [{ debit: 10000, credit: 35000 }] },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(5);
    (prisma.vehicleTrip.count as jest.Mock).mockResolvedValue(2);
    (prisma.gateEntry.count as jest.Mock).mockResolvedValue(3);
    (prisma.approvalRequest.count as jest.Mock).mockResolvedValue(4);
    (prisma.productionBatch.count as jest.Mock).mockResolvedValue(1);

    const res = await service.getOwnerDashboard({ companyId: 'company-1' });

    expect(res.today.paddyPurchaseKg).toBe(1000);
    expect(res.today.paddyPurchaseAmount).toBe(40000);
    expect(res.today.paddyReceivedKg).toBe(950);
    expect(res.today.productionKg).toBe(5000);
    expect(res.today.riceOutputKg).toBe(3200);
    expect(res.today.salesKg).toBe(2000);
    expect(res.today.salesAmount).toBe(120000);
    expect(res.today.collectionAmount).toBe(50000);
    expect(res.today.expensesAmount).toBe(15000);
    expect(res.stock.paddyKg).toBe(10000);
    expect(res.stock.riceKg).toBe(4000);
    expect(res.finance.cashBalance).toBe(20000);
    expect(res.finance.bankBalance).toBe(80000);
    expect(res.finance.customerDue).toBe(45000);
    expect(res.finance.supplierDue).toBe(25000);
    expect(res.operations.totalVehicles).toBe(5);
    expect(res.operations.activeTrips).toBe(2);
    expect(res.operations.pendingQuality).toBe(3);
    expect(res.operations.pendingApprovals).toBe(4);
    expect(res.operations.runningBatches).toBe(1);
  });

  it('calculates management analytics trends and strategic KPIs accurately', async () => {
    const today = new Date();
    (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
      {
        supplierId: 'sup-1',
        supplier: { name: 'Rahim Traders' },
        orderedQuantity: new Prisma.Decimal(2000),
        unitRate: new Prisma.Decimal(40),
        createdAt: today,
      },
    ]);
    (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([
      {
        customerId: 'cust-1',
        customer: { name: 'Kareem Rice Agency' },
        totalAmount: new Prisma.Decimal(130000),
        createdAt: today,
        lines: [{ quantityKg: new Prisma.Decimal(2000) }],
      },
    ]);
    (prisma.productionBatch.findMany as jest.Mock).mockResolvedValue([
      {
        inputQuantityKg: new Prisma.Decimal(10000),
        createdAt: today,
        outputs: [{ item: { kind: 'RICE' }, quantityKg: new Prisma.Decimal(6500) }],
      },
    ]);
    (prisma.expense.findMany as jest.Mock).mockResolvedValue([
      { totalAmount: new Prisma.Decimal(10000), expenseDate: today },
    ]);
    (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue([
      { itemId: 'item-1', quantity: new Prisma.Decimal(5000), occurredAt: today },
    ]);
    (prisma.account.findMany as jest.Mock).mockResolvedValue([
      { code: '1010', name: 'Cash', journalLines: [{ debit: 50000, credit: 0 }] },
      { code: '1020', name: 'Bank', journalLines: [{ debit: 150000, credit: 0 }] },
      { code: '1050', name: 'AR', journalLines: [{ debit: 80000, credit: 0 }] },
      { code: '2010', name: 'AP', journalLines: [{ debit: 0, credit: 40000 }] },
    ]);

    const res = await service.getManagementAnalytics({ companyId: 'company-1', days: '7' });

    expect(res.kpis.averagePaddyRate).toBe(40);
    expect(res.kpis.averageSalesRate).toBe(65);
    expect(res.kpis.averageRecovery).toBe(65);
    expect(res.kpis.costPerKg).toBe(13.85); // (80000 + 10000) / 6500 = 13.846
    expect(res.kpis.profitPerKg).toBe(51.15); // 65 - 13.85
    expect(res.kpis.grossMargin).toBe(15);
    expect(res.kpis.stockTurnover).toBe(5.2);
    expect(res.kpis.workingCapital).toBe(465000); // 50000 + 150000 + 80000 + (5000 * 45) - 40000 = 465000

    expect(res.charts.paddyPurchaseTrend.length).toBe(7);
    expect(res.charts.paddyPriceTrend.length).toBe(7);
    expect(res.charts.ricePriceTrend.length).toBe(7);
    expect(res.charts.productionTrend.length).toBe(7);
    expect(res.charts.recoveryTrend.length).toBe(7);
    expect(res.charts.salesTrend.length).toBe(7);
    expect(res.charts.profitTrend.length).toBe(7);
    expect(res.charts.expenseTrend.length).toBe(7);
    expect(res.charts.stockAging.length).toBe(4);
    expect(res.charts.supplierPerformance[0].supplierName).toBe('Rahim Traders');
    expect(res.charts.customerProfitability[0].customerName).toBe('Kareem Rice Agency');
  });
});
