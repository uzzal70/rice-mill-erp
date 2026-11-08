import { BadRequestException } from '@nestjs/common';
import { ItemKind } from '@prisma/client';
import { calculateProductionRecovery } from './production.calculations';

describe('calculateProductionRecovery', () => {
  it('calculates recovery from actual rice and by-product outputs', () => {
    const result = calculateProductionRecovery('4000', [
      { kind: ItemKind.RICE, riceType: 'HEAD', quantityKg: '2600' },
      { kind: ItemKind.RICE, riceType: 'BROKEN', quantityKg: '300' },
      { kind: ItemKind.BY_PRODUCT, riceType: null, quantityKg: '500' },
      { kind: ItemKind.BY_PRODUCT, riceType: null, quantityKg: '400' },
      { kind: ItemKind.OTHER, riceType: null, quantityKg: '100' },
    ]);

    expect(result.totalOutputKg.toString()).toBe('3900');
    expect(result.processLossKg.toString()).toBe('100');
    expect(result.headRiceRecoveryPct.toString()).toBe('65');
    expect(result.totalRiceRecoveryPct.toString()).toBe('72.5');
    expect(result.byProductRecoveryPct.toString()).toBe('25');
  });

  it('rejects outputs exceeding actual input', () => {
    expect(() => calculateProductionRecovery('100', [
      { kind: ItemKind.RICE, riceType: null, quantityKg: '101' },
    ])).toThrow(BadRequestException);
  });

  it('rejects zero or negative output quantities', () => {
    expect(() => calculateProductionRecovery('100', [
      { kind: ItemKind.BY_PRODUCT, riceType: null, quantityKg: '0' },
    ])).toThrow(BadRequestException);
  });
});
