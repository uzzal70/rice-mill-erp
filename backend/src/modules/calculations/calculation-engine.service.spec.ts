import { Test, TestingModule } from '@nestjs/testing';
import { CalculationEngineService } from './calculation-engine.service';
import { BadRequestException } from '@nestjs/common';

describe('CalculationEngineService (#63)', () => {
  let service: CalculationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculationEngineService],
    }).compile();

    service = module.get<CalculationEngineService>(CalculationEngineService);
  });

  // 1. calculateNetWeight()
  it('1. should calculateNetWeight correctly with bag tare and deductions', () => {
    const res = service.calculateNetWeight({
      grossWeightKg: 15400,
      tareWeightKg: 4200,
      bagCount: 200,
      bagTareWeightKg: 0.1, // 20 KG total bag tare
      deductionsKg: 30, // dirt deduction
    });
    // total tare = 4200 + 20 + 30 = 4250
    // net = 15400 - 4250 = 11150
    expect(res.totalTareKg).toBe(4250);
    expect(res.netWeightKg).toBe(11150);
  });

  it('1. should reject calculateNetWeight when gross is less than tare', () => {
    expect(() =>
      service.calculateNetWeight({
        grossWeightKg: 4000,
        tareWeightKg: 4200,
      }),
    ).toThrow(BadRequestException);
  });

  // 2. calculateMoistureDeduction()
  it('2. should calculateMoistureDeduction based on excess over base moisture', () => {
    const res = service.calculateMoistureDeduction({
      weightKg: 10000,
      moisturePercent: 16.5,
      baseMoisturePercent: 14.0,
      deductionPerPercent: 1.0,
    });
    // excess = 2.5%
    // deduction = 10000 * 2.5% = 250 KG
    expect(res.excessMoisturePercent).toBe(2.5);
    expect(res.deductionKg).toBe(250);

    // Below base moisture gives 0 deduction
    const resZero = service.calculateMoistureDeduction({
      weightKg: 10000,
      moisturePercent: 13.5,
      baseMoisturePercent: 14.0,
    });
    expect(resZero.excessMoisturePercent).toBe(0);
    expect(resZero.deductionKg).toBe(0);
  });

  // 3. calculateAdjustedQuantity()
  it('3. should calculateAdjustedQuantity net of moisture and foreign matter deductions', () => {
    const res = service.calculateAdjustedQuantity({
      actualWeightKg: 10000,
      moistureDeductionKg: 250,
      foreignMatterDeductionKg: 100,
      otherDeductionsKg: 50,
    });
    // total deductions = 400
    // payable = 10000 - 400 = 9600
    expect(res.totalDeductionsKg).toBe(400);
    expect(res.payableWeightKg).toBe(9600);
  });

  // 4. calculatePurchaseCost()
  it('4. should calculatePurchaseCost including grain, bags, labor and deductions', () => {
    const res = service.calculatePurchaseCost({
      payableWeightKg: 9600,
      ratePerKg: 32.5,
      bagCount: 200,
      bagRate: 45,
      laborCost: 1500,
      deductions: 500,
    });
    // grain = 9600 * 32.5 = 312000
    // bags = 200 * 45 = 9000
    // total = 312000 + 9000 + 1500 - 500 = 322000
    expect(res.grainCost).toBe(312000);
    expect(res.bagCost).toBe(9000);
    expect(res.totalPurchaseCost).toBe(322000);
  });

  // 5. calculateLandedCost()
  it('5. should calculateLandedCost per KG and per Mon with all direct overheads', () => {
    const res = service.calculateLandedCost({
      purchaseCost: 322000,
      payableWeightKg: 9600,
      transportCost: 8000,
      loadingCost: 1200,
      unloadingCost: 1200,
      brokerageCost: 2000,
      insuranceCost: 600,
      otherDirectCosts: 1000,
    });
    // overheads = 8000 + 1200 + 1200 + 2000 + 600 + 1000 = 14000
    // total landed = 322000 + 14000 = 336000
    // cost / kg = 336000 / 9600 = 35.00
    // cost / mon = 35.00 * 40 = 1400.00
    expect(res.directOverheadsTotal).toBe(14000);
    expect(res.totalLandedCost).toBe(336000);
    expect(res.landedCostPerKg).toBe(35);
    expect(res.landedCostPerMon).toBe(1400);
  });

  // 6. calculateProductionRecovery()
  it('6. should calculateProductionRecovery accurately across all output fractions', () => {
    const res = service.calculateProductionRecovery({
      paddyInputKg: 4000,
      headRiceKg: 2600,
      brokenRiceKg: 300,
      branKg: 500,
      huskKg: 400,
      wasteKg: 100,
    });
    expect(res.totalOutputKg).toBe(3900);
    expect(res.processLossKg).toBe(100);
    expect(res.processLossPercent).toBe(2.5);
    expect(res.headRiceRecoveryPercent).toBe(65);
    expect(res.totalRiceRecoveryPercent).toBe(72.5);
    expect(res.byProductRecoveryPercent).toBe(22.5);
    expect(res.wastePercent).toBe(2.5);
  });

  // 7. calculateByProductValue()
  it('7. should calculateByProductValue based on item rates', () => {
    const res = service.calculateByProductValue({
      byProducts: [
        { type: 'BRAN', quantityKg: 500, ratePerKg: 35 }, // 17500
        { type: 'HUSK', quantityKg: 400, ratePerKg: 4 }, // 1600
      ],
    });
    expect(res.totalQuantityKg).toBe(900);
    expect(res.totalValue).toBe(19100);
  });

  // 8. calculateProductionCost()
  it('8. should calculateProductionCost netting out by-product revenue offsets', () => {
    const res = service.calculateProductionCost({
      paddyCost: 140000,
      electricityCost: 6000,
      laborCost: 4000,
      boilerFuelCost: 3000,
      machineDepreciation: 1500,
      packingCost: 2500,
      byProductRevenueOffset: 19100,
    });
    // overheads = 6000 + 4000 + 3000 + 1500 + 2500 = 17000
    // gross = 140000 + 17000 = 157000
    // net = 157000 - 19100 = 137900
    expect(res.millingOperatingOverheads).toBe(17000);
    expect(res.grossMillingCost).toBe(157000);
    expect(res.netMillingCost).toBe(137900);
  });

  // 9. calculateRiceCost()
  it('9. should calculateRiceCost allocating costs between head rice and broken rice', () => {
    const res = service.calculateRiceCost({
      netProductionCost: 137900,
      headRiceKg: 2600,
      brokenRiceKg: 300,
      brokenRiceRelativeValueRatio: 0.5,
    });
    // effective weight = 2600 + (300 * 0.5) = 2750 KG
    // head rice cost / kg = 137900 / 2750 = 50.1455
    // broken rice cost / kg = 50.1455 * 0.5 = 25.0727
    expect(res.headRiceCostPerKg).toBeCloseTo(50.1455, 3);
    expect(res.brokenRiceCostPerKg).toBeCloseTo(25.0727, 3);
  });

  // 10. calculateSalesProfit()
  it('10. should calculateSalesProfit including gross profit, net profit, and margins', () => {
    const res = service.calculateSalesProfit({
      salesRevenue: 200000,
      costOfGoodsSold: 160000,
      deliveryTransportCost: 5000,
      commission: 2000,
      discounts: 3000,
      tax: 1500,
    });
    // net revenue = 200000 - 3000 - 2000 = 195000
    // gross profit = 195000 - 160000 = 35000 (17.95%)
    // net profit = 35000 - 5000 - 1500 = 28500 (14.62%)
    expect(res.netRevenue).toBe(195000);
    expect(res.grossProfit).toBe(35000);
    expect(res.grossMarginPercent).toBe(17.95);
    expect(res.netProfit).toBe(28500);
    expect(res.netMarginPercent).toBe(14.62);
  });

  // 11. calculateSupplierDue()
  it('11. should calculateSupplierDue factoring in payments, debit notes and advances', () => {
    const res = service.calculateSupplierDue({
      totalInvoiced: 500000,
      totalSettled: 350000,
      adjustmentsOrNotes: 15000, // debit note
      advances: 25000, // paid in advance
    });
    // due = 500000 - 15000 - 350000 - 25000 = 110000
    expect(res.netPayableDue).toBe(110000);
  });

  // 12. calculateCustomerDue()
  it('12. should calculateCustomerDue factoring in receipts, credit notes and advances', () => {
    const res = service.calculateCustomerDue({
      totalInvoiced: 800000,
      totalSettled: 600000,
      adjustmentsOrNotes: 20000, // credit note
      advances: 50000,
    });
    // due = 800000 - 20000 - 600000 - 50000 = 130000
    expect(res.netReceivableDue).toBe(130000);
  });

  // 13. calculateTollCharge()
  it('13. should calculateTollCharge net of retained by-products', () => {
    const res = service.calculateTollCharge({
      paddyMilledKg: 10000,
      millingRatePerKg: 3.5, // 35,000 BDT gross milling fee
      byProductRetentionValue: 8000, // Mill keeps bran/husk worth 8000
      packagingCharge: 1500,
      handlingFee: 500,
    });
    // net toll = 35000 + 1500 + 500 - 8000 = 29000
    expect(res.grossMillingCharge).toBe(35000);
    expect(res.packagingAndHandling).toBe(2000);
    expect(res.netTollPayable).toBe(29000);
  });

  // 14. calculatePackagingCost()
  it('14. should calculatePackagingCost with bag, twine, and printing breakdown', () => {
    const res = service.calculatePackagingCost({
      bagCount: 500,
      bagUnitPrice: 42.0,
      twineCostPerBag: 0.5,
      printingCostPerBag: 1.5,
      linerCostPerBag: 1.0,
    });
    // cost per bag = 42 + 0.5 + 1.5 + 1.0 = 45.0
    // total packaging = 500 * 45 = 22500
    expect(res.costPerBag).toBe(45);
    expect(res.totalPackagingCost).toBe(22500);
  });
});

