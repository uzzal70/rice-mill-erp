import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentStatus, GateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { FactoryComparisonQueryDto } from './dashboard.dto';

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
}
