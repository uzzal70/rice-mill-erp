import { BadRequestException } from '@nestjs/common';
import { ItemKind, Prisma } from '@prisma/client';

export type ProductionOutputForRecovery = {
  kind: ItemKind;
  riceType: string | null;
  quantityKg: Prisma.Decimal.Value;
};

export function calculateProductionRecovery(
  inputQuantityKg: Prisma.Decimal.Value,
  outputs: ProductionOutputForRecovery[],
) {
  const input = new Prisma.Decimal(inputQuantityKg);
  if (!input.isFinite() || input.lte(0)) throw new BadRequestException('Production input quantity must be greater than zero.');
  if (!outputs.length) throw new BadRequestException('At least one production output is required.');

  for (const output of outputs) {
    const quantity = new Prisma.Decimal(output.quantityKg);
    if (!quantity.isFinite() || quantity.lte(0)) throw new BadRequestException('Every production output quantity must be greater than zero.');
  }

  const outputTotal = outputs.reduce((total, output) => total.plus(output.quantityKg), new Prisma.Decimal(0));
  if (outputTotal.gt(input)) throw new BadRequestException('Total production output cannot exceed input quantity.');
  const head = outputs.filter(output => output.kind === ItemKind.RICE && output.riceType?.toUpperCase() !== 'BROKEN')
    .reduce((total, output) => total.plus(output.quantityKg), new Prisma.Decimal(0));
  const broken = outputs.filter(output => output.kind === ItemKind.RICE && output.riceType?.toUpperCase() === 'BROKEN')
    .reduce((total, output) => total.plus(output.quantityKg), new Prisma.Decimal(0));
  const byProducts = outputTotal.minus(head).minus(broken);
  const loss = input.minus(outputTotal);
  const pct = (quantity: Prisma.Decimal) => quantity.div(input).mul(100).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
  return {
    inputQuantityKg: input.toDecimalPlaces(3),
    totalOutputKg: outputTotal.toDecimalPlaces(3),
    processLossKg: loss.toDecimalPlaces(3),
    headRiceKg: head.toDecimalPlaces(3),
    brokenRiceKg: broken.toDecimalPlaces(3),
    byProductKg: byProducts.toDecimalPlaces(3),
    headRiceRecoveryPct: pct(head),
    totalRiceRecoveryPct: pct(head.plus(broken)),
    byProductRecoveryPct: pct(byProducts),
  };
}
