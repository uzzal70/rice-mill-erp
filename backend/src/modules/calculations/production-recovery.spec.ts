import { Test, TestingModule } from '@nestjs/testing';
import { CalculationEngineService } from './calculation-engine.service';
import { BadRequestException } from '@nestjs/common';

describe('Production Mass Balance & Yield Recovery - Benchmark Example (#64)', () => {
  let service: CalculationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculationEngineService],
    }).compile();

    service = module.get<CalculationEngineService>(CalculationEngineService);
  });

  /**
   * Promtdoc #64 Benchmark Example:
   * Input Paddy: 4000 KG
   * Outputs:
   *   2600 KG Head Rice
   *   300 KG Broken Rice
   *   500 KG Bran
   *   400 KG Husk
   *   100 KG Waste
   * Expected:
   *   Total Output: 3900 KG
   *   Process Loss: 100 KG (2.5%)
   *   Head Rice Recovery: 65.0%
   *   Total Rice Recovery: 72.5%
   *   By-product Recovery: 22.5%
   */
  it('should verify exact promtdoc #64 benchmark mass balance calculations from actual values', () => {
    const input = {
      paddyInputKg: 4000,
      headRiceKg: 2600,
      brokenRiceKg: 300,
      branKg: 500,
      huskKg: 400,
      wasteKg: 100,
    };

    const result = service.calculateProductionRecovery(input);

    // 1. Total Output = 2600 + 300 + 500 + 400 + 100 = 3900 KG
    expect(result.totalOutputKg).toBe(3900);

    // 2. Process Loss = 4000 - 3900 = 100 KG (2.5%)
    expect(result.processLossKg).toBe(100);
    expect(result.processLossPercent).toBe(2.5);

    // 3. Head Rice Recovery = 2600 / 4000 = 65.0%
    expect(result.headRiceRecoveryPercent).toBe(65.0);

    // 4. Total Rice Recovery = (2600 + 300) / 4000 = 2900 / 4000 = 72.5%
    expect(result.totalRiceRecoveryPercent).toBe(72.5);

    // 5. By-product Recovery = (500 + 400) / 4000 = 900 / 4000 = 22.5%
    expect(result.byProductRecoveryPercent).toBe(22.5);

    // 6. Waste = 100 / 4000 = 2.5%
    expect(result.wastePercent).toBe(2.5);

    // Verify mass conservation: total outputs (3900) + process loss (100) = 4000 KG input
    expect(result.totalOutputKg + result.processLossKg).toBe(input.paddyInputKg);
  });

  it('should calculate actual recovery dynamically and NOT assume default 65% for different batches', () => {
    // Premium Miniket Paddy batch yielding higher head rice
    const highYieldBatch = {
      paddyInputKg: 5000,
      headRiceKg: 3400, // 68.0% head rice
      brokenRiceKg: 250, // 5.0% broken
      branKg: 550, // 11.0% bran
      huskKg: 700, // 14.0% husk
      wasteKg: 50, // 1.0% waste
    };

    const resHigh = service.calculateProductionRecovery(highYieldBatch);
    expect(resHigh.headRiceRecoveryPercent).toBe(68.0);
    expect(resHigh.totalRiceRecoveryPercent).toBe(73.0);
    expect(resHigh.byProductRecoveryPercent).toBe(25.0);
    expect(resHigh.processLossKg).toBe(50);
    expect(resHigh.processLossPercent).toBe(1.0);

    // Lower yield drought/damaged batch
    const lowYieldBatch = {
      paddyInputKg: 5000,
      headRiceKg: 2800, // 56.0% head rice
      brokenRiceKg: 600, // 12.0% broken
      branKg: 650,
      huskKg: 750,
      wasteKg: 100,
    };

    const resLow = service.calculateProductionRecovery(lowYieldBatch);
    expect(resLow.headRiceRecoveryPercent).toBe(56.0);
    expect(resLow.totalRiceRecoveryPercent).toBe(68.0);
    expect(resLow.processLossKg).toBe(100);
  });

  it('should throw BadRequestException if input paddy is zero or negative', () => {
    expect(() =>
      service.calculateProductionRecovery({
        paddyInputKg: 0,
        headRiceKg: 2600,
        brokenRiceKg: 300,
        branKg: 500,
        huskKg: 400,
      }),
    ).toThrow(BadRequestException);
  });
});

