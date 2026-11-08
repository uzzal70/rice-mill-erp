import { BadRequestException } from '@nestjs/common';
import { BrokerCommissionType, Prisma, UnitOfMeasure } from '@prisma/client';
import { calculateBrokerCommission } from './procurement.calculations';

describe('calculateBrokerCommission', () => {
  const quantity = new Prisma.Decimal(4000);
  const unitRate = new Prisma.Decimal(30);
  const rules = [
    { fromUnit: UnitOfMeasure.KG, toUnit: UnitOfMeasure.MON, factor: new Prisma.Decimal('0.025') },
    { fromUnit: UnitOfMeasure.KG, toUnit: UnitOfMeasure.TON, factor: new Prisma.Decimal('0.001') },
  ];

  it('calculates per-KG, per-Mon, and per-Ton commission using configured unit conversion', () => {
    expect(calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PER_KG, new Prisma.Decimal('0.5'), rules))
      .toEqual(new Prisma.Decimal('2000.00'));
    expect(calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PER_MON, new Prisma.Decimal('10'), rules))
      .toEqual(new Prisma.Decimal('1000.00'));
    expect(calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PER_TON, new Prisma.Decimal('100'), rules))
      .toEqual(new Prisma.Decimal('400.00'));
  });

  it('calculates percentage and fixed commission against purchase amount', () => {
    expect(calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PERCENTAGE, new Prisma.Decimal(2), rules))
      .toEqual(new Prisma.Decimal('2400.00'));
    expect(calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.FIXED_AMOUNT, new Prisma.Decimal('750.25'), rules))
      .toEqual(new Prisma.Decimal('750.25'));
  });

  it('requires configured conversions and valid rates', () => {
    expect(() => calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PER_MON, new Prisma.Decimal(1), []))
      .toThrow(BadRequestException);
    expect(() => calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PERCENTAGE, new Prisma.Decimal(101), rules))
      .toThrow(BadRequestException);
    expect(() => calculateBrokerCommission(quantity, unitRate, BrokerCommissionType.PER_KG, new Prisma.Decimal(0), rules))
      .toThrow(BadRequestException);
  });
});
