import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function calculatePurchaseInvoice(
  physicalQuantityKg: Prisma.Decimal,
  orderPhysicalQuantityKg: Prisma.Decimal,
  orderPayableQuantityKg: Prisma.Decimal,
  adjustedUnitRate: Prisma.Decimal,
  qualityDeductionAmount: Prisma.Decimal,
) {
  if (physicalQuantityKg.lte(0) || orderPhysicalQuantityKg.lte(0) || orderPayableQuantityKg.lte(0) || adjustedUnitRate.lte(0)) {
    throw new BadRequestException('GRN quantity and purchase-order payable values must be greater than zero.');
  }
  if (physicalQuantityKg.gt(orderPhysicalQuantityKg)) {
    throw new BadRequestException('GRN quantity cannot exceed the physical purchase-order quantity.');
  }
  if (qualityDeductionAmount.lt(0)) {
    throw new BadRequestException('Quality deduction cannot be negative.');
  }

  const payableQuantityKg = physicalQuantityKg
    .mul(orderPayableQuantityKg)
    .div(orderPhysicalQuantityKg)
    .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
  const grossAmount = payableQuantityKg
    .mul(adjustedUnitRate)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (qualityDeductionAmount.gt(grossAmount)) {
    throw new BadRequestException('Quality deduction cannot exceed the gross purchase amount.');
  }

  return {
    payableQuantityKg,
    grossAmount,
    qualityDeductionAmount: qualityDeductionAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    netSupplierPayable: grossAmount.minus(qualityDeductionAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
  };
}

export function amount(value: string | undefined) {
  return value === undefined ? new Prisma.Decimal(0) : new Prisma.Decimal(value);
}
