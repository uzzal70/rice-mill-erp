import { Test, TestingModule } from '@nestjs/testing';
import { CalculationEngineService } from './calculations/calculation-engine.service';
import { IntegrityService } from './integrity/integrity.service';
import { PrismaService } from '../common/prisma.service';

describe('Critical ERP End-to-End Test Suite (#74 Testing Matrix)', () => {
  let calcService: CalculationEngineService;
  let integrityService: IntegrityService;

  beforeAll(async () => {
    const mockPrisma = {
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
      weighbridgeTicket: { findFirst: jest.fn().mockResolvedValue(null) },
      gateEntry: { findFirst: jest.fn().mockResolvedValue(null) },
      journal: { findFirst: jest.fn().mockResolvedValue(null) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculationEngineService,
        IntegrityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    calcService = module.get<CalculationEngineService>(CalculationEngineService);
    integrityService = module.get<IntegrityService>(IntegrityService);
  });

  describe('1. Critical Weight Test (Gross, Tare, Net)', () => {
    it('should accurately calculate net grain weight deducting gross, tare, bags, and refraction', () => {
      // Gross: 15,400 KG, Tare: 5,200 KG, 200 bags @ 0.8 KG = 160 KG, Dirt: 40 KG
      const weight = calcService.calculateNetWeight({
        grossWeightKg: 15400,
        tareWeightKg: 5200,
        bagCount: 200,
        bagTareWeightKg: 0.8,
        deductionsKg: 40,
      });

      expect(weight.grossWeightKg).toBe(15400);
      expect(weight.totalTareKg).toBe(5400); // 5200 + 160 + 40
      expect(weight.netWeightKg).toBe(10000); // 15400 - 5400 = 10000 KG
    });

    it('should reject invalid weighbridge measurements where tare >= gross', () => {
      expect(() => {
        integrityService.validateRealisticWeight(5000, 5200);
      }).toThrow('Gross weight (5000 KG) must be strictly greater than Tare weight (5200 KG)');
    });
  });

  describe('2. Critical Moisture & Purchase Payable Quantity Test', () => {
    it('should accurately calculate moisture deduction and payable purchase quantity', () => {
      // Received: 10,000 KG at 18.0% moisture against standard 14.0%
      const moisture = calcService.calculateMoistureDeduction({
        weightKg: 10000,
        moisturePercent: 18.0,
        baseMoisturePercent: 14.0,
        deductionPerPercent: 1.0,
      });

      expect(moisture.excessMoisturePercent).toBe(4.0);
      expect(moisture.deductionKg).toBe(400); // 4% of 10,000 KG

      const payableWeight = 10000 - moisture.deductionKg;
      expect(payableWeight).toBe(9600); // 10,000 - 400 = 9,600 KG

      // Financial purchase cost at agreed ৳35/KG payable
      const purchase = calcService.calculatePurchaseCost({
        payableWeightKg: payableWeight,
        ratePerKg: 35.0,
        bagCount: 0,
        bagRate: 0,
        laborCost: 1000,
      });

      expect(purchase.grainCost).toBe(336000); // 9600 * 35 = 336,000
      expect(purchase.totalPurchaseCost).toBe(337000); // 336,000 + 1,000 labor
    });

    it('should reject moisture values exceeding maximum threshold', () => {
      expect(() => {
        integrityService.validateMoisturePercentage(38.5);
      }).toThrow('is outside operational physical limits for rice mill grain');
    });
  });

  describe('3. Critical Production & Mass-Balance Recovery Test', () => {
    it('should enforce 100% mass-balance conservation and calculate recovery percentages', () => {
      // 4,000 KG input -> 2,600 KG head, 300 KG broken, 500 KG bran, 400 KG husk, 100 KG waste
      const recovery = calcService.calculateProductionRecovery({
        paddyInputKg: 4000,
        headRiceKg: 2600,
        brokenRiceKg: 300,
        branKg: 500,
        huskKg: 400,
        wasteKg: 100,
      });

      expect(recovery.paddyInputKg).toBe(4000);
      expect(recovery.totalOutputKg).toBe(3900);
      expect(recovery.processLossKg).toBe(100);
      expect(recovery.headRiceRecoveryPercent).toBe(65.0);
      expect(recovery.totalRiceRecoveryPercent).toBe(72.5);
      expect(recovery.byProductRecoveryPercent).toBe(22.5);
      expect(recovery.processLossPercent).toBe(2.5);
    });
  });

  describe('4. Critical Inventory & Stock Conservation Test', () => {
    it('should prevent negative inventory balance', async () => {
      // Mock movements where stock is 1000 KG and requested issue is 1500 KG
      const mockPrisma = {
        stockMovement: {
          findMany: jest.fn().mockResolvedValue([
            { type: 'RECEIPT', quantity: '1000' },
          ]),
        },
      };

      const testIntegrity = new IntegrityService(mockPrisma as any);
      await expect(
        testIntegrity.assertNonNegativeStock('comp-1', 'fact-1', 'item-1', 1500),
      ).rejects.toThrow('INTEGRITY_NEGATIVE_STOCK_PREVENTED');
    });
  });

  describe('5. Critical Sales Profitability & Margin Test', () => {
    it('should calculate accurate sales profit and margins', () => {
      const profit = calcService.calculateSalesProfit({
        salesRevenue: 176800, // 2600 KG * ৳68
        costOfGoodsSold: 135200, // 2600 KG * ৳52
        deliveryTransportCost: 2000,
      });

      expect(profit.salesRevenue).toBe(176800);
      expect(profit.costOfGoodsSold).toBe(135200);
      expect(profit.grossProfit).toBe(41600); // 176800 - 135200
      expect(profit.netProfit).toBe(39600); // 41600 - 2000
      expect(profit.grossMarginPercent).toBeCloseTo(23.53, 1);
      expect(profit.netMarginPercent).toBeCloseTo(22.40, 1);
    });
  });

  describe('6. Critical Accounting Journal Balance Test', () => {
    it('should reject unbalanced journal entries', () => {
      expect(() => {
        integrityService.assertBalancedJournal([
          { debit: 50000, credit: 0 },
          { debit: 0, credit: 48000 },
        ]);
      }).toThrow('INTEGRITY_UNBALANCED_JOURNAL_PREVENTED');
    });

    it('should accept strictly balanced journal entries', () => {
      const balanced = integrityService.assertBalancedJournal([
        { debit: 50000, credit: 0 },
        { debit: 0, credit: 50000 },
      ]);
      expect(balanced.totalDebit).toBe(50000);
      expect(balanced.totalCredit).toBe(50000);
    });
  });
});
