import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { calculateProductionRecovery } from './production.calculations';
import { CreateProductionBatchDto, ListProductionBatchesDto } from './production.dto';

const batchInclude = {
  inputItem: true,
  inputStack: { include: { godown: true } },
  productionLine: { select: { id: true, name: true, code: true } },
  outputs: { include: { item: true, stack: { include: { godown: true } } } },
};

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource: 'production', action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  private belowStandard(batch: { totalRiceRecoveryPct: Prisma.Decimal; standardRecoveryPct: Prisma.Decimal | null }) {
    return batch.standardRecoveryPct !== null && batch.totalRiceRecoveryPct.lt(batch.standardRecoveryPct);
  }

  async list(query: ListProductionBatchesDto) {
    const where: Prisma.ProductionBatchWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { batchNumber: { contains: query.search, mode: 'insensitive' } },
        { inputItem: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productionBatch.findMany({
        where,
        include: batchInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.productionBatch.count({ where }),
    ]);
    const data = rows.map(row => ({ ...row, belowStandardRecovery: this.belowStandard(row) }));
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreateProductionBatchDto, userId: string) {
    const productionLineId = dto.productionLineId?.trim() || null;
    const inputQuantity = new Prisma.Decimal(dto.inputQuantityKg);
    if (!inputQuantity.isFinite() || inputQuantity.lte(0)) throw new BadRequestException('Production input quantity must be greater than zero.');
    if (new Date(dto.completedAt).getTime() < new Date(dto.startedAt).getTime()) {
      throw new BadRequestException('Production end time cannot be earlier than start time.');
    }

    const outputIds = dto.outputs.map(output => output.itemId);
    const stackIds = [...new Set([dto.inputStackId, ...dto.outputs.map(output => output.stackId)])];
    if (new Set(dto.outputs.map(output => `${output.itemId}:${output.stackId}`)).size !== dto.outputs.length) {
      throw new BadRequestException('Each output item and destination stack can only be listed once per batch.');
    }

    try {
      return await this.prisma.$transaction(async tx => {
        const [factory, inputItem, inputStack, outputItems, outputStacks, productionLine] = await Promise.all([
          tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId, active: true }, select: { id: true } }),
          tx.item.findFirst({ where: { id: dto.inputItemId, companyId: dto.companyId, active: true } }),
          tx.stack.findFirst({
            where: { id: dto.inputStackId, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { godown: { select: { active: true } } },
          }),
          tx.item.findMany({ where: { id: { in: outputIds }, companyId: dto.companyId, active: true } }),
          tx.stack.findMany({
            where: { id: { in: stackIds }, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { godown: { select: { active: true } } },
          }),
          productionLineId ? tx.productionLine.findFirst({
            where: { id: productionLineId, companyId: dto.companyId, factoryId: dto.factoryId, active: true },
            select: { id: true },
          }) : null,
        ]);
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        if (productionLineId && !productionLine) throw new BadRequestException('Select an active production line in this factory.');
        if (!inputItem || inputItem.kind !== ItemKind.PADDY || inputItem.baseUnit !== UnitOfMeasure.KG) {
          throw new BadRequestException('Production input must be an active paddy item measured in KG.');
        }
        if (!inputStack || !inputStack.godown.active) throw new BadRequestException('Select an input stack in an active godown in this factory.');
        if (outputItems.length !== new Set(outputIds).size) throw new BadRequestException('Every output item must be active and belong to this company.');
        if (outputStacks.length !== stackIds.length || outputStacks.some(stack => !stack.godown.active)) {
          throw new BadRequestException('Every output stack must belong to an active godown in this factory.');
        }

        const itemsById = new Map(outputItems.map(item => [item.id, item]));
        const outputs = dto.outputs.map(output => {
          const item = itemsById.get(output.itemId);
          if (!item || (item.kind !== ItemKind.RICE && item.kind !== ItemKind.BY_PRODUCT && item.kind !== ItemKind.OTHER) || item.baseUnit !== UnitOfMeasure.KG) {
            throw new BadRequestException('Production outputs must be active rice or by-product items measured in KG.');
          }
          return { ...output, item };
        });
        const recovery = calculateProductionRecovery(inputQuantity, outputs.map(output => ({
          kind: output.item.kind,
          riceType: output.item.riceType,
          quantityKg: output.quantityKg,
        })));
        const createdBatch = await tx.productionBatch.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            productionLineId: productionLineId ?? undefined,
            batchNumber: dto.batchNumber.trim().toUpperCase(),
            inputItemId: inputItem.id,
            inputStackId: inputStack.id,
            inputQuantityKg: recovery.inputQuantityKg,
            totalOutputKg: recovery.totalOutputKg,
            processLossKg: recovery.processLossKg,
            headRiceRecoveryPct: recovery.headRiceRecoveryPct,
            totalRiceRecoveryPct: recovery.totalRiceRecoveryPct,
            byProductRecoveryPct: recovery.byProductRecoveryPct,
            standardRecoveryPct: inputItem.standardRecovery,
            startedAt: new Date(dto.startedAt),
            completedAt: new Date(dto.completedAt),
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });
        await tx.productionOutput.createMany({
          data: outputs.map(output => ({
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            batchId: createdBatch.id,
            itemId: output.itemId,
            stackId: output.stackId,
            quantityKg: new Prisma.Decimal(output.quantityKg),
          })),
        });
        const batch = await tx.productionBatch.findUniqueOrThrow({ where: { id: createdBatch.id }, include: batchInclude });
        await this.audit(tx, dto.companyId, userId, 'CREATE', batch.id, undefined, batch);
        return { ...batch, belowStandardRecovery: this.belowStandard(batch) };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A production batch with this number or output combination already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Production data changed during creation. Refresh and retry.');
      }
      throw error;
    }
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const batch = await tx.productionBatch.findFirst({ where: { id, companyId, factoryId }, include: batchInclude });
      if (!batch) throw new NotFoundException('Production batch not found in this factory.');
      if (batch.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft production batches can be approved.');
      const changed = await tx.productionBatch.updateMany({
        where: { id, companyId, factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Production batch changed while approval was being recorded.');
      const after = await tx.productionBatch.findUniqueOrThrow({ where: { id }, include: batchInclude });
      await this.audit(tx, companyId, userId, 'APPROVE', id, batch, after);
      return { ...after, belowStandardRecovery: this.belowStandard(after) };
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const batch = await tx.productionBatch.findFirst({ where: { id, companyId, factoryId }, include: batchInclude });
        if (!batch) throw new NotFoundException('Production batch not found in this factory.');
        if (batch.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved production batches can be posted.');
        if (!batch.inputItem.active || !batch.inputStack.godown.active || batch.outputs.some(output => !output.item.active || !output.stack.godown.active)) {
          throw new BadRequestException('Production items and stacks must remain active when posting stock.');
        }

        const source = await tx.stockMovement.aggregate({
          where: { companyId, factoryId, itemId: batch.inputItemId, stackId: batch.inputStackId },
          _sum: { quantity: true },
        });
        const available = source._sum.quantity ?? new Prisma.Decimal(0);
        if (available.lt(batch.inputQuantityKg)) {
          throw new BadRequestException(`Insufficient paddy stock. Available: ${available.toFixed(3)} KG. Required: ${batch.inputQuantityKg.toFixed(3)} KG.`);
        }

        const outputByStack = new Map<string, Prisma.Decimal>();
        for (const output of batch.outputs) {
          outputByStack.set(output.stackId, (outputByStack.get(output.stackId) ?? new Prisma.Decimal(0)).plus(output.quantityKg));
        }
        const affectedStackIds = [...new Set([batch.inputStackId, ...outputByStack.keys()])];
        const occupancies = await tx.stockMovement.groupBy({
          by: ['stackId'],
          where: { companyId, factoryId, stackId: { in: affectedStackIds } },
          _sum: { quantity: true },
        });
        const occupancyByStack = new Map(occupancies.map(row => [row.stackId, row._sum.quantity ?? new Prisma.Decimal(0)]));
        const stackRows = await tx.stack.findMany({
          where: { id: { in: affectedStackIds }, companyId, factoryId },
          select: { id: true, capacityKg: true },
        });
        const capacityByStack = new Map(stackRows.map(stack => [stack.id, stack.capacityKg]));
        for (const stackId of affectedStackIds) {
          const occupancy = occupancyByStack.get(stackId) ?? new Prisma.Decimal(0);
          const afterInput = stackId === batch.inputStackId ? occupancy.minus(batch.inputQuantityKg) : occupancy;
          const afterOutput = afterInput.plus(outputByStack.get(stackId) ?? new Prisma.Decimal(0));
          const capacity = capacityByStack.get(stackId);
          if (!capacity) throw new BadRequestException('An affected stock stack is no longer available.');
          if (afterOutput.gt(capacity)) {
            throw new BadRequestException(`Insufficient stack capacity. Available: ${capacity.minus(afterInput).toFixed(3)} KG. Output: ${(outputByStack.get(stackId) ?? new Prisma.Decimal(0)).toFixed(3)} KG.`);
          }
        }

        await tx.stockMovement.createMany({
          data: [
            {
              companyId, factoryId, itemId: batch.inputItemId, stackId: batch.inputStackId,
              type: StockMovementType.PRODUCTION_IN, quantity: batch.inputQuantityKg.negated(),
              unit: UnitOfMeasure.KG, sourceType: 'PRODUCTION_INPUT', sourceId: batch.id, occurredAt: batch.completedAt,
            },
            ...batch.outputs.map(output => ({
              companyId, factoryId, itemId: output.itemId, stackId: output.stackId,
              type: StockMovementType.PRODUCTION_OUT, quantity: output.quantityKg,
              unit: UnitOfMeasure.KG, sourceType: 'PRODUCTION_OUTPUT', sourceId: output.id, occurredAt: batch.completedAt,
            })),
          ],
        });
        const changed = await tx.productionBatch.updateMany({
          where: { id, companyId, factoryId, status: DocumentStatus.APPROVED },
          data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException('Production batch changed while posting stock.');
        const after = await tx.productionBatch.findUniqueOrThrow({ where: { id }, include: batchInclude });
        await this.audit(tx, companyId, userId, 'POST', id, batch, after);
        return { ...after, belowStandardRecovery: this.belowStandard(after) };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed while production was posting. Refresh and retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Stock movements already exist for this production batch.');
      }
      throw error;
    }
  }
}
