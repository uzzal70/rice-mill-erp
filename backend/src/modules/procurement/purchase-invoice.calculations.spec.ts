import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculatePurchaseInvoice } from './purchase-invoice.calculations';

const decimal = (value: string | number) => new Prisma.Decimal(value);

describe('calculatePurchaseInvoice', () => {
  it('allocates moisture-adjusted payable quantity and deducts manual quality amount only', () => {
    const result = calculatePurchaseInvoice(decimal(1250), decimal(2500), decimal(2400), decimal(30), decimal(15));

    expect(result.payableQuantityKg).toEqual(decimal(1200));
    expect(result.grossAmount).toEqual(decimal(36000));
    expect(result.qualityDeductionAmount).toEqual(decimal(15));
    expect(result.netSupplierPayable).toEqual(decimal(35985));
  });

  it('rounds currency to two decimal places and prevents deductions beyond gross amount', () => {
    const result = calculatePurchaseInvoice(decimal(333.333), decimal(1000), decimal(999.999), decimal('12.3456'), decimal(0));
    expect(result.payableQuantityKg).toEqual(decimal('333.333'));
    expect(result.grossAmount).toEqual(decimal('4115.20'));

    expect(() => calculatePurchaseInvoice(decimal(100), decimal(100), decimal(90), decimal(10), decimal(901)))
      .toThrow(BadRequestException);
  });
});
