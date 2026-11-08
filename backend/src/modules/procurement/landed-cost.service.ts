import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { conversionFactor } from '../unit-conversions/unit-conversions.service';
import { CreateLandedCostConfigDto, CreateLandedCostDto, ListLandedCostsDto } from './landed-cost.dto';

@Injectable()
export class LandedCostService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({ data: { companyId, userId, resource: 'landed-cost', action, resourceId: id, ...(before ? { before: json(before) } : {}), after: json(after) } });
  }

  async listConfigs(companyId: string, factoryId: string) {
    const factory = await this.prisma.factory.findFirst({ where: { id: factoryId, companyId, active: true }, select: { id: true } });
    if (!factory) throw new NotFoundException('Factory not found in this company.');
    return this.prisma.landedCostComponentConfig.findMany({
      where: { companyId, isActive: true, OR: [{ factoryId: null }, { factoryId }] },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createConfig(dto: CreateLandedCostConfigDto, userId: string) {
    if (dto.factoryId) {
      const factory = await this.prisma.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId } });
      if (!factory) throw new NotFoundException('Factory not found in this company.');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const config = await tx.landedCostComponentConfig.create({ data: {
          companyId: dto.companyId, factoryId: dto.factoryId ?? null, name: dto.name.trim(), code: dto.code.trim(),
          type: dto.type, isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0,
        } });
        await this.audit(tx, dto.companyId, userId, 'COMPONENT_CREATE', config.id, undefined, config);
        return config;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A landed-cost component with this code already exists in the company.');
      throw error;
    }
  }

  async list(query: ListLandedCostsDto) {
    const where: Prisma.LandedCostWhereInput = {
      companyId: query.companyId, factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { goodsReceipt: { receiptNumber: { contains: query.search, mode: 'insensitive' } } },
        { purchaseOrder: { supplier: { name: { contains: query.search, mode: 'insensitive' } } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.landedCost.findMany({ where, include: { goodsReceipt: true, purchaseOrder: { include: { supplier: true, item: true } }, purchaseInvoice: true }, orderBy: { calculatedAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.landedCost.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreateLandedCostDto, userId: string) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id: dto.goodsReceiptId, companyId: dto.companyId, factoryId: dto.factoryId },
      include: { purchaseOrder: true, purchaseInvoice: true, landedCost: true },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found in this factory.');
    if (receipt.status !== DocumentStatus.POSTED) throw new ConflictException('Landed cost can only be calculated from a posted goods receipt.');
    if (receipt.landedCost) throw new ConflictException('Landed cost has already been recorded for this goods receipt.');
    const configs = await this.listConfigs(dto.companyId, dto.factoryId);
    const configByCode = new Map(configs.map(c => [c.code, c]));
    const codes = new Set<string>();
    const componentValues = dto.components.map(c => {
      if (codes.has(c.code)) throw new BadRequestException(`Duplicate landed-cost component: ${c.code}.`);
      codes.add(c.code);
      const config = configByCode.get(c.code);
      if (!config || config.name !== c.name || config.type !== c.type) throw new BadRequestException(`Component ${c.code} is not an active configured component for this factory.`);
      const amount = new Prisma.Decimal(c.amount);
      return { ...c, amount, config };
    });
    for (const config of configs.filter(c => c.isRequired)) {
      if (!codes.has(config.code)) throw new BadRequestException(`Required landed-cost component ${config.name} is missing.`);
    }
    if (new Set(configs.map(c => c.code)).size !== configs.length) throw new ConflictException('Company and factory component configuration contains duplicate codes.');

    const zero = new Prisma.Decimal(0);
    const sumType = (type: string) => componentValues.filter(c => c.type === type).reduce((sum, c) => sum.plus(c.amount), zero).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const quantityKg = new Prisma.Decimal(receipt.quantity);
    const purchaseCost = receipt.purchaseInvoice?.status === DocumentStatus.POSTED
      ? receipt.purchaseInvoice.grossAmount
      : quantityKg.mul(receipt.purchaseOrder.adjustedUnitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const transport = sumType('TRANSPORT');
    const loading = sumType('LOADING');
    const unloading = sumType('UNLOADING');
    const commission = sumType('COMMISSION');
    const drying = sumType('DRYING');
    const other = sumType('OTHER_DIRECT');
    const totalAdditionalCost = componentValues.reduce((sum, c) => sum.plus(c.amount), zero).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const landedCostTotal = purchaseCost.plus(totalAdditionalCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (quantityKg.lte(0)) throw new BadRequestException('Posted receipt quantity must be greater than zero.');
    const landedCostPerKg = landedCostTotal.div(quantityKg).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
    const rules = await this.prisma.unitConversion.findMany({ where: { companyId: dto.companyId, effectiveFrom: { lte: receipt.postedAt ?? new Date() } }, orderBy: [{ fromUnit: 'asc' }, { toUnit: 'asc' }, { effectiveFrom: 'desc' }] });
    const latest = new Map<string, typeof rules[number]>();
    for (const rule of rules) { const key = `${rule.fromUnit}:${rule.toUnit}`; if (!latest.has(key)) latest.set(key, rule); }
    const conversionRules = [...latest.values()].map(r => ({ fromUnit: r.fromUnit, toUnit: r.toUnit, factor: new Prisma.Decimal(r.factor) }));
    const kgPerMon = conversionFactor(UnitOfMeasure.MON, UnitOfMeasure.KG, conversionRules);
    const kgPerTon = conversionFactor(UnitOfMeasure.TON, UnitOfMeasure.KG, conversionRules);
    const componentSnapshot = componentValues.map(c => ({ code: c.code, name: c.name, type: c.type, amount: c.amount.toFixed(2) }));

    try {
      return await this.prisma.$transaction(async tx => {
        const row = await tx.landedCost.create({ data: {
          companyId: dto.companyId, factoryId: dto.factoryId, goodsReceiptId: receipt.id,
          purchaseOrderId: receipt.purchaseOrderId, purchaseInvoiceId: receipt.purchaseInvoice?.id ?? null,
          quantityKg, purchaseCost, transportCost: transport, loadingCost: loading, unloadingCost: unloading,
          commissionCost: commission, dryingCost: drying, otherDirectCost: other,
          totalAdditionalCost, landedCostTotal, landedCostPerKg,
          landedCostPerMon: landedCostPerKg.mul(kgPerMon).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
          landedCostPerTon: landedCostPerKg.mul(kgPerTon).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
          components: componentSnapshot, calculatedById: userId, remarks: dto.remarks?.trim() || null,
        } });
        await this.audit(tx, dto.companyId, userId, 'CREATE', row.id, undefined, row);
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) throw new ConflictException('A landed cost was recorded concurrently for this receipt. Refresh and retry.');
      throw error;
    }
  }

  async transition(id: string, dto: { companyId: string; factoryId: string }, userId: string, action: 'approve' | 'post') {
    return this.prisma.$transaction(async tx => {
      const row = await tx.landedCost.findFirst({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId } });
      if (!row) throw new NotFoundException('Landed cost not found in this factory.');
      const from = action === 'approve' ? DocumentStatus.DRAFT : DocumentStatus.APPROVED;
      const to = action === 'approve' ? DocumentStatus.APPROVED : DocumentStatus.POSTED;
      if (row.status !== from) throw new ConflictException(`Only ${from.toLowerCase()} landed costs can be ${action === 'approve' ? 'approved' : 'posted'}.`);
      const now = new Date();
      const result = await tx.landedCost.updateMany({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: from }, data: action === 'approve' ? { status: to, approvedById: userId, approvedAt: now } : { status: to, postedById: userId, postedAt: now } });
      if (result.count !== 1) throw new ConflictException('Landed-cost record changed while the action was being recorded.');
      const after = await tx.landedCost.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, dto.companyId, userId, action.toUpperCase(), id, row, after);
      return after;
    });
  }
}
