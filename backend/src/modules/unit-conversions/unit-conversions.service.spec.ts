import { BadRequestException } from '@nestjs/common';
import { UnitOfMeasure } from '@prisma/client';
import { conversionFactor } from './unit-conversions.service';
import { Prisma } from '@prisma/client';

describe('conversionFactor', () => {
  const rules = [
    { fromUnit: UnitOfMeasure.MON, toUnit: UnitOfMeasure.KG, factor: new Prisma.Decimal('40') },
    { fromUnit: UnitOfMeasure.TON, toUnit: UnitOfMeasure.KG, factor: new Prisma.Decimal('1000') },
  ];

  it('converts using configured factors and preserves decimal precision', () => {
    expect(conversionFactor(UnitOfMeasure.MON, UnitOfMeasure.KG, rules).toString()).toBe('40');
    expect(conversionFactor(UnitOfMeasure.MON, UnitOfMeasure.TON, rules).toString()).toBe('0.04');
    expect(conversionFactor(UnitOfMeasure.KG, UnitOfMeasure.MON, rules).toString()).toBe('0.025');
  });

  it('returns one for identical units', () => {
    expect(conversionFactor(UnitOfMeasure.KG, UnitOfMeasure.KG, rules).toString()).toBe('1');
  });

  it('rejects conversions without a configured path', () => {
    expect(() => conversionFactor(UnitOfMeasure.BAG, UnitOfMeasure.KG, rules)).toThrow(BadRequestException);
  });
});
