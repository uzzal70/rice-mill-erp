import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemKind, MoistureDeductionFormula, PartnerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ListMoisturePoliciesDto, SaveMoisturePolicyDto } from './moisture-policy.dto';

@Injectable()
export class MoisturePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListMoisturePoliciesDto) {
    return this.prisma.moisturePolicy.findMany({
      where: {
        companyId: query.companyId,
        ...(query.factoryId ? { OR: [{ factoryId: query.factoryId }, { factoryId: null }] } : {}),
      },
      include: {
        factory: { select: { id: true, name: true } },
        paddyItem: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: SaveMoisturePolicyDto, userId: string) {
    return this.save(dto, userId);
  }

  async update(id: string, dto: SaveMoisturePolicyDto, userId: string) {
    return this.save(dto, userId, id);
  }

  private async save(dto: SaveMoisturePolicyDto, userId: string, id?: string) {
    const name = dto.name.trim();
    if (name.length < 2) throw new BadRequestException('Policy name must contain at least two characters.');
    const allowed = new Prisma.Decimal(dto.allowedMoisturePct);
    const tolerance = new Prisma.Decimal(dto.tolerancePct);
    const rateDeduction = new Prisma.Decimal(dto.rateDeductionPct);
    if (allowed.lt(0) || allowed.gte(100) || tolerance.lt(0) || allowed.plus(tolerance).gte(100)) {
      throw new BadRequestException('Allowed moisture plus tolerance must be less than 100%.');
    }
    if (rateDeduction.lt(0) || rateDeduction.gte(100)) {
      throw new BadRequestException('Rate deduction must be at least 0% and less than 100%.');
    }
    let previousMin = new Prisma.Decimal(-1);
    const slabs = dto.slabs ?? [];
    if (dto.formula === MoistureDeductionFormula.SLAB_PERCENTAGE && slabs.length === 0) {
      throw new BadRequestException('Add at least one slab for the slab-percentage formula.');
    }
    for (const slab of slabs) {
      const minExcess = new Prisma.Decimal(slab.minExcessPct);
      const deduction = new Prisma.Decimal(slab.deductionPct);
      if (minExcess.lt(0) || minExcess.gt(100) || deduction.lt(0) || deduction.gte(100)) {
        throw new BadRequestException('Slab thresholds must be 0–100% and slab deductions must be less than 100%.');
      }
      if (minExcess.lte(previousMin)) {
        throw new BadRequestException('Slab minimum excess thresholds must be strictly increasing.');
      }
      previousMin = minExcess;
    }
    if (slabs.length > 0 && new Prisma.Decimal(slabs[0].minExcessPct).gt(0)) {
      throw new BadRequestException('The first slab must start at 0% excess moisture.');
    }

    return this.prisma.$transaction(async tx => {
      if (id) {
        const existing = await tx.moisturePolicy.findFirst({ where: { id, companyId: dto.companyId } });
        if (!existing) throw new NotFoundException('Moisture policy not found in this company.');
      }
      if (dto.factoryId) {
        const factory = await tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId }, select: { id: true } });
        if (!factory) throw new BadRequestException('Factory must belong to the selected company.');
      }
      if (dto.paddyItemId) {
        const item = await tx.item.findFirst({
          where: { id: dto.paddyItemId, companyId: dto.companyId, active: true, kind: ItemKind.PADDY },
          select: { id: true },
        });
        if (!item) throw new BadRequestException('Select an active paddy variety belonging to this company.');
      }
      if (dto.supplierPartnerId) {
        const supplier = await tx.partner.findFirst({
          where: { id: dto.supplierPartnerId, companyId: dto.companyId, active: true, type: { in: [PartnerType.SUPPLIER, PartnerType.FARMER] } },
          select: { id: true },
        });
        if (!supplier) throw new BadRequestException('Select an active supplier or farmer belonging to this company.');
      }

      const data = {
        name,
        factoryId: dto.factoryId || null,
        paddyItemId: dto.paddyItemId || null,
        supplierPartnerId: dto.supplierPartnerId || null,
        active: dto.active,
        priority: dto.priority,
        allowedMoisturePct: allowed,
        tolerancePct: tolerance,
        formula: dto.formula,
        rateDeductionPct: rateDeduction,
        slabs: slabs.map(slab => ({
          minExcessPct: new Prisma.Decimal(slab.minExcessPct).toFixed(4),
          deductionPct: new Prisma.Decimal(slab.deductionPct).toFixed(4),
        })) as Prisma.InputJsonValue,
      };
      const before = id ? await tx.moisturePolicy.findUniqueOrThrow({ where: { id } }) : undefined;
      const policy = id
        ? await tx.moisturePolicy.update({ where: { id }, data })
        : await tx.moisturePolicy.create({ data: { ...data, companyId: dto.companyId, createdById: userId } });
      await tx.auditEvent.create({
        data: {
          companyId: dto.companyId,
          userId,
          action: id ? 'UPDATE' : 'CREATE',
          resource: 'moisture-policies',
          resourceId: policy.id,
          ...(before ? { before: JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue } : {}),
          after: JSON.parse(JSON.stringify(policy)) as Prisma.InputJsonValue,
        },
      });
      return policy;
    });
  }

  static parseSlabs(value: Prisma.JsonValue) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new ConflictException('The selected moisture policy has no valid deduction slabs.');
    }
    const slabs = value.map(entry => {
      if (entry === null || Array.isArray(entry) || typeof entry !== 'object'
        || typeof entry.minExcessPct !== 'string' || !/^\d+(\.\d{1,4})?$/.test(entry.minExcessPct)
        || typeof entry.deductionPct !== 'string' || !/^\d+(\.\d{1,4})?$/.test(entry.deductionPct)) {
        throw new ConflictException('The selected moisture policy contains an invalid deduction slab.');
      }
      return {
        minExcessPct: new Prisma.Decimal(entry.minExcessPct),
        deductionPct: new Prisma.Decimal(entry.deductionPct),
      };
    });
    if (!slabs[0].minExcessPct.eq(0)) {
      throw new ConflictException('The selected moisture policy slabs do not start at zero excess.');
    }
    for (let index = 0; index < slabs.length; index += 1) {
      const current = slabs[index];
      if (current.minExcessPct.lt(0) || current.minExcessPct.gt(100)
        || current.deductionPct.lt(0) || current.deductionPct.gte(100)
        || (index > 0 && current.minExcessPct.lte(slabs[index - 1].minExcessPct))) {
        throw new ConflictException('The selected moisture policy contains invalid or unordered slabs.');
      }
    }
    return slabs;
  }
}
