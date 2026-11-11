import { Test, TestingModule } from '@nestjs/testing';
import { CalculationEngineController } from './calculation-engine.controller';
import { CalculationEngineService } from './calculation-engine.service';

describe('CalculationEngineController (#63)', () => {
  let controller: CalculationEngineController;
  let service: CalculationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalculationEngineController],
      providers: [CalculationEngineService],
    }).compile();

    controller = module.get<CalculationEngineController>(CalculationEngineController);
    service = module.get<CalculationEngineService>(CalculationEngineService);
  });

  it('should expose all 14 calculation routes via controller', () => {
    // 1. net-weight
    expect(
      controller.calculateNetWeight({ grossWeightKg: 10000, tareWeightKg: 3000 }),
    ).toEqual({ grossWeightKg: 10000, totalTareKg: 3000, netWeightKg: 7000 });

    // 2. moisture-deduction
    expect(
      controller.calculateMoistureDeduction({ weightKg: 1000, moisturePercent: 16 }),
    ).toEqual({
      weightKg: 1000,
      moisturePercent: 16,
      baseMoisturePercent: 14,
      excessMoisturePercent: 2,
      deductionKg: 20,
    });

    // 3. adjusted-quantity
    expect(
      controller.calculateAdjustedQuantity({ actualWeightKg: 1000, moistureDeductionKg: 50 }),
    ).toEqual({ actualWeightKg: 1000, totalDeductionsKg: 50, payableWeightKg: 950 });

    // 4. purchase-cost
    expect(
      controller.calculatePurchaseCost({ payableWeightKg: 1000, ratePerKg: 30 }),
    ).toMatchObject({ grainCost: 30000, totalPurchaseCost: 30000 });

    // 5. landed-cost
    expect(
      controller.calculateLandedCost({ purchaseCost: 30000, payableWeightKg: 1000, transportCost: 2000 }),
    ).toMatchObject({ totalLandedCost: 32000, landedCostPerKg: 32 });

    // 6. production-recovery
    expect(
      controller.calculateProductionRecovery({
        paddyInputKg: 4000,
        headRiceKg: 2600,
        brokenRiceKg: 300,
        branKg: 500,
        huskKg: 400,
        wasteKg: 100,
      }),
    ).toMatchObject({ totalOutputKg: 3900, headRiceRecoveryPercent: 65 });

    // 7. by-product-value
    expect(
      controller.calculateByProductValue({
        byProducts: [{ type: 'BRAN', quantityKg: 100, ratePerKg: 30 }],
      }),
    ).toEqual({
      items: [{ type: 'BRAN', quantityKg: 100, ratePerKg: 30, totalValue: 3000 }],
      totalQuantityKg: 100,
      totalValue: 3000,
    });

    // 8. production-cost
    expect(
      controller.calculateProductionCost({ paddyCost: 100000, electricityCost: 5000 }),
    ).toMatchObject({ grossMillingCost: 105000, netMillingCost: 105000 });

    // 9. rice-cost
    expect(
      controller.calculateRiceCost({ netProductionCost: 50000, headRiceKg: 1000 }),
    ).toMatchObject({ headRiceCostPerKg: 50 });

    // 10. sales-profit
    expect(
      controller.calculateSalesProfit({ salesRevenue: 100000, costOfGoodsSold: 80000 }),
    ).toMatchObject({ grossProfit: 20000 });

    // 11. supplier-due
    expect(
      controller.calculateSupplierDue({ totalInvoiced: 100000, totalSettled: 80000 }),
    ).toEqual({
      totalInvoiced: 100000,
      totalSettled: 80000,
      adjustmentsOrNotes: 0,
      advances: 0,
      netPayableDue: 20000,
    });

    // 12. customer-due
    expect(
      controller.calculateCustomerDue({ totalInvoiced: 150000, totalSettled: 100000 }),
    ).toEqual({
      totalInvoiced: 150000,
      totalSettled: 100000,
      adjustmentsOrNotes: 0,
      advances: 0,
      netReceivableDue: 50000,
    });

    // 13. toll-charge
    expect(
      controller.calculateTollCharge({ paddyMilledKg: 1000, millingRatePerKg: 3 }),
    ).toMatchObject({ grossMillingCharge: 3000, netTollPayable: 3000 });

    // 14. packaging-cost
    expect(
      controller.calculatePackagingCost({ bagCount: 100, bagUnitPrice: 40 }),
    ).toMatchObject({ totalPackagingCost: 4150 });
  });
});

