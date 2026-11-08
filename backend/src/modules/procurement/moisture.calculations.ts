import { BadRequestException } from '@nestjs/common';
import { MoistureDeductionFormula, Prisma } from '@prisma/client';

export type MoistureSlab = { minExcessPct: Prisma.Decimal; deductionPct: Prisma.Decimal };

export type MoisturePolicyCalculation = {
  allowedMoisturePct: Prisma.Decimal;
  tolerancePct: Prisma.Decimal;
  formula: MoistureDeductionFormula;
  rateDeductionPct: Prisma.Decimal;
  slabs: MoistureSlab[];
};

export function calculateMoistureAdjustment(
  physicalQuantityKg: Prisma.Decimal,
  agreedUnitRate: Prisma.Decimal,
  receivedMoisturePct: Prisma.Decimal,
  policy: MoisturePolicyCalculation,
) {
  const acceptedMoisturePct = policy.allowedMoisturePct.plus(policy.tolerancePct);
  if (acceptedMoisturePct.gte(100) || policy.allowedMoisturePct.lt(0) || policy.tolerancePct.lt(0)) {
    throw new BadRequestException('Allowed moisture plus tolerance must be less than 100%.');
  }
  if (receivedMoisturePct.lt(0) || receivedMoisturePct.gt(100)) {
    throw new BadRequestException('Measured moisture must be between 0% and 100%.');
  }
  if (physicalQuantityKg.lte(0) || agreedUnitRate.lte(0)) {
    throw new BadRequestException('Physical quantity and agreed rate must be greater than zero.');
  }
  if (policy.rateDeductionPct.lt(0) || policy.rateDeductionPct.gte(100)) {
    throw new BadRequestException('Rate deduction must be at least 0% and less than 100%.');
  }

  const excessMoisturePct = Prisma.Decimal.max(receivedMoisturePct.minus(acceptedMoisturePct), 0);
  let deductionPct = new Prisma.Decimal(0);
  if (excessMoisturePct.gt(0)) {
    if (policy.formula === MoistureDeductionFormula.DRY_MATTER_CORRECTION) {
      deductionPct = excessMoisturePct.div(new Prisma.Decimal(100).minus(acceptedMoisturePct)).mul(100);
    } else {
      const slab = [...policy.slabs]
        .sort((left, right) => left.minExcessPct.comparedTo(right.minExcessPct))
        .filter(row => row.minExcessPct.lte(excessMoisturePct))
        .at(-1);
      if (!slab) throw new BadRequestException('No moisture deduction slab covers the measured excess.');
      deductionPct = slab.deductionPct;
    }
  }
  if (deductionPct.lt(0) || deductionPct.gte(100)) {
    throw new BadRequestException('Moisture quantity deduction must be at least 0% and less than 100%.');
  }

  const payableQuantityKg = physicalQuantityKg
    .mul(new Prisma.Decimal(100).minus(deductionPct))
    .div(100)
    .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
  const deductionQuantityKg = physicalQuantityKg.minus(payableQuantityKg);
  const appliedRateDeductionPct = excessMoisturePct.gt(0) ? policy.rateDeductionPct : new Prisma.Decimal(0);
  const adjustedUnitRate = agreedUnitRate
    .mul(new Prisma.Decimal(100).minus(appliedRateDeductionPct))
    .div(100)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

  return {
    acceptedMoisturePct,
    excessMoisturePct: excessMoisturePct.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP),
    deductionPct: deductionPct.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
    deductionQuantityKg,
    payableQuantityKg,
    adjustedUnitRate,
    appliedRateDeductionPct,
  };
}
