import { BadRequestException } from '@nestjs/common';
import { MoistureDeductionFormula, Prisma } from '@prisma/client';
import { calculateMoistureAdjustment } from './moisture.calculations';

const decimal = (value: string | number) => new Prisma.Decimal(value);

describe('calculateMoistureAdjustment', () => {
  it('uses the tolerance-adjusted limit and keeps the agreed rate when no quantity deduction applies', () => {
    const result = calculateMoistureAdjustment(decimal(1000), decimal(50), decimal(12.5), {
      allowedMoisturePct: decimal(12),
      tolerancePct: decimal(0.5),
      formula: MoistureDeductionFormula.DRY_MATTER_CORRECTION,
      rateDeductionPct: decimal(3),
      slabs: [],
    });

    expect(result.payableQuantityKg).toEqual(decimal(1000));
    expect(result.deductionQuantityKg).toEqual(decimal(0));
    expect(result.adjustedUnitRate).toEqual(decimal(50));
    expect(result.appliedRateDeductionPct).toEqual(decimal(0));
  });

  it('dry-matter corrects quantity to accepted moisture and separately reduces rate', () => {
    const result = calculateMoistureAdjustment(decimal(1000), decimal(50), decimal(14.5), {
      allowedMoisturePct: decimal(12),
      tolerancePct: decimal(0.5),
      formula: MoistureDeductionFormula.DRY_MATTER_CORRECTION,
      rateDeductionPct: decimal(3),
      slabs: [],
    });

    expect(result.payableQuantityKg).toEqual(decimal('977.143'));
    expect(result.deductionQuantityKg).toEqual(decimal('22.857'));
    expect(result.excessMoisturePct).toEqual(decimal('2'));
    expect(result.adjustedUnitRate).toEqual(decimal('48.5'));
    expect(result.appliedRateDeductionPct).toEqual(decimal(3));
  });

  it('uses the highest configured slab threshold at or below excess moisture', () => {
    const result = calculateMoistureAdjustment(decimal(1000), decimal(50), decimal(15), {
      allowedMoisturePct: decimal(12),
      tolerancePct: decimal(0),
      formula: MoistureDeductionFormula.SLAB_PERCENTAGE,
      rateDeductionPct: decimal(0),
      slabs: [
        { minExcessPct: decimal(0), deductionPct: decimal(0.5) },
        { minExcessPct: decimal(1), deductionPct: decimal(1) },
        { minExcessPct: decimal(2), deductionPct: decimal(3) },
      ],
    });

    expect(result.deductionPct).toEqual(decimal(3));
    expect(result.payableQuantityKg).toEqual(decimal(970));
    expect(result.deductionQuantityKg).toEqual(decimal(30));
  });

  it('rejects invalid limits, non-positive quantities and uncovered excess moisture', () => {
    expect(() => calculateMoistureAdjustment(decimal(100), decimal(10), decimal(20), {
      allowedMoisturePct: decimal(99),
      tolerancePct: decimal(1),
      formula: MoistureDeductionFormula.DRY_MATTER_CORRECTION,
      rateDeductionPct: decimal(0),
      slabs: [],
    })).toThrow(BadRequestException);

    expect(() => calculateMoistureAdjustment(decimal(100), decimal(10), decimal(15), {
      allowedMoisturePct: decimal(12),
      tolerancePct: decimal(0),
      formula: MoistureDeductionFormula.SLAB_PERCENTAGE,
      rateDeductionPct: decimal(0),
      slabs: [{ minExcessPct: decimal(4), deductionPct: decimal(1) }],
    })).toThrow(BadRequestException);
  });
});
