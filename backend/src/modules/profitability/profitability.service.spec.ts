import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ProfitabilityDimension } from './profitability.dto';
import { ProfitabilityService } from './profitability.service';

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      productionBatch: {
        findFirst: jest.fn(),
      },
      batchProfitability: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      purchaseInvoice: {
        findMany: jest.fn(),
      },
      item: {
        findMany: jest.fn(),
      },
      partner: {
        findMany: jest.fn(),
      },
      factory: {
        findMany: jest.fn(),
      },
    };

    service = new ProfitabilityService(prisma as PrismaService);
  });

  describe('calculateAndSaveBatchProfitability', () => {
    it('accurately calculates Net Rice Cost, Unit Rates (KG, Mon, Ton), and Gross Margin %', async () => {
      // 10,000 KG Paddy at 32/KG = 320,000
      // Direct Costs: Processing 5000, Labour 12000, Electricity 8000, Packaging 4000, Transport 3000, Overhead 2000 = 34,000
      // Outputs: 6,500 KG Rice, 2,000 KG Husk at 5/KG (10,000), 1,000 KG Bran at 35/KG (35,000). Total ByProduct Revenue = 45,000
      // Net Rice Cost = 320000 + 34000 - 45000 = 309,000
      // Cost/KG = 309000 / 6500 = 47.5385
      // Cost/Mon = 47.5385 * 40 = 1901.54
      // Cost/Ton = 47.5385 * 1000 = 47538.5
      // Projected Revenue = 6500 * 65 = 422,500
      // Gross Profit = 422500 - 309000 = 113,500
      // Margin % = (113500 / 422500) * 100 = 26.864%

      prisma.productionBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        companyId: 'comp-1',
        factoryId: 'fact-1',
        batchNumber: 'BATCH-2026-001',
        inputQuantityKg: new Prisma.Decimal(10000),
        inputItem: { purchasePrice: new Prisma.Decimal(32) },
        outputs: [
          {
            quantityKg: new Prisma.Decimal(6500),
            item: { kind: ItemKind.RICE, salesPrice: new Prisma.Decimal(65) },
          },
          {
            quantityKg: new Prisma.Decimal(2000),
            item: { kind: ItemKind.BY_PRODUCT, salesPrice: new Prisma.Decimal(5), byProductType: 'HUSK' },
          },
          {
            quantityKg: new Prisma.Decimal(1000),
            item: { kind: ItemKind.BY_PRODUCT, salesPrice: new Prisma.Decimal(35), byProductType: 'BRAN' },
          },
        ],
      });

      prisma.batchProfitability.upsert.mockImplementation((args: any) => Promise.resolve(args.create));

      const result = await service.calculateAndSaveBatchProfitability(
        {
          companyId: 'comp-1',
          factoryId: 'fact-1',
          batchId: 'batch-1',
          processingCost: 5000,
          labourCost: 12000,
          electricityCost: 8000,
          packagingCost: 4000,
          transportCost: 3000,
          overheadCost: 2000,
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(Number(result.paddyCost)).toBe(320000);
      expect(Number(result.byProductRevenue)).toBe(45000);
      expect(Number(result.netRiceCost)).toBe(309000);
      expect(Number(result.finishedRiceKg)).toBe(6500);
      expect(Number(result.costPerKg)).toBeCloseTo(47.5385, 2);
      expect(Number(result.costPerMon)).toBeCloseTo(1901.54, 1);
      expect(Number(result.costPerTon)).toBeCloseTo(47538.5, 0);
      expect(Number(result.projectedRevenue)).toBe(422500);
      expect(Number(result.grossProfit)).toBe(113500);
      expect(Number(result.grossMarginPct)).toBeCloseTo(26.864, 1);
    });

    it('throws NotFoundException if production batch does not exist', async () => {
      prisma.productionBatch.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateAndSaveBatchProfitability(
          { companyId: 'comp-1', factoryId: 'fact-1', batchId: 'non-existent' },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMultiDimensionalSummary', () => {
    it('aggregates batch dimension profitability', async () => {
      prisma.batchProfitability.findMany.mockResolvedValue([
        {
          id: 'bp-1',
          batchNumber: 'B-1',
          projectedRevenue: new Prisma.Decimal(500000),
          netRiceCost: new Prisma.Decimal(380000),
          grossProfit: new Prisma.Decimal(120000),
        },
        {
          id: 'bp-2',
          batchNumber: 'B-2',
          projectedRevenue: new Prisma.Decimal(300000),
          netRiceCost: new Prisma.Decimal(240000),
          grossProfit: new Prisma.Decimal(60000),
        },
      ]);

      const res = await service.getMultiDimensionalSummary({
        companyId: 'comp-1',
        dimension: ProfitabilityDimension.BATCH,
      });

      expect(res.dimension).toBe('BATCH');
      expect(res.summary.totalBatches).toBe(2);
      expect(res.summary.totalRevenue).toBe(800000);
      expect(res.summary.totalCost).toBe(620000);
      expect(res.summary.totalProfit).toBe(180000);
      expect(res.summary.avgMarginPct).toBe(22.5); // (180000 / 800000) * 100
    });

    it('aggregates purchase lot dimension profitability', async () => {
      prisma.purchaseInvoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'PINV-001',
          invoiceDate: new Date(),
          supplier: { name: 'M/S Bismillah Traders' },
          purchaseOrder: { item: { name: 'BR-28 Paddy' } },
          physicalQuantityKg: new Prisma.Decimal(20000),
          netSupplierPayable: new Prisma.Decimal(640000), // 32 / KG
        },
      ]);

      const res = await service.getMultiDimensionalSummary({
        companyId: 'comp-1',
        dimension: ProfitabilityDimension.PURCHASE,
      });

      expect(res.dimension).toBe('PURCHASE');
      expect(res.records).toHaveLength(1);
      const record = res.records[0] as any;
      expect(record.costPerKg).toBe(32);
      expect(record.costPerMon).toBe(1280); // 32 * 40
      expect(record.costPerTon).toBe(32000); // 32 * 1000
    });
  });
});
