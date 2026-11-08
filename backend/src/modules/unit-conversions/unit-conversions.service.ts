import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ConvertQuantityDto, CreateUnitConversionDto, ListUnitConversionsDto } from './unit-conversions.dto';

export type Rule = { fromUnit: UnitOfMeasure; toUnit: UnitOfMeasure; factor: Prisma.Decimal };

export function conversionFactor(fromUnit: UnitOfMeasure, toUnit: UnitOfMeasure, rules: Rule[]) {
  if (fromUnit === toUnit) return new Prisma.Decimal(1);
  const graph = new Map<UnitOfMeasure, Array<{ unit: UnitOfMeasure; factor: Prisma.Decimal }>>();
  const add = (from: UnitOfMeasure, to: UnitOfMeasure, factor: Prisma.Decimal) => {
    const edges = graph.get(from) ?? [];
    edges.push({ unit: to, factor });
    graph.set(from, edges);
  };
  for (const rule of rules) {
    if (rule.factor.lte(0)) throw new BadRequestException('Conversion factors must be greater than zero.');
    add(rule.fromUnit, rule.toUnit, rule.factor);
    add(rule.toUnit, rule.fromUnit, new Prisma.Decimal(1).div(rule.factor));
  }
  const queue = [{ unit: fromUnit, factor: new Prisma.Decimal(1) }];
  const visited = new Set<UnitOfMeasure>([fromUnit]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of graph.get(current.unit) ?? []) {
      if (visited.has(edge.unit)) continue;
      const factor = current.factor.mul(edge.factor);
      if (edge.unit === toUnit) return factor;
      visited.add(edge.unit);
      queue.push({ unit: edge.unit, factor });
    }
  }
  throw new BadRequestException(`No unit conversion is configured from ${fromUnit} to ${toUnit}.`);
}

@Injectable()
export class UnitConversionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUnitConversionsDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const rows = await this.prisma.unitConversion.findMany({
      where: { companyId: query.companyId, effectiveFrom: { lte: asOf } },
      orderBy: [{ fromUnit: 'asc' }, { toUnit: 'asc' }, { effectiveFrom: 'desc' }],
    });
    const latest = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const key = `${row.fromUnit}:${row.toUnit}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    return [...latest.values()];
  }

  async create(dto: CreateUnitConversionDto, userId: string) {
    if (dto.fromUnit === dto.toUnit) throw new BadRequestException('Source and target units must be different.');
    if (new Prisma.Decimal(dto.factor).lte(0)) throw new BadRequestException('Conversion factor must be greater than zero.');
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.unitConversion.create({ data: {
          companyId: dto.companyId,
          fromUnit: dto.fromUnit,
          toUnit: dto.toUnit,
          factor: new Prisma.Decimal(dto.factor),
          effectiveFrom,
        } });
        await tx.auditEvent.create({ data: {
          companyId: dto.companyId, userId, action: 'CREATE', resource: 'unit-conversions', resourceId: record.id,
          after: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue,
        } });
        return record;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A conversion for this unit pair and effective date already exists.');
      throw error;
    }
  }

  async convert(dto: ConvertQuantityDto) {
    const rules = await this.list({ companyId: dto.companyId, asOf: dto.asOf });
    const factor = conversionFactor(dto.fromUnit, dto.toUnit, rules);
    const converted = new Prisma.Decimal(dto.quantity).mul(factor);
    return { quantity: dto.quantity, fromUnit: dto.fromUnit, toUnit: dto.toUnit, factor: factor.toString(), convertedQuantity: converted.toString() };
  }
}
