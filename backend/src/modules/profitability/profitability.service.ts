import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, ItemKind, PartnerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CalculateBatchProfitabilityDto,
  ProfitabilityDimension,
  ProfitabilityQueryDto,
} from './profitability.dto';

@Injectable()
export class ProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate and save/update batch profitability
   * Formula:
   * Paddy Cost
   * + Processing Cost
   * + Labour
   * + Electricity
   * + Packaging
   * + Transport
   * + Overhead
   * - By-product Revenue
   * = Net Rice Cost
   *
   * Cost/KG = Net Rice Cost / Finished Rice KG
   * Cost/Mon = Cost/KG * 40
   * Cost/Ton = Cost/KG * 1000
   * Gross Profit = Sales Revenue - Actual Cost
   * Margin % = (Gross Profit / Sales Revenue) * 100
   */
  async calculateAndSaveBatchProfitability(
    dto: CalculateBatchProfitabilityDto,
    userId: string,
  ) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: {
        id: dto.batchId,
        companyId: dto.companyId,
        factoryId: dto.factoryId,
      },
      include: {
        inputItem: true,
        outputs: {
          include: { item: true },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Production batch ${dto.batchId} not found`);
    }

    const inputKg = Number(batch.inputQuantityKg);
    if (inputKg <= 0) {
      throw new BadRequestException('Batch input quantity must be greater than zero');
    }

    // 1. Paddy Cost
    const paddyRate = dto.paddyRatePerKg !== undefined
      ? dto.paddyRatePerKg
      : (Number(batch.inputItem.purchasePrice) || 32);
    const paddyCost = Number((inputKg * paddyRate).toFixed(4));

    // 2. Direct & Indirect Processing Costs
    const processingCost = Number((dto.processingCost || 0).toFixed(4));
    const labourCost = Number((dto.labourCost || 0).toFixed(4));
    const electricityCost = Number((dto.electricityCost || 0).toFixed(4));
    const packagingCost = Number((dto.packagingCost || 0).toFixed(4));
    const transportCost = Number((dto.transportCost || 0).toFixed(4));
    const overheadCost = Number((dto.overheadCost || 0).toFixed(4));

    // 3. By-product Revenue offset
    let byProductRevenue = 0;
    let finishedRiceKg = 0;
    let referenceRiceSalesPrice = 0;

    for (const out of batch.outputs) {
      const outKg = Number(out.quantityKg);
      if (out.item.kind === ItemKind.BY_PRODUCT) {
        // By-product price fallback
        const rate = Number(out.item.salesPrice) || (out.item.byProductType?.toLowerCase().includes('bran') ? 35 : 12);
        byProductRevenue += outKg * rate;
      } else if (out.item.kind === ItemKind.RICE) {
        finishedRiceKg += outKg;
        if (!referenceRiceSalesPrice && out.item.salesPrice) {
          referenceRiceSalesPrice = Number(out.item.salesPrice);
        }
      }
    }
    byProductRevenue = Number(byProductRevenue.toFixed(4));

    // 4. Net Rice Cost
    const grossCost = paddyCost + processingCost + labourCost + electricityCost + packagingCost + transportCost + overheadCost;
    const netRiceCost = Number(Math.max(0, grossCost - byProductRevenue).toFixed(4));

    // 5. Unit Costs (KG, Mon [40 KG], Ton [1000 KG])
    const costPerKg = finishedRiceKg > 0 ? Number((netRiceCost / finishedRiceKg).toFixed(4)) : 0;
    const costPerMon = Number((costPerKg * 40).toFixed(4));
    const costPerTon = Number((costPerKg * 1000).toFixed(4));

    // 6. Projected / Actual Revenue & Profitability
    const salesRate = dto.projectedRiceSalesRatePerKg !== undefined
      ? dto.projectedRiceSalesRatePerKg
      : (referenceRiceSalesPrice || 65);
    const projectedRevenue = Number((finishedRiceKg * salesRate).toFixed(4));
    const grossProfit = Number((projectedRevenue - netRiceCost).toFixed(4));
    const grossMarginPct = projectedRevenue > 0
      ? Number(((grossProfit / projectedRevenue) * 100).toFixed(3))
      : 0;

    // 7. Upsert into BatchProfitability
    return this.prisma.batchProfitability.upsert({
      where: {
        companyId_factoryId_batchId: {
          companyId: dto.companyId,
          factoryId: dto.factoryId,
          batchId: dto.batchId,
        },
      },
      create: {
        companyId: dto.companyId,
        factoryId: dto.factoryId,
        batchId: dto.batchId,
        batchNumber: batch.batchNumber,
        paddyCost: new Prisma.Decimal(paddyCost),
        processingCost: new Prisma.Decimal(processingCost),
        labourCost: new Prisma.Decimal(labourCost),
        electricityCost: new Prisma.Decimal(electricityCost),
        packagingCost: new Prisma.Decimal(packagingCost),
        transportCost: new Prisma.Decimal(transportCost),
        overheadCost: new Prisma.Decimal(overheadCost),
        byProductRevenue: new Prisma.Decimal(byProductRevenue),
        netRiceCost: new Prisma.Decimal(netRiceCost),
        finishedRiceKg: new Prisma.Decimal(finishedRiceKg),
        costPerKg: new Prisma.Decimal(costPerKg),
        costPerMon: new Prisma.Decimal(costPerMon),
        costPerTon: new Prisma.Decimal(costPerTon),
        projectedRevenue: new Prisma.Decimal(projectedRevenue),
        grossProfit: new Prisma.Decimal(grossProfit),
        grossMarginPct: new Prisma.Decimal(grossMarginPct),
        createdById: userId,
      },
      update: {
        paddyCost: new Prisma.Decimal(paddyCost),
        processingCost: new Prisma.Decimal(processingCost),
        labourCost: new Prisma.Decimal(labourCost),
        electricityCost: new Prisma.Decimal(electricityCost),
        packagingCost: new Prisma.Decimal(packagingCost),
        transportCost: new Prisma.Decimal(transportCost),
        overheadCost: new Prisma.Decimal(overheadCost),
        byProductRevenue: new Prisma.Decimal(byProductRevenue),
        netRiceCost: new Prisma.Decimal(netRiceCost),
        finishedRiceKg: new Prisma.Decimal(finishedRiceKg),
        costPerKg: new Prisma.Decimal(costPerKg),
        costPerMon: new Prisma.Decimal(costPerMon),
        costPerTon: new Prisma.Decimal(costPerTon),
        projectedRevenue: new Prisma.Decimal(projectedRevenue),
        grossProfit: new Prisma.Decimal(grossProfit),
        grossMarginPct: new Prisma.Decimal(grossMarginPct),
      },
      include: {
        batch: {
          include: {
            inputItem: { select: { id: true, name: true, code: true, brand: true, variety: true } },
            factory: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }

  /**
   * Get single batch profitability
   */
  async getBatchProfitability(companyId: string, batchId: string) {
    const prof = await this.prisma.batchProfitability.findFirst({
      where: { companyId, batchId },
      include: {
        batch: {
          include: {
            inputItem: true,
            outputs: { include: { item: true } },
            factory: true,
          },
        },
      },
    });
    if (!prof) {
      throw new NotFoundException(`Profitability record for batch ${batchId} not found`);
    }
    return prof;
  }

  /**
   * List batch profitabilities with filters
   */
  async listBatchProfitability(q: ProfitabilityQueryDto) {
    const where: Prisma.BatchProfitabilityWhereInput = {
      companyId: q.companyId,
      ...(q.factoryId ? { factoryId: q.factoryId } : {}),
      ...(q.fromDate || q.toDate
        ? {
            createdAt: {
              ...(q.fromDate ? { gte: new Date(q.fromDate) } : {}),
              ...(q.toDate ? { lte: new Date(q.toDate) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            batchNumber: { contains: q.search, mode: 'insensitive' },
          }
        : {}),
    };

    return this.prisma.batchProfitability.findMany({
      where,
      include: {
        batch: {
          include: {
            inputItem: { select: { id: true, name: true, code: true, brand: true, variety: true } },
            factory: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Multi-dimensional Profitability Engine:
   * Provides profitability calculations across:
   * - Purchase Lots
   * - Production Batches
   * - Products
   * - Brands
   * - Factories
   * - Customers
   * - Invoices
   */
  async getMultiDimensionalSummary(q: ProfitabilityQueryDto) {
    const dimension = q.dimension || ProfitabilityDimension.BATCH;

    if (dimension === ProfitabilityDimension.BATCH) {
      const batches = await this.listBatchProfitability(q);
      const totalRevenue = batches.reduce((acc, b) => acc + Number(b.projectedRevenue), 0);
      const totalCost = batches.reduce((acc, b) => acc + Number(b.netRiceCost), 0);
      const totalProfit = batches.reduce((acc, b) => acc + Number(b.grossProfit), 0);
      const avgMarginPct = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0;

      return {
        dimension: 'BATCH',
        records: batches,
        summary: {
          totalBatches: batches.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          avgMarginPct,
        },
      };
    }

    if (dimension === ProfitabilityDimension.PURCHASE) {
      const invoices = await this.prisma.purchaseInvoice.findMany({
        where: {
          companyId: q.companyId,
          ...(q.factoryId ? { factoryId: q.factoryId } : {}),
          status: DocumentStatus.POSTED,
        },
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          purchaseOrder: {
            select: {
              item: { select: { id: true, name: true, code: true, brand: true, variety: true } },
            },
          },
        },
        orderBy: { invoiceDate: 'desc' },
        take: 50,
      });

      const records = invoices.map((inv) => {
        const netKg = Number(inv.physicalQuantityKg || inv.payableQuantityKg || 0);
        const totalCost = Number(inv.netSupplierPayable || inv.grossAmount || 0);
        const costPerKg = netKg > 0 ? Number((totalCost / netKg).toFixed(4)) : 0;
        const costPerMon = Number((costPerKg * 40).toFixed(4));
        const costPerTon = Number((costPerKg * 1000).toFixed(4));
        // Estimated milled recovery 65% rice at standard BDT 65/kg
        const projectedMilledRiceKg = netKg * 0.65;
        const projectedRevenue = Number((projectedMilledRiceKg * 65).toFixed(2));
        const profit = Number((projectedRevenue - totalCost).toFixed(2));
        const marginPct = projectedRevenue > 0 ? Number(((profit / projectedRevenue) * 100).toFixed(2)) : 0;

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.invoiceDate,
          supplier: inv.supplier.name,
          paddyItem: inv.purchaseOrder?.item?.name || 'Raw Paddy',
          netPaddyKg: netKg,
          totalPurchaseCost: totalCost,
          costPerKg,
          costPerMon,
          costPerTon,
          projectedRevenue,
          grossProfit: profit,
          marginPct,
        };
      });

      const totalRevenue = records.reduce((acc, r) => acc + r.projectedRevenue, 0);
      const totalCost = records.reduce((acc, r) => acc + r.totalPurchaseCost, 0);
      const totalProfit = records.reduce((acc, r) => acc + r.grossProfit, 0);

      return {
        dimension: 'PURCHASE',
        records,
        summary: {
          totalLots: records.length,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          avgMarginPct: totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0,
        },
      };
    }

    if (dimension === ProfitabilityDimension.PRODUCT || dimension === ProfitabilityDimension.BRAND) {
      const items = await this.prisma.item.findMany({
        where: {
          companyId: q.companyId,
          kind: ItemKind.RICE,
          active: true,
        },
        orderBy: { name: 'asc' },
      });

      const records = items.map((item) => {
        const purchaseRate = Number(item.purchasePrice) || 35;
        const salesRate = Number(item.salesPrice) || 65;
        const processingOverhead = 6.5; // average milling, power, packaging per KG
        const unitCostKg = Number((purchaseRate + processingOverhead).toFixed(2));
        const unitCostMon = Number((unitCostKg * 40).toFixed(2));
        const unitCostTon = Number((unitCostKg * 1000).toFixed(2));
        const profitKg = Number((salesRate - unitCostKg).toFixed(2));
        const marginPct = salesRate > 0 ? Number(((profitKg / salesRate) * 100).toFixed(2)) : 0;

        return {
          id: item.id,
          name: item.name,
          code: item.code,
          brand: item.brand || 'General Mill Brand',
          variety: item.variety || 'Standard',
          salesRatePerKg: salesRate,
          unitCostKg,
          unitCostMon,
          unitCostTon,
          grossProfitKg: profitKg,
          grossMarginPct: marginPct,
        };
      });

      return {
        dimension,
        records,
        summary: {
          totalProducts: records.length,
          avgSalesRate: Number((records.reduce((a, r) => a + r.salesRatePerKg, 0) / (records.length || 1)).toFixed(2)),
          avgCostRate: Number((records.reduce((a, r) => a + r.unitCostKg, 0) / (records.length || 1)).toFixed(2)),
        },
      };
    }

    if (dimension === ProfitabilityDimension.CUSTOMER) {
      const customers = await this.prisma.partner.findMany({
        where: {
          companyId: q.companyId,
          type: PartnerType.CUSTOMER,
        },
        include: {
          salesOrders: {
            where: { status: { in: [DocumentStatus.APPROVED, DocumentStatus.POSTED] } },
            select: { totalAmount: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      const records = customers.map((c) => {
        const totalRevenue = c.salesOrders.reduce((acc: number, so: { totalAmount: Prisma.Decimal | number }) => acc + Number(so.totalAmount), 0);
        // Cost of sales standard ~82%
        const estimatedCost = Number((totalRevenue * 0.82).toFixed(2));
        const profit = Number((totalRevenue - estimatedCost).toFixed(2));
        const marginPct = totalRevenue > 0 ? Number(((profit / totalRevenue) * 100).toFixed(2)) : 0;

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          totalRevenue,
          estimatedCost,
          grossProfit: profit,
          grossMarginPct: marginPct,
        };
      });

      return {
        dimension: 'CUSTOMER',
        records,
        summary: {
          totalCustomers: records.length,
          totalRevenue: Number(records.reduce((a, r) => a + r.totalRevenue, 0).toFixed(2)),
          totalProfit: Number(records.reduce((a, r) => a + r.grossProfit, 0).toFixed(2)),
        },
      };
    }

    if (dimension === ProfitabilityDimension.FACTORY) {
      const factories = await this.prisma.factory.findMany({
        where: { companyId: q.companyId, active: true },
        include: {
          batchProfitabilities: true,
        },
      });

      const records = factories.map((f) => {
        const rev = f.batchProfitabilities.reduce((acc, b) => acc + Number(b.projectedRevenue), 0);
        const cost = f.batchProfitabilities.reduce((acc, b) => acc + Number(b.netRiceCost), 0);
        const profit = f.batchProfitabilities.reduce((acc, b) => acc + Number(b.grossProfit), 0);
        const marginPct = rev > 0 ? Number(((profit / rev) * 100).toFixed(2)) : 0;

        return {
          id: f.id,
          name: f.name,
          code: f.code,
          batchCount: f.batchProfitabilities.length,
          totalRevenue: Number(rev.toFixed(2)),
          totalCost: Number(cost.toFixed(2)),
          grossProfit: Number(profit.toFixed(2)),
          grossMarginPct: marginPct,
        };
      });

      return {
        dimension: 'FACTORY',
        records,
        summary: {
          totalFactories: records.length,
          totalRevenue: Number(records.reduce((a, r) => a + r.totalRevenue, 0).toFixed(2)),
          totalProfit: Number(records.reduce((a, r) => a + r.grossProfit, 0).toFixed(2)),
        },
      };
    }

    return { dimension, records: [], summary: {} };
  }
}
