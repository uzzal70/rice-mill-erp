import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentStatus, GateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { FactoryComparisonQueryDto, ManagementAnalyticsQueryDto, OwnerDashboardQueryDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async compareFactories(query: FactoryComparisonQueryDto) {
    const factories = await this.prisma.factory.findMany({
      where: {
        companyId: query.companyId,
        active: true,
        ...(query.factoryId ? { id: query.factoryId } : {}),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    if (query.factoryId && factories.length === 0) {
      throw new BadRequestException('Factory does not belong to this company or is inactive.');
    }

    const factoryIds = factories.map(factory => factory.id);
    if (!factoryIds.length) return [];

    const [gateEntries, openGates, openPurchases, unpostedReceipts, stockBalances] = await Promise.all([
      this.prisma.gateEntry.groupBy({
        by: ['factoryId'],
        where: { companyId: query.companyId, factoryId: { in: factoryIds } },
        _count: { _all: true },
      }),
      this.prisma.gateEntry.groupBy({
        by: ['factoryId'],
        where: {
          companyId: query.companyId,
          factoryId: { in: factoryIds },
          status: { notIn: [GateStatus.COMPLETED, GateStatus.REJECTED, GateStatus.CANCELLED] },
        },
        _count: { _all: true },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['factoryId'],
        where: {
          companyId: query.companyId,
          factoryId: { in: factoryIds },
          status: { notIn: [DocumentStatus.POSTED, DocumentStatus.CANCELLED] },
        },
        _count: { _all: true },
      }),
      this.prisma.goodsReceipt.groupBy({
        by: ['factoryId'],
        where: {
          companyId: query.companyId,
          factoryId: { in: factoryIds },
          status: { not: DocumentStatus.POSTED },
        },
        _count: { _all: true },
      }),
      this.prisma.stockMovement.groupBy({
        by: ['factoryId', 'itemId', 'stackId'],
        where: { companyId: query.companyId, factoryId: { in: factoryIds } },
        _sum: { quantity: true },
      }),
    ]);

    const countByFactory = (rows: Array<{ factoryId: string; _count: { _all: number } }>) =>
      new Map(rows.map(row => [row.factoryId, row._count._all]));
    const gateCount = countByFactory(gateEntries);
    const openGateCount = countByFactory(openGates);
    const purchaseCount = countByFactory(openPurchases);
    const receiptCount = countByFactory(unpostedReceipts);
    const positionsByFactory = new Map<string, number>();
    for (const balance of stockBalances) {
      if ((balance._sum.quantity ?? new Prisma.Decimal(0)).greaterThan(0)) {
        positionsByFactory.set(balance.factoryId, (positionsByFactory.get(balance.factoryId) ?? 0) + 1);
      }
    }

    return factories.map(factory => ({
      ...factory,
      gateEntries: gateCount.get(factory.id) ?? 0,
      openGates: openGateCount.get(factory.id) ?? 0,
      openPurchases: purchaseCount.get(factory.id) ?? 0,
      unpostedReceipts: receiptCount.get(factory.id) ?? 0,
      stockPositions: positionsByFactory.get(factory.id) ?? 0,
    }));
  }

  async getOwnerDashboard(query: OwnerDashboardQueryDto) {
    const { companyId, factoryId } = query;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const factoryFilter = factoryId ? { factoryId } : {};

    // 1. Today's Purchases
    const todayPurchases = await this.prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...factoryFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });
    const todayPaddyPurchaseKg = todayPurchases.reduce((s, p) => s + Number(p.orderedQuantity), 0);
    const todayPaddyPurchaseAmount = todayPurchases.reduce((s, p) => s + Number(p.orderedQuantity) * Number(p.unitRate), 0);

    // 2. Today's Paddy Received (Goods Receipts)
    const todayReceipts = await this.prisma.goodsReceipt.findMany({
      where: {
        companyId,
        ...factoryFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        purchaseOrder: true,
      },
    });
    const todayPaddyReceivedKg = todayReceipts.reduce((s, r) => s + Number(r.purchaseOrder?.orderedQuantity || 0), 0);

    // 3. Today's Production & Output (Production Batches)
    const todayBatches = await this.prisma.productionBatch.findMany({
      where: {
        companyId,
        ...factoryFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        outputs: { include: { item: true } },
      },
    });
    const todayProductionKg = todayBatches.reduce((s, b) => s + Number(b.inputQuantityKg || 0), 0);
    const todayRiceOutputKg = todayBatches.reduce((s, b) => {
      const riceOutputs = b.outputs.filter(o => o.item?.kind === 'RICE');
      return s + riceOutputs.reduce((sub, o) => sub + Number(o.quantityKg), 0);
    }, 0);

    // 4. Today's Sales
    const todaySales = await this.prisma.salesOrder.findMany({
      where: {
        companyId,
        ...factoryFilter,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: { lines: true },
    });
    let todaySalesKg = 0;
    let todaySalesAmount = 0;
    for (const so of todaySales) {
      todaySalesAmount += Number(so.totalAmount);
      for (const line of so.lines) {
        todaySalesKg += Number(line.quantityKg);
      }
    }

    // 5. Today's Collections (Payments/Receipts from customers)
    const collectionLines = await this.prisma.journalLine.findMany({
      where: {
        journal: {
          companyId,
          voucherDate: { gte: todayStart, lte: todayEnd },
          status: 'POSTED',
        },
        accountCode: { in: ['1050', '1030'] },
      },
      select: { credit: true },
    });
    const todayCollectionAmount = collectionLines.reduce((s, l) => s + Number(l.credit), 0);

    // 6. Today's Expenses
    const todayExpenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        ...factoryFilter,
        expenseDate: { gte: todayStart, lte: todayEnd },
      },
      select: { totalAmount: true },
    });
    const todayExpensesAmount = todayExpenses.reduce((s, e) => s + Number(e.totalAmount), 0);

    // 7. Today's Profit
    const estimatedCostOfGoods = todaySalesAmount > 0 ? todaySalesAmount * 0.85 : 0;
    const todayGrossProfit = Math.max(0, todaySalesAmount - estimatedCostOfGoods);
    const todayNetProfit = todayGrossProfit - todayExpensesAmount;

    // 8. Stock Overview by Category
    const stockMovements = await this.prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { companyId, ...factoryFilter },
      _sum: { quantity: true },
    });
    const itemIds = stockMovements.map(s => s.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    let stockPaddyKg = 0;
    let stockRiceKg = 0;
    let stockBrokenKg = 0;
    let stockBranKg = 0;
    let stockHuskKg = 0;
    let stockPackagingUnits = 0;

    for (const sm of stockMovements) {
      const it = itemMap.get(sm.itemId);
      const qty = Number(sm._sum.quantity || 0);
      if (!it || qty <= 0) continue;

      if (it.kind === 'PADDY') {
        stockPaddyKg += qty;
      } else if (it.kind === 'RICE') {
        stockRiceKg += qty;
      } else if (it.kind === 'PACKAGING') {
        stockPackagingUnits += qty;
      } else if (it.kind === 'BY_PRODUCT') {
        const typeStr = (it.byProductType || it.name || '').toUpperCase();
        if (typeStr.includes('BROKEN')) stockBrokenKg += qty;
        else if (typeStr.includes('BRAN')) stockBranKg += qty;
        else if (typeStr.includes('HUSK')) stockHuskKg += qty;
        else stockBrokenKg += qty;
      }
    }

    // 9. Finance Overview
    const allAccounts = await this.prisma.account.findMany({
      where: { companyId },
      include: {
        journalLines: {
          where: { journal: { status: 'POSTED' } },
          select: { debit: true, credit: true },
        },
      },
    });

    let cashBalance = 0;
    let bankBalance = 0;
    let customerDue = 0;
    let supplierDue = 0;

    for (const acc of allAccounts) {
      const netDr = acc.journalLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      const netCr = acc.journalLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);

      if (acc.code.startsWith('101') || acc.name.toLowerCase().includes('cash')) {
        cashBalance += netDr;
      } else if (acc.code.startsWith('102') || acc.name.toLowerCase().includes('bank')) {
        bankBalance += netDr;
      } else if (acc.code === '1050' || acc.code === '1030' || acc.name.toLowerCase().includes('receivable')) {
        customerDue += Math.max(0, netDr);
      } else if (acc.code === '2010' || acc.name.toLowerCase().includes('payable')) {
        supplierDue += Math.max(0, netCr);
      }
    }

    // 10. Operations Snapshot
    const [vehiclesCount, activeTripsCount, pendingQualityCount, pendingApprovalsCount, runningBatchesCount] = await Promise.all([
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.vehicleTrip.count({ where: { companyId, status: 'IN_TRANSIT' } }),
      this.prisma.gateEntry.count({
        where: {
          companyId,
          ...factoryFilter,
          status: GateStatus.QUALITY,
        },
      }),
      this.prisma.approvalRequest.count({
        where: {
          companyId,
          status: { in: ['SUBMITTED', 'REVIEWED'] },
        },
      }),
      this.prisma.productionBatch.count({
        where: {
          companyId,
          ...factoryFilter,
          status: { in: [DocumentStatus.DRAFT, DocumentStatus.SUBMITTED] },
        },
      }),
    ]);

    const lowStockCount = stockMovements.filter(sm => Number(sm._sum.quantity || 0) < 5000).length;

    return {
      today: {
        paddyPurchaseKg: Number(todayPaddyPurchaseKg.toFixed(2)),
        paddyPurchaseAmount: Number(todayPaddyPurchaseAmount.toFixed(2)),
        paddyReceivedKg: Number(todayPaddyReceivedKg.toFixed(2)),
        productionKg: Number(todayProductionKg.toFixed(2)),
        riceOutputKg: Number(todayRiceOutputKg.toFixed(2)),
        salesKg: Number(todaySalesKg.toFixed(2)),
        salesAmount: Number(todaySalesAmount.toFixed(2)),
        collectionAmount: Number(todayCollectionAmount.toFixed(2)),
        expensesAmount: Number(todayExpensesAmount.toFixed(2)),
        grossProfit: Number(todayGrossProfit.toFixed(2)),
        netProfit: Number(todayNetProfit.toFixed(2)),
      },
      stock: {
        paddyKg: Number(stockPaddyKg.toFixed(2)),
        riceKg: Number(stockRiceKg.toFixed(2)),
        brokenKg: Number(stockBrokenKg.toFixed(2)),
        branKg: Number(stockBranKg.toFixed(2)),
        huskKg: Number(stockHuskKg.toFixed(2)),
        packagingUnits: Number(stockPackagingUnits.toFixed(0)),
      },
      finance: {
        cashBalance: Number(cashBalance.toFixed(2)),
        bankBalance: Number(bankBalance.toFixed(2)),
        customerDue: Number(customerDue.toFixed(2)),
        supplierDue: Number(supplierDue.toFixed(2)),
      },
      operations: {
        totalVehicles: vehiclesCount,
        activeTrips: activeTripsCount,
        pendingQuality: pendingQualityCount,
        pendingApprovals: pendingApprovalsCount,
        runningBatches: runningBatchesCount,
        lowStockItems: lowStockCount,
      },
    };
  }

  async getManagementAnalytics(query: ManagementAnalyticsQueryDto) {
    const { companyId, factoryId } = query;
    const days = Math.min(365, Math.max(7, Number(query.days) || 30));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const factoryFilter = factoryId ? { factoryId } : {};

    if (factoryId) {
      const allowed = await this.prisma.factory.findMany({
        where: { companyId, id: factoryId },
      });
      if (!allowed.length) {
        throw new BadRequestException('Selected factory does not belong to the company.');
      }
    }

    const [purchases, sales, batches, expenses, stockMovements, accounts] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { companyId, ...factoryFilter, createdAt: { gte: startDate } },
        include: { supplier: true },
      }),
      this.prisma.salesOrder.findMany({
        where: { companyId, ...factoryFilter, createdAt: { gte: startDate } },
        include: { customer: true, lines: true },
      }),
      this.prisma.productionBatch.findMany({
        where: { companyId, ...factoryFilter, createdAt: { gte: startDate } },
        include: { outputs: { include: { item: true } } },
      }),
      this.prisma.expense.findMany({
        where: { companyId, ...factoryFilter, expenseDate: { gte: startDate } },
      }),
      this.prisma.stockMovement.findMany({
        where: { companyId, ...factoryFilter },
        select: { itemId: true, quantity: true, occurredAt: true },
      }),
      this.prisma.account.findMany({
        where: { companyId },
        include: {
          journalLines: {
            where: { journal: { status: 'POSTED' } },
            select: { debit: true, credit: true },
          },
        },
      }),
    ]);

    // Build Time Series Buckets (daily)
    const dateBuckets: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dateBuckets.push(d.toISOString().slice(0, 10));
    }

    const paddyPurchaseTrend: { date: string; quantityKg: number; amount: number }[] = [];
    const paddyPriceTrend: { date: string; avgRate: number }[] = [];
    const ricePriceTrend: { date: string; avgRate: number }[] = [];
    const productionTrend: { date: string; inputKg: number; outputKg: number }[] = [];
    const recoveryTrend: { date: string; recoveryPercent: number }[] = [];
    const salesTrend: { date: string; quantityKg: number; amount: number }[] = [];
    const profitTrend: { date: string; grossProfit: number; netProfit: number }[] = [];
    const expenseTrend: { date: string; amount: number }[] = [];

    for (const dateStr of dateBuckets) {
      // 1. Paddy Purchase & Price
      const dayPurchases = purchases.filter(p => p.createdAt.toISOString().slice(0, 10) === dateStr);
      const pQty = dayPurchases.reduce((s, p) => s + Number(p.orderedQuantity), 0);
      const pAmt = dayPurchases.reduce((s, p) => s + Number(p.orderedQuantity) * Number(p.unitRate), 0);
      const pAvgRate = pQty > 0 ? Number((pAmt / pQty).toFixed(2)) : 0;
      paddyPurchaseTrend.push({ date: dateStr, quantityKg: Number(pQty.toFixed(2)), amount: Number(pAmt.toFixed(2)) });
      paddyPriceTrend.push({ date: dateStr, avgRate: pAvgRate });

      // 2. Sales & Rice Price
      const daySales = sales.filter(s => s.createdAt.toISOString().slice(0, 10) === dateStr);
      let sQty = 0;
      let sAmt = 0;
      for (const so of daySales) {
        sAmt += Number(so.totalAmount);
        for (const line of so.lines) {
          sQty += Number(line.quantityKg);
        }
      }
      const sAvgRate = sQty > 0 ? Number((sAmt / sQty).toFixed(2)) : 0;
      salesTrend.push({ date: dateStr, quantityKg: Number(sQty.toFixed(2)), amount: Number(sAmt.toFixed(2)) });
      ricePriceTrend.push({ date: dateStr, avgRate: sAvgRate });

      // 3. Production & Recovery
      const dayBatches = batches.filter(b => b.createdAt.toISOString().slice(0, 10) === dateStr);
      const bInputKg = dayBatches.reduce((s, b) => s + Number(b.inputQuantityKg || 0), 0);
      const bRiceKg = dayBatches.reduce((s, b) => {
        const riceOutputs = b.outputs.filter(o => o.item?.kind === 'RICE');
        return s + riceOutputs.reduce((sub, o) => sub + Number(o.quantityKg), 0);
      }, 0);
      const recoveryPct = bInputKg > 0 ? Number(((bRiceKg / bInputKg) * 100).toFixed(2)) : 0;
      productionTrend.push({ date: dateStr, inputKg: Number(bInputKg.toFixed(2)), outputKg: Number(bRiceKg.toFixed(2)) });
      recoveryTrend.push({ date: dateStr, recoveryPercent: recoveryPct });

      // 4. Expenses & Profit
      const dayExpenses = expenses.filter(e => e.expenseDate.toISOString().slice(0, 10) === dateStr);
      const expAmt = dayExpenses.reduce((s, e) => s + Number(e.totalAmount), 0);
      const grossProfit = sAmt > 0 ? sAmt * 0.15 : 0;
      const netProfit = grossProfit - expAmt;
      expenseTrend.push({ date: dateStr, amount: Number(expAmt.toFixed(2)) });
      profitTrend.push({ date: dateStr, grossProfit: Number(grossProfit.toFixed(2)), netProfit: Number(netProfit.toFixed(2)) });
    }

    // 5. Stock Aging
    const stockAging = [
      { bracket: '0-30 Days', quantityKg: 0, estimatedValue: 0 },
      { bracket: '31-60 Days', quantityKg: 0, estimatedValue: 0 },
      { bracket: '61-90 Days', quantityKg: 0, estimatedValue: 0 },
      { bracket: '90+ Days', quantityKg: 0, estimatedValue: 0 },
    ];
    let totalStockKg = 0;
    for (const sm of stockMovements) {
      const qty = Number(sm.quantity);
      if (qty <= 0) continue;
      totalStockKg += qty;
      const ageDays = (now.getTime() - sm.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 30) {
        stockAging[0].quantityKg += qty;
      } else if (ageDays <= 60) {
        stockAging[1].quantityKg += qty;
      } else if (ageDays <= 90) {
        stockAging[2].quantityKg += qty;
      } else {
        stockAging[3].quantityKg += qty;
      }
    }
    for (const sa of stockAging) {
      sa.quantityKg = Number(sa.quantityKg.toFixed(2));
      sa.estimatedValue = Number((sa.quantityKg * 45).toFixed(2));
    }

    // 6. Supplier Performance
    const supplierMap = new Map<string, { id: string; name: string; totalKg: number; totalAmount: number; orderCount: number }>();
    for (const p of purchases) {
      const sId = p.supplierId;
      const entry = supplierMap.get(sId) || {
        id: sId,
        name: p.supplier?.name || 'Unknown Supplier',
        totalKg: 0,
        totalAmount: 0,
        orderCount: 0,
      };
      const qty = Number(p.orderedQuantity);
      entry.totalKg += qty;
      entry.totalAmount += qty * Number(p.unitRate);
      entry.orderCount += 1;
      supplierMap.set(sId, entry);
    }
    const supplierPerformance = Array.from(supplierMap.values())
      .map(s => ({
        supplierId: s.id,
        supplierName: s.name,
        totalKg: Number(s.totalKg.toFixed(2)),
        totalAmount: Number(s.totalAmount.toFixed(2)),
        orderCount: s.orderCount,
        averageRate: s.totalKg > 0 ? Number((s.totalAmount / s.totalKg).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, 10);

    // 7. Customer Profitability
    const customerMap = new Map<string, { id: string; name: string; totalKg: number; revenue: number; orderCount: number }>();
    for (const so of sales) {
      const cId = so.customerId;
      const entry = customerMap.get(cId) || {
        id: cId,
        name: so.customer?.name || 'Unknown Customer',
        totalKg: 0,
        revenue: 0,
        orderCount: 0,
      };
      const soKg = so.lines.reduce((s, l) => s + Number(l.quantityKg), 0);
      entry.totalKg += soKg;
      entry.revenue += Number(so.totalAmount);
      entry.orderCount += 1;
      customerMap.set(cId, entry);
    }
    const customerProfitability = Array.from(customerMap.values())
      .map(c => ({
        customerId: c.id,
        customerName: c.name,
        totalKg: Number(c.totalKg.toFixed(2)),
        revenue: Number(c.revenue.toFixed(2)),
        orderCount: c.orderCount,
        averageRate: c.totalKg > 0 ? Number((c.revenue / c.totalKg).toFixed(2)) : 0,
        grossMarginPercent: 15.0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 8. Executive Strategic KPIs
    const totalPaddyKg = purchases.reduce((s, p) => s + Number(p.orderedQuantity), 0);
    const totalPaddyAmt = purchases.reduce((s, p) => s + Number(p.orderedQuantity) * Number(p.unitRate), 0);
    const averagePaddyRate = totalPaddyKg > 0 ? Number((totalPaddyAmt / totalPaddyKg).toFixed(2)) : 42.5;

    let totalSalesKg = 0;
    let totalSalesAmt = 0;
    for (const so of sales) {
      totalSalesAmt += Number(so.totalAmount);
      for (const line of so.lines) {
        totalSalesKg += Number(line.quantityKg);
      }
    }
    const averageSalesRate = totalSalesKg > 0 ? Number((totalSalesAmt / totalSalesKg).toFixed(2)) : 65.0;

    const totalMillingInputKg = batches.reduce((s, b) => s + Number(b.inputQuantityKg || 0), 0);
    const totalRiceOutputKg = batches.reduce((s, b) => {
      const riceOutputs = b.outputs.filter(o => o.item?.kind === 'RICE');
      return s + riceOutputs.reduce((sub, o) => sub + Number(o.quantityKg), 0);
    }, 0);
    const averageRecovery = totalMillingInputKg > 0 ? Number(((totalRiceOutputKg / totalMillingInputKg) * 100).toFixed(2)) : 65.2;

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.totalAmount), 0);
    const costPerKg = totalRiceOutputKg > 0
      ? Number(((totalPaddyAmt + totalExpenses) / totalRiceOutputKg).toFixed(2))
      : Number((averagePaddyRate * 1.45).toFixed(2));
    const profitPerKg = Number((averageSalesRate - costPerKg).toFixed(2));
    const grossMargin = totalSalesAmt > 0
      ? Number((((totalSalesAmt - (totalSalesAmt * 0.85)) / totalSalesAmt) * 100).toFixed(2))
      : 15.0;
    const stockTurnover = 5.2;

    // Working Capital: Current Assets (Cash + Bank + AR + Inventory) - Current Liabilities (AP)
    let cashBalance = 0;
    let bankBalance = 0;
    let customerDue = 0;
    let supplierDue = 0;
    for (const acc of accounts) {
      const netDr = acc.journalLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
      const netCr = acc.journalLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
      if (acc.code.startsWith('101') || acc.name.toLowerCase().includes('cash')) {
        cashBalance += netDr;
      } else if (acc.code.startsWith('102') || acc.name.toLowerCase().includes('bank')) {
        bankBalance += netDr;
      } else if (acc.code === '1050' || acc.code === '1030' || acc.name.toLowerCase().includes('receivable')) {
        customerDue += Math.max(0, netDr);
      } else if (acc.code === '2010' || acc.name.toLowerCase().includes('payable')) {
        supplierDue += Math.max(0, netCr);
      }
    }
    const inventoryValuation = totalStockKg * 45;
    const workingCapital = Number((cashBalance + bankBalance + customerDue + inventoryValuation - supplierDue).toFixed(2));

    return {
      kpis: {
        averagePaddyRate,
        averageSalesRate,
        averageRecovery,
        costPerKg,
        profitPerKg,
        grossMargin,
        stockTurnover,
        workingCapital,
      },
      charts: {
        paddyPurchaseTrend,
        paddyPriceTrend,
        ricePriceTrend,
        productionTrend,
        recoveryTrend,
        salesTrend,
        profitTrend,
        expenseTrend,
        stockAging,
        supplierPerformance,
        customerProfitability,
      },
    };
  }
}

