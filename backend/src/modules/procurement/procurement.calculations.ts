import { BadRequestException } from '@nestjs/common';
import { BrokerCommissionType, Prisma, UnitOfMeasure } from '@prisma/client';
import { conversionFactor, Rule } from '../unit-conversions/unit-conversions.service';

export function calculateBrokerCommission(
  quantityKg: Prisma.Decimal,
  unitRate: Prisma.Decimal,
  commissionType: BrokerCommissionType,
  commissionRate: Prisma.Decimal,
  rules: Rule[],
) {
  if (quantityKg.lte(0) || unitRate.lte(0) || commissionRate.lte(0)) {
    throw new BadRequestException('Purchase quantity, unit rate, and broker commission rate must be greater than zero.');
  }
  if (commissionType === BrokerCommissionType.PERCENTAGE) {
    if (commissionRate.gt(100)) throw new BadRequestException('Percentage commission cannot exceed 100.');
    return new Prisma.Decimal(quantityKg.mul(unitRate).mul(commissionRate).div(100).toFixed(2));
  }
  if (commissionType === BrokerCommissionType.FIXED_AMOUNT) return new Prisma.Decimal(commissionRate.toFixed(2));
  const toUnit = commissionType === BrokerCommissionType.PER_KG
    ? UnitOfMeasure.KG
    : commissionType === BrokerCommissionType.PER_MON
      ? UnitOfMeasure.MON
      : UnitOfMeasure.TON;
  const quantity = quantityKg.mul(conversionFactor(UnitOfMeasure.KG, toUnit, rules));
  return new Prisma.Decimal(quantity.mul(commissionRate).toFixed(2));
}
