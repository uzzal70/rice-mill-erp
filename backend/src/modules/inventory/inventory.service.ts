import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { conversionFactor } from '../unit-conversions/unit-conversions.service';
import {
  CreateGodownDto,
  CreateStackDto,
  CreateStockAdjustmentDto,
  CreateStockCountDto,
  CreateStockTransferDto,
  ListByProductActivityDto,
  ListInventoryDto,
  ListPackagingStockDto,
  ListStacksDto,
  ListStockCountsDto,
  StockCountActionDto,
  ListWarehouseDto,
  UpdateStackDto,
} from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, resource: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource, action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  private async quantityAtStack(tx: Prisma.TransactionClient, companyId: string, factoryId: string, itemId: string, stackId: string) {
    const aggregate = await tx.stockMovement.aggregate({
      where: { companyId, factoryId, itemId, stackId },
      _sum: { quantity: true },
    });
    return aggregate._sum.quantity ?? new Prisma.Decimal(0);
  }

  private async stackOccupancy(tx: Prisma.TransactionClient, companyId: string, factoryId: string, stackId: string) {
    const groups = await tx.stockMovement.groupBy({
      where: { companyId, factoryId, stackId },
      by: ['unit'],
      _sum: { quantity: true },
    });
    let occupancyKg = new Prisma.Decimal(0);
    for (const group of groups) {
      const quantity = group._sum.quantity ?? new Prisma.Decimal(0);
      occupancyKg = occupancyKg.plus(await this.quantityInKg(tx, companyId, group.unit, quantity));
    }
    return occupancyKg;
  }

  private async quantityInKg(tx: Prisma.TransactionClient, companyId: string, unit: UnitOfMeasure, quantity: Prisma.Decimal) {
    if (unit === UnitOfMeasure.KG) return quantity;
    const conversions = await tx.unitConversion.findMany({
      where: { companyId, effectiveFrom: { lte: new Date() } },
      orderBy: [{ fromUnit: 'asc' }, { toUnit: 'asc' }, { effectiveFrom: 'desc' }],
    });
    const latest = new Map<string, typeof conversions[number]>();
    for (const row of conversions) {
      const key = `${row.fromUnit}:${row.toUnit}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    const factor = conversionFactor(unit, UnitOfMeasure.KG, [...latest.values()].map(row => ({
      fromUnit: row.fromUnit, toUnit: row.toUnit, factor: new Prisma.Decimal(row.factor),
    })));
    return quantity.mul(factor);
  }

  async listByProductActivity(query: ListByProductActivityDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory does not belong to this company.');
    const where: Prisma.ItemWhereInput = {
      companyId: query.companyId,
      kind: ItemKind.BY_PRODUCT,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { byProductType: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        select: { id: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);
    const movements = items.length ? await this.prisma.stockMovement.groupBy({
      by: ['itemId', 'type', 'sourceType'],
      where: {
        companyId: query.companyId,
        factoryId: query.factoryId,
        itemId: { in: items.map(item => item.id) },
      },
      _sum: { quantity: true },
    }) : [];
    const activity = new Map(items.map(item => [item.id, {
      stockKg: new Prisma.Decimal(0),
      productionKg: new Prisma.Decimal(0),
      salesKg: new Prisma.Decimal(0),
    }]));
    for (const movement of movements) {
      const totals = activity.get(movement.itemId);
      if (!totals) continue;
      const quantity = movement._sum.quantity ?? new Prisma.Decimal(0);
      totals.stockKg = totals.stockKg.plus(quantity);
      if (movement.type === 'PRODUCTION_OUT') totals.productionKg = totals.productionKg.plus(quantity);
      if (movement.sourceType === 'SALES_DISPATCH' || movement.sourceType === 'SALES_RETURN') {
        totals.salesKg = totals.salesKg.minus(quantity);
      }
    }
    const data = items.map(item => ({ itemId: item.id, ...activity.get(item.id)! }));
    return {
      success: true,
      data,
      meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async listPackagingStock(query: ListPackagingStockDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory does not belong to this company.');
    const where: Prisma.ItemWhereInput = {
      companyId: query.companyId,
      kind: ItemKind.PACKAGING,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        select: { id: true, name: true, code: true, baseUnit: true },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.item.count({ where }),
    ]);
    const balances = items.length ? await this.prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { companyId: query.companyId, factoryId: query.factoryId, itemId: { in: items.map(item => item.id) } },
      _sum: { quantity: true },
    }) : [];
    const balanceByItem = new Map(balances.map(row => [row.itemId, row._sum.quantity ?? new Prisma.Decimal(0)]));
    return {
      success: true,
      data: items.map(item => ({ ...item, stock: balanceByItem.get(item.id) ?? new Prisma.Decimal(0) })),
      meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  private stackAging(receivedAt: Date | null, capacityKg: Prisma.Decimal, onHand: Prisma.Decimal) {
    let ageDays: number | null = null;
    let agingBand: string | null = null;
    if (receivedAt) {
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const receivedUtc = Date.UTC(receivedAt.getUTCFullYear(), receivedAt.getUTCMonth(), receivedAt.getUTCDate());
      const age = Math.floor((todayUtc - receivedUtc) / 86_400_000);
      if (age >= 0) {
        ageDays = age;
        agingBand = age <= 30 ? '0_30' : age <= 60 ? '31_60' : age <= 90 ? '61_90' : '90_PLUS';
      }
    }
    const availableCapacityKg = capacityKg.minus(onHand);
    const occupancyPercent = capacityKg.gt(0)
      ? Math.min(100, Math.max(0, onHand.div(capacityKg).mul(100).toNumber()))
      : 0;
    return { onHand, availableCapacityKg, occupancyPercent, ageDays, agingBand };
  }

  private async validateStackMetadata(tx: Prisma.TransactionClient, companyId: string, materialItemId?: string | null, receivedAt?: string | null) {
    if (materialItemId) {
      const item = await tx.item.findFirst({
        where: { id: materialItemId, companyId, active: true },
        select: { id: true },
      });
      if (!item) throw new BadRequestException('Select an active material belonging to this company.');
    }
    if (receivedAt && new Date(receivedAt).getTime() > Date.now()) {
      throw new BadRequestException('Received date cannot be in the future.');
    }
  }

  async listGodowns(query: ListWarehouseDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory does not belong to this company.');
    const godowns = await this.prisma.godown.findMany({
      where: { companyId: query.companyId, factoryId: query.factoryId, ...(query.active !== undefined ? { active: query.active } : {}) },
      include: {
        stacks: {
          include: { materialItem: { select: { id: true, name: true, kind: true, variety: true, cropYear: true } } },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    const balanceByStack = await this.prisma.$transaction(async tx => new Map(await Promise.all(
      godowns.flatMap(godown => godown.stacks.map(async stack => [stack.id, await this.stackOccupancy(tx, query.companyId, query.factoryId, stack.id)] as const)),
    )));
    return godowns.map(godown => ({
      ...godown,
      stacks: godown.stacks.map(stack => {
        const onHand = balanceByStack.get(stack.id) ?? new Prisma.Decimal(0);
        return { ...stack, ...this.stackAging(stack.receivedAt, stack.capacityKg, onHand) };
      }),
    }));
  }

  async listStacks(query: ListStacksDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory does not belong to this company.');
    const stacks = await this.prisma.stack.findMany({
      where: { companyId: query.companyId, factoryId: query.factoryId, ...(query.godownId ? { godownId: query.godownId } : {}) },
      include: {
        godown: true,
        materialItem: { select: { id: true, name: true, kind: true, variety: true, cropYear: true } },
      },
      orderBy: [{ godown: { name: 'asc' } }, { code: 'asc' }],
    });
    const balanceByStack = await this.prisma.$transaction(async tx => new Map(await Promise.all(
      stacks.map(async stack => [stack.id, await this.stackOccupancy(tx, query.companyId, query.factoryId, stack.id)] as const),
    )));
    return stacks.map(stack => {
      const onHand = balanceByStack.get(stack.id) ?? new Prisma.Decimal(0);
      return { ...stack, ...this.stackAging(stack.receivedAt, stack.capacityKg, onHand) };
    });
  }

  async createGodown(dto: CreateGodownDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const factory = await tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId, active: true }, select: { id: true } });
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        const godown = await tx.godown.create({
          data: { companyId: dto.companyId, factoryId: dto.factoryId, name: dto.name.trim(), code: dto.code.trim().toUpperCase() },
        });
        await this.audit(tx, dto.companyId, userId, 'godowns', 'CREATE', godown.id, undefined, godown);
        return godown;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A godown with this code already exists in the factory.');
      }
      throw error;
    }
  }

  async createStack(dto: CreateStackDto, userId: string) {
    const capacityKg = new Prisma.Decimal(dto.capacityKg);
    if (capacityKg.lte(0)) throw new BadRequestException('Stack capacity must be greater than zero.');
    try {
      return await this.prisma.$transaction(async tx => {
        await this.validateStackMetadata(tx, dto.companyId, dto.materialItemId, dto.receivedAt);
        const godown = await tx.godown.findFirst({
          where: { id: dto.godownId, companyId: dto.companyId, factoryId: dto.factoryId, active: true },
          select: { id: true },
        });
        if (!godown) throw new BadRequestException('Select an active godown belonging to this factory.');
        const stack = await tx.stack.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            godownId: dto.godownId,
            code: dto.code.trim().toUpperCase(),
            capacityKg,
            materialItemId: dto.materialItemId ?? null,
            varietyName: dto.varietyName?.trim() || null,
            cropYear: dto.cropYear ?? null,
            batchNumber: dto.batchNumber?.trim() || null,
            lotNumber: dto.lotNumber?.trim() || null,
            receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'stacks', 'CREATE', stack.id, undefined, stack);
        return stack;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A stack with this code already exists in the godown.');
      }
      throw error;
    }
  }

  async updateStack(stackId: string, dto: UpdateStackDto, userId: string) {
    const { companyId, factoryId, capacityKg, ...fields } = dto;
    const changes = Object.keys(fields).filter(key => key !== 'companyId' && key !== 'factoryId');
    if (capacityKg !== undefined) changes.push('capacityKg');
    if (!changes.length) throw new BadRequestException('Provide at least one stack field to update.');
    try {
      return await this.prisma.$transaction(async tx => {
        const before = await tx.stack.findFirst({
          where: { id: stackId, companyId, factoryId },
          include: { godown: { select: { active: true } } },
        });
        if (!before) throw new NotFoundException('Stack does not belong to this factory.');
        if (!before.godown.active) throw new BadRequestException('Stacks in an inactive godown cannot be changed.');
        if (Object.prototype.hasOwnProperty.call(dto, 'materialItemId') || Object.prototype.hasOwnProperty.call(dto, 'receivedAt')) {
          await this.validateStackMetadata(tx, companyId, dto.materialItemId, dto.receivedAt);
        }
        const updatedCapacity = capacityKg === undefined ? before.capacityKg : new Prisma.Decimal(capacityKg);
        if (updatedCapacity.lte(0)) throw new BadRequestException('Stack capacity must be greater than zero.');
        if (capacityKg !== undefined) {
          const occupancy = await this.stackOccupancy(tx, companyId, factoryId, stackId);
          if (updatedCapacity.lt(occupancy)) {
            throw new BadRequestException(`Stack capacity cannot be less than current occupancy (${occupancy.toFixed(3)} KG).`);
          }
        }
        const data: Prisma.StackUpdateInput = {
          ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(capacityKg !== undefined ? { capacityKg: updatedCapacity } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'materialItemId') ? { materialItemId: dto.materialItemId ?? null } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'varietyName') ? { varietyName: dto.varietyName?.trim() || null } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'cropYear') ? { cropYear: dto.cropYear ?? null } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'batchNumber') ? { batchNumber: dto.batchNumber?.trim() || null } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'lotNumber') ? { lotNumber: dto.lotNumber?.trim() || null } : {}),
          ...(Object.prototype.hasOwnProperty.call(dto, 'receivedAt') ? { receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : null } : {}),
        };
        const updated = await tx.stack.update({
          where: { id: stackId },
          data,
          include: { materialItem: { select: { id: true, name: true, kind: true, variety: true, cropYear: true } } },
        });
        await this.audit(tx, companyId, userId, 'stacks', 'UPDATE', stackId, before, updated);
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A stack with this code already exists in the godown.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed during stack update. Refresh occupancy and retry.');
      }
      throw error;
    }
  }

  async listInventory(query: ListInventoryDto) {
    const where: Prisma.StockMovementWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.stackId ? { stackId: query.stackId } : {}),
    };
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.stockMovement.groupBy({
        by: ['itemId', 'stackId'],
        where,
        _sum: { quantity: true },
        orderBy: [{ itemId: 'asc' }, { stackId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS "total"
        FROM (
          SELECT "itemId", "stackId"
          FROM "StockMovement"
          WHERE "companyId" = ${query.companyId}
            AND "factoryId" = ${query.factoryId}
            AND (${query.itemId ?? null}::text IS NULL OR "itemId" = ${query.itemId ?? null})
            AND (${query.stackId ?? null}::text IS NULL OR "stackId" = ${query.stackId ?? null})
          GROUP BY "itemId", "stackId"
        ) AS balances
      `,
    ]);
    const total = Number(totalRows[0]?.total ?? 0n);
    const [items, stacks] = await Promise.all([
      pageRows.length ? this.prisma.item.findMany({ where: { id: { in: pageRows.map(row => row.itemId) }, companyId: query.companyId }, select: { id: true, code: true, name: true, kind: true, baseUnit: true, variety: true, cropYear: true } }) : [],
      pageRows.length ? this.prisma.stack.findMany({ where: { id: { in: pageRows.map(row => row.stackId).filter((id): id is string => id !== null) }, companyId: query.companyId, factoryId: query.factoryId }, include: { godown: { select: { id: true, name: true, code: true } } } }) : [],
    ]);
    const itemMap = new Map(items.map(item => [item.id, item]));
    const stackMap = new Map(stacks.map(stack => [stack.id, stack]));
    const movementGroups = pageRows.length ? await this.prisma.stockMovement.groupBy({
      by: ['itemId', 'stackId', 'type'],
      where: { companyId: query.companyId, factoryId: query.factoryId, OR: pageRows.map(row => ({ itemId: row.itemId, stackId: row.stackId })) },
      _sum: { quantity: true },
    }) : [];
    const ledgerMap = new Map<string, { opening: Prisma.Decimal; in: Prisma.Decimal; out: Prisma.Decimal }>();
    for (const movement of movementGroups) {
      const key = `${movement.itemId}:${movement.stackId ?? ''}`;
      const totals = ledgerMap.get(key) ?? { opening: new Prisma.Decimal(0), in: new Prisma.Decimal(0), out: new Prisma.Decimal(0) };
      const quantity = movement._sum.quantity ?? new Prisma.Decimal(0);
      if (movement.type === 'OPENING') totals.opening = totals.opening.plus(quantity);
      else if (quantity.gt(0)) totals.in = totals.in.plus(quantity);
      else if (quantity.lt(0)) totals.out = totals.out.plus(quantity.abs());
      ledgerMap.set(key, totals);
    }
    const data = pageRows.map(row => ({
      item: itemMap.get(row.itemId),
      stack: row.stackId ? stackMap.get(row.stackId) : null,
      ...ledgerMap.get(`${row.itemId}:${row.stackId ?? ''}`),
      onHand: row._sum.quantity ?? new Prisma.Decimal(0),
    }));
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async listTransactions(query: ListInventoryDto) {
    const where: Prisma.StockMovementWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.stackId ? { stackId: query.stackId } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: { item: true, stack: { include: { godown: true } } },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async listStockCounts(query: ListStockCountsDto) {
    const where: Prisma.StockCountWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.stackId ? { stackId: query.stackId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockCount.findMany({
        where,
        include: { item: true, stack: { include: { godown: true } } },
        orderBy: [{ countedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.stockCount.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async createStockCount(dto: CreateStockCountDto, userId: string) {
    const countedQuantity = new Prisma.Decimal(dto.countedQuantity);
    try {
      return await this.prisma.$transaction(async tx => {
      const [item, stack] = await Promise.all([
        tx.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId, active: true }, select: { id: true, baseUnit: true } }),
        tx.stack.findFirst({ where: { id: dto.stackId, companyId: dto.companyId, factoryId: dto.factoryId }, include: { godown: { select: { active: true } } } }),
      ]);
      if (!item) throw new BadRequestException('Item does not belong to this company or is inactive.');
      if (!stack || !stack.godown.active) throw new BadRequestException('Stack does not belong to an active godown in this factory.');
      const bookQuantity = await this.quantityAtStack(tx, dto.companyId, dto.factoryId, item.id, stack.id);
      const adjustmentQuantity = countedQuantity.minus(bookQuantity);
      const count = await tx.stockCount.create({ data: {
        companyId: dto.companyId, factoryId: dto.factoryId, countNumber: dto.countNumber.trim().toUpperCase(),
        itemId: item.id, stackId: stack.id, bookQuantity, countedQuantity, adjustmentQuantity,
        unit: item.baseUnit, reason: dto.reason.trim(), createdById: userId,
      } });
      await this.audit(tx, dto.companyId, userId, 'stock-counts', 'CREATE', count.id, undefined, count);
      return count;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('This stock-count number is already used in the company.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Stock changed while the count was being recorded. Refresh and retry.');
      throw error;
    }
  }

  async postStockCount(id: string, dto: StockCountActionDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const count = await tx.stockCount.findFirst({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId }, include: { stack: { include: { godown: true } } } });
        if (!count) throw new NotFoundException('Stock count not found in this factory.');
        if (count.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft stock counts can be posted.');
        if (!count.stack.godown.active) throw new BadRequestException('Stock count cannot be posted for an inactive godown.');
        const item = await tx.item.findFirst({ where: { id: count.itemId, companyId: dto.companyId, active: true }, select: { baseUnit: true } });
        if (!item) throw new BadRequestException('Stock count item is no longer active.');
        const currentBalance = await this.quantityAtStack(tx, dto.companyId, dto.factoryId, count.itemId, count.stackId);
        if (!currentBalance.equals(count.bookQuantity)) throw new ConflictException('Stock changed after this count was recorded. Create a new count before reconciling.');
        if (count.adjustmentQuantity.gt(0)) {
          const occupancy = await this.stackOccupancy(tx, dto.companyId, dto.factoryId, count.stackId);
          const deltaKg = await this.quantityInKg(tx, dto.companyId, item.baseUnit, count.adjustmentQuantity);
          if (occupancy.plus(deltaKg).gt(count.stack.capacityKg)) throw new BadRequestException('Stock-count reconciliation exceeds the stack capacity.');
        }
        if (!count.adjustmentQuantity.isZero()) {
          await tx.stockMovement.create({ data: {
            companyId: dto.companyId, factoryId: dto.factoryId, itemId: count.itemId, stackId: count.stackId,
            type: 'ADJUSTMENT', quantity: count.adjustmentQuantity, unit: count.unit,
            sourceType: 'STOCK_COUNT', sourceId: count.id,
          } });
        }
        const changed = await tx.stockCount.updateMany({
          where: { id: count.id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.DRAFT },
          data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException('Stock count changed while posting.');
        const after = await tx.stockCount.findUniqueOrThrow({ where: { id: count.id } });
        await this.audit(tx, dto.companyId, userId, 'stock-counts', 'POST', count.id, count, after);
        return after;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Stock changed during count reconciliation. Refresh and retry.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('This count number is already used in the company.');
      throw error;
    }
  }

  async createTransfer(dto: CreateStockTransferDto, userId: string) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.lte(0)) throw new BadRequestException('Transfer quantity must be greater than zero.');
    if (dto.sourceStackId === dto.destinationStackId) throw new BadRequestException('Source and destination stacks must be different.');
    try {
      return await this.prisma.$transaction(async tx => {
        const [item, source, destination] = await Promise.all([
          tx.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId, active: true }, select: { id: true, kind: true, baseUnit: true } }),
          tx.stack.findFirst({ where: { id: dto.sourceStackId, companyId: dto.companyId, factoryId: dto.factoryId }, include: { godown: { select: { active: true } } } }),
          tx.stack.findFirst({ where: { id: dto.destinationStackId, companyId: dto.companyId, factoryId: dto.factoryId }, include: { godown: { select: { active: true } } } }),
        ]);
        if (!item) throw new BadRequestException('Item does not belong to this company or is inactive.');
        if (!source || !source.godown.active || !destination || !destination.godown.active) {
          throw new BadRequestException('Source and destination must be active stacks in this factory.');
        }
        const [available, destinationOccupancy] = await Promise.all([
          this.quantityAtStack(tx, dto.companyId, dto.factoryId, dto.itemId, source.id),
          this.stackOccupancy(tx, dto.companyId, dto.factoryId, destination.id),
        ]);
        if (available.lt(quantity)) throw new BadRequestException(`Insufficient stock. Available: ${available.toFixed(3)} KG. Requested: ${quantity.toFixed(3)} KG.`);
        const quantityKg = await this.quantityInKg(tx, dto.companyId, item.baseUnit, quantity);
        const availableCapacity = destination.capacityKg.minus(destinationOccupancy);
        if (availableCapacity.lt(quantityKg)) throw new BadRequestException(`Insufficient destination capacity. Available: ${availableCapacity.toFixed(3)} KG. Requested: ${quantityKg.toFixed(3)} KG.`);
        const transfer = await tx.stockTransfer.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            transferNumber: dto.transferNumber.trim().toUpperCase(),
            itemId: dto.itemId,
            sourceStackId: source.id,
            destinationStackId: destination.id,
            quantity,
            reason: dto.reason?.trim() || null,
            createdById: userId,
          },
        });
        await tx.stockMovement.createMany({
          data: [
            { companyId: dto.companyId, factoryId: dto.factoryId, itemId: dto.itemId, stackId: source.id, type: 'TRANSFER_OUT', quantity: quantity.negated(), unit: item.baseUnit, sourceType: 'STOCK_TRANSFER', sourceId: transfer.id },
            { companyId: dto.companyId, factoryId: dto.factoryId, itemId: dto.itemId, stackId: destination.id, type: 'TRANSFER_IN', quantity, unit: item.baseUnit, sourceType: 'STOCK_TRANSFER', sourceId: transfer.id },
          ],
        });
        await this.audit(tx, dto.companyId, userId, 'inventory', 'TRANSFER', transfer.id, undefined, transfer);
        return transfer;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A stock transfer with this number already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed during transfer. Refresh the stock balance and retry.');
      }
      throw error;
    }
  }

  async createAdjustment(dto: CreateStockAdjustmentDto, userId: string) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.isZero()) throw new BadRequestException('Adjustment quantity cannot be zero.');
    try {
      return await this.prisma.$transaction(async tx => {
        const [item, stack] = await Promise.all([
          tx.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId, active: true }, select: { id: true, kind: true, baseUnit: true } }),
          tx.stack.findFirst({ where: { id: dto.stackId, companyId: dto.companyId, factoryId: dto.factoryId }, include: { godown: { select: { active: true } } } }),
        ]);
        if (!item) throw new BadRequestException('Item does not belong to this company or is inactive.');
        if (!stack || !stack.godown.active) throw new BadRequestException('Stack does not belong to an active godown in this factory.');
        const [balance, occupancy] = await Promise.all([
          this.quantityAtStack(tx, dto.companyId, dto.factoryId, dto.itemId, stack.id),
          this.stackOccupancy(tx, dto.companyId, dto.factoryId, stack.id),
        ]);
        const nextBalance = balance.plus(quantity);
        if (nextBalance.lt(0)) throw new BadRequestException(`Adjustment would create negative stock. Available: ${balance.toFixed(3)} KG.`);
        const quantityKg = quantity.gt(0)
          ? await this.quantityInKg(tx, dto.companyId, item.baseUnit, quantity)
          : new Prisma.Decimal(0);
        if (quantity.gt(0) && occupancy.plus(quantityKg).gt(stack.capacityKg)) {
          throw new BadRequestException(`Adjustment exceeds stack capacity. Available capacity: ${stack.capacityKg.minus(occupancy).toFixed(3)} KG.`);
        }
        const adjustment = await tx.stockAdjustment.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            adjustmentNumber: dto.adjustmentNumber.trim().toUpperCase(),
            itemId: dto.itemId,
            stackId: stack.id,
            quantity,
            reason: dto.reason.trim(),
            createdById: userId,
          },
        });
        await tx.stockMovement.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            itemId: dto.itemId,
            stackId: stack.id,
            type: 'ADJUSTMENT',
            quantity,
            unit: item.baseUnit,
            sourceType: 'STOCK_ADJUSTMENT',
            sourceId: adjustment.id,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'inventory', 'ADJUSTMENT', adjustment.id, { balance }, { adjustment, balance: nextBalance });
        return adjustment;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A stock adjustment with this number already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed during adjustment. Refresh the stock balance and retry.');
      }
      throw error;
    }
  }
}
