import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateDryingBatchDto, ListDryingBatchesDto } from './drying.dto';

const dryingInclude = {
  item: true,
  sourceStack: { include: { godown: true } },
  destinationStack: { include: { godown: true } },
} satisfies Prisma.DryingBatchInclude;

@Injectable()
export class DryingService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource: 'drying', action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  async list(query: ListDryingBatchesDto) {
    const where: Prisma.DryingBatchWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { batchNumber: { contains: query.search, mode: 'insensitive' } },
        { item: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dryingBatch.findMany({
        where,
        include: dryingInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.dryingBatch.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreateDryingBatchDto, userId: string) {
    const input = new Prisma.Decimal(dto.inputQuantityKg);
    const output = new Prisma.Decimal(dto.outputQuantityKg);
    if (!input.isFinite() || input.lte(0)) throw new BadRequestException('Drying input quantity must be greater than zero.');
    if (!output.isFinite() || output.lte(0) || output.gt(input)) throw new BadRequestException('Drying output must be greater than zero and cannot exceed input quantity.');
    if (dto.moistureAfterPct > dto.moistureBeforePct) throw new BadRequestException('Moisture after drying cannot exceed moisture before drying.');
    if (new Date(dto.completedAt).getTime() < new Date(dto.startedAt).getTime()) {
      throw new BadRequestException('Drying end time cannot be earlier than start time.');
    }

    try {
      return await this.prisma.$transaction(async tx => {
        const [factory, item, stacks] = await Promise.all([
          tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId, active: true }, select: { id: true } }),
          tx.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId, active: true } }),
          tx.stack.findMany({
            where: { id: { in: [...new Set([dto.sourceStackId, dto.destinationStackId])] }, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { godown: { select: { active: true } } },
          }),
        ]);
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        if (!item || item.kind !== ItemKind.PADDY || item.baseUnit !== UnitOfMeasure.KG) {
          throw new BadRequestException('Drying requires an active paddy item measured in KG.');
        }
        if (stacks.length !== new Set([dto.sourceStackId, dto.destinationStackId]).size || stacks.some(stack => !stack.godown.active)) {
          throw new BadRequestException('Select source and destination stacks in active godowns belonging to this factory.');
        }
        const batch = await tx.dryingBatch.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            batchNumber: dto.batchNumber.trim().toUpperCase(),
            itemId: item.id,
            sourceStackId: dto.sourceStackId,
            destinationStackId: dto.destinationStackId,
            inputQuantityKg: input,
            outputQuantityKg: output,
            lossKg: input.minus(output),
            moistureBeforePct: new Prisma.Decimal(dto.moistureBeforePct),
            moistureAfterPct: new Prisma.Decimal(dto.moistureAfterPct),
            dryingMethod: dto.dryingMethod.trim(),
            durationMinutes: dto.durationMinutes,
            fuelQuantity: dto.fuelQuantity === undefined ? undefined : new Prisma.Decimal(dto.fuelQuantity),
            electricityKwh: dto.electricityKwh === undefined ? undefined : new Prisma.Decimal(dto.electricityKwh),
            labourCost: dto.labourCost === undefined ? undefined : new Prisma.Decimal(dto.labourCost),
            startedAt: new Date(dto.startedAt),
            completedAt: new Date(dto.completedAt),
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
          include: dryingInclude,
        });
        await this.audit(tx, dto.companyId, userId, 'CREATE', batch.id, undefined, batch);
        return batch;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A drying batch with this number already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Drying data changed during creation. Refresh and retry.');
      }
      throw error;
    }
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const batch = await tx.dryingBatch.findFirst({ where: { id, companyId, factoryId }, include: dryingInclude });
      if (!batch) throw new NotFoundException('Drying batch not found in this factory.');
      if (batch.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft drying batches can be approved.');
      const changed = await tx.dryingBatch.updateMany({
        where: { id, companyId, factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Drying batch changed while approval was being recorded.');
      const after = await tx.dryingBatch.findUniqueOrThrow({ where: { id }, include: dryingInclude });
      await this.audit(tx, companyId, userId, 'APPROVE', id, batch, after);
      return after;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const batch = await tx.dryingBatch.findFirst({ where: { id, companyId, factoryId }, include: dryingInclude });
        if (!batch) throw new NotFoundException('Drying batch not found in this factory.');
        if (batch.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved drying batches can be posted.');
        if (!batch.item.active || !batch.sourceStack.godown.active || !batch.destinationStack.godown.active) {
          throw new BadRequestException('The paddy item and drying stacks must remain active when posting stock.');
        }

        const source = await tx.stockMovement.aggregate({
          where: { companyId, factoryId, itemId: batch.itemId, stackId: batch.sourceStackId },
          _sum: { quantity: true },
        });
        const available = source._sum.quantity ?? new Prisma.Decimal(0);
        if (available.lt(batch.inputQuantityKg)) {
          throw new BadRequestException(`Insufficient paddy stock. Available: ${available.toFixed(3)} KG. Required: ${batch.inputQuantityKg.toFixed(3)} KG.`);
        }

        const stackIds = [...new Set([batch.sourceStackId, batch.destinationStackId])];
        const [occupancies, stacks] = await Promise.all([
          tx.stockMovement.groupBy({
            by: ['stackId'],
            where: { companyId, factoryId, stackId: { in: stackIds } },
            _sum: { quantity: true },
          }),
          tx.stack.findMany({
            where: { id: { in: stackIds }, companyId, factoryId },
            select: { id: true, capacityKg: true },
          }),
        ]);
        const occupancyByStack = new Map(occupancies.map(row => [row.stackId, row._sum.quantity ?? new Prisma.Decimal(0)]));
        const capacityByStack = new Map(stacks.map(stack => [stack.id, stack.capacityKg]));
        for (const stackId of stackIds) {
          const occupancy = occupancyByStack.get(stackId) ?? new Prisma.Decimal(0);
          const afterInput = stackId === batch.sourceStackId ? occupancy.minus(batch.inputQuantityKg) : occupancy;
          const afterOutput = afterInput.plus(stackId === batch.destinationStackId ? batch.outputQuantityKg : new Prisma.Decimal(0));
          const capacity = capacityByStack.get(stackId);
          if (!capacity) throw new BadRequestException('A drying stack is no longer available.');
          if (afterOutput.gt(capacity)) {
            throw new BadRequestException(`Insufficient drying stack capacity. Available: ${capacity.minus(afterInput).toFixed(3)} KG. Output: ${stackId === batch.destinationStackId ? batch.outputQuantityKg.toFixed(3) : '0.000'} KG.`);
          }
        }

        await tx.stockMovement.createMany({
          data: [
            {
              companyId, factoryId, itemId: batch.itemId, stackId: batch.sourceStackId,
              type: StockMovementType.PRODUCTION_IN, quantity: batch.inputQuantityKg.negated(),
              unit: UnitOfMeasure.KG, sourceType: 'DRYING_INPUT', sourceId: batch.id, occurredAt: batch.completedAt,
            },
            {
              companyId, factoryId, itemId: batch.itemId, stackId: batch.destinationStackId,
              type: StockMovementType.PRODUCTION_OUT, quantity: batch.outputQuantityKg,
              unit: UnitOfMeasure.KG, sourceType: 'DRYING_OUTPUT', sourceId: batch.id, occurredAt: batch.completedAt,
            },
          ],
        });
        const changed = await tx.dryingBatch.updateMany({
          where: { id, companyId, factoryId, status: DocumentStatus.APPROVED },
          data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException('Drying batch changed while stock was being posted.');
        const after = await tx.dryingBatch.findUniqueOrThrow({ where: { id }, include: dryingInclude });
        await this.audit(tx, companyId, userId, 'POST', id, batch, after);
        return after;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed while drying was posting. Refresh and retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Stock movements already exist for this drying batch.');
      }
      throw error;
    }
  }
}
