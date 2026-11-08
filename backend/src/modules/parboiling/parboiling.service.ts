import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, ParboilingStageType, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateParboilingBatchDto, ListParboilingBatchesDto } from './parboiling.dto';

const parboilingInclude = {
  inputItem: true,
  outputItem: true,
  inputStack: { include: { godown: true } },
  outputStack: { include: { godown: true } },
  stages: { orderBy: { sequence: 'asc' as const } },
} satisfies Prisma.ParboilingBatchInclude;

const requiredStages = [ParboilingStageType.SOAKING, ParboilingStageType.STEAMING, ParboilingStageType.DRYING];

@Injectable()
export class ParboilingService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource: 'parboiling', action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  async list(query: ListParboilingBatchesDto) {
    const where: Prisma.ParboilingBatchWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { batchNumber: { contains: query.search, mode: 'insensitive' } },
        { inputItem: { name: { contains: query.search, mode: 'insensitive' } } },
        { outputItem: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.parboilingBatch.findMany({
        where,
        include: parboilingInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.parboilingBatch.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreateParboilingBatchDto, userId: string) {
    const input = new Prisma.Decimal(dto.inputQuantityKg);
    const output = new Prisma.Decimal(dto.outputQuantityKg);
    const startedAt = new Date(dto.startedAt);
    const completedAt = new Date(dto.completedAt);
    if (!input.isFinite() || input.lte(0)) throw new BadRequestException('Parboiling input quantity must be greater than zero.');
    if (!output.isFinite() || output.lte(0) || output.gt(input)) {
      throw new BadRequestException('Parboiling output must be greater than zero and cannot exceed input quantity.');
    }
    if (completedAt.getTime() < startedAt.getTime()) throw new BadRequestException('Parboiling end time cannot be earlier than start time.');
    if (dto.stages.length !== requiredStages.length || dto.stages.some((stage, index) => stage.stageType !== requiredStages[index])) {
      throw new BadRequestException('Parboiling requires stages in this order: soaking, steaming, and drying.');
    }

    let previousStageEnd: Date | null = null;
    const stages = dto.stages.map((stage, index) => {
      const stageStart = new Date(stage.startedAt);
      const stageEnd = new Date(stage.completedAt);
      const stageInput = new Prisma.Decimal(stage.inputQuantityKg);
      const stageOutput = new Prisma.Decimal(stage.outputQuantityKg);
      if (!stageInput.isFinite() || stageInput.lte(0) || !stageOutput.isFinite() || stageOutput.lte(0)) {
        throw new BadRequestException('Every parboiling stage must record positive input and output weights.');
      }
      if (stageEnd.getTime() < stageStart.getTime() || stageStart < startedAt || stageEnd > completedAt) {
        throw new BadRequestException('Each parboiling stage must have valid times within the batch time range.');
      }
      if (previousStageEnd && stageStart < previousStageEnd) {
        throw new BadRequestException('Parboiling stages cannot overlap or be recorded out of time order.');
      }
      if (stage.stageType === ParboilingStageType.DRYING && stage.moistureAfterPct > stage.moistureBeforePct) {
        throw new BadRequestException('Moisture after the parboiling drying stage cannot exceed moisture before drying.');
      }
      previousStageEnd = stageEnd;
      return { ...stage, stageStart, stageEnd, stageInput, stageOutput, sequence: index + 1 };
    });

    if (!stages[0].stageInput.eq(input)) throw new BadRequestException('Soaking input weight must match batch input weight.');
    if (!stages[0].stageOutput.eq(stages[1].stageInput) || !stages[1].stageOutput.eq(stages[2].stageInput)) {
      throw new BadRequestException('Stage weights must reconcile: each stage output must match the next stage input.');
    }
    if (!stages[2].stageOutput.eq(output)) throw new BadRequestException('Final drying output weight must match parboiling batch output weight.');

    try {
      return await this.prisma.$transaction(async tx => {
        const [factory, items, stacks] = await Promise.all([
          tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId, active: true }, select: { id: true } }),
          tx.item.findMany({
            where: { id: { in: [...new Set([dto.inputItemId, dto.outputItemId])] }, companyId: dto.companyId, active: true },
          }),
          tx.stack.findMany({
            where: { id: { in: [...new Set([dto.inputStackId, dto.outputStackId])] }, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { godown: { select: { active: true } } },
          }),
        ]);
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        const itemsById = new Map(items.map(item => [item.id, item]));
        const inputItem = itemsById.get(dto.inputItemId);
        const outputItem = itemsById.get(dto.outputItemId);
        if (!inputItem || inputItem.kind !== ItemKind.PADDY || inputItem.baseUnit !== UnitOfMeasure.KG) {
          throw new BadRequestException('Parboiling input must be an active paddy item measured in KG.');
        }
        if (!outputItem || outputItem.kind !== ItemKind.PADDY || outputItem.baseUnit !== UnitOfMeasure.KG) {
          throw new BadRequestException('Parboiling output must be an active paddy item measured in KG.');
        }
        if (stacks.length !== new Set([dto.inputStackId, dto.outputStackId]).size || stacks.some(stack => !stack.godown.active)) {
          throw new BadRequestException('Select input and output stacks in active godowns belonging to this factory.');
        }

        const batch = await tx.parboilingBatch.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            batchNumber: dto.batchNumber.trim().toUpperCase(),
            inputItemId: inputItem.id,
            outputItemId: outputItem.id,
            inputStackId: dto.inputStackId,
            outputStackId: dto.outputStackId,
            inputQuantityKg: input,
            outputQuantityKg: output,
            processLossKg: input.minus(output),
            startedAt,
            completedAt,
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });
        await tx.parboilingStage.createMany({
          data: stages.map(stage => ({
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            batchId: batch.id,
            stageType: stage.stageType,
            sequence: stage.sequence,
            startedAt: stage.stageStart,
            completedAt: stage.stageEnd,
            inputQuantityKg: stage.stageInput,
            outputQuantityKg: stage.stageOutput,
            moistureBeforePct: new Prisma.Decimal(stage.moistureBeforePct),
            moistureAfterPct: new Prisma.Decimal(stage.moistureAfterPct),
            waterQuantity: stage.waterQuantity === undefined ? null : new Prisma.Decimal(stage.waterQuantity),
            temperatureC: stage.temperatureC === undefined ? null : new Prisma.Decimal(stage.temperatureC),
            pressureBar: stage.pressureBar === undefined ? null : new Prisma.Decimal(stage.pressureBar),
            fuelQuantity: stage.fuelQuantity === undefined ? null : new Prisma.Decimal(stage.fuelQuantity),
            electricityKwh: stage.electricityKwh === undefined ? null : new Prisma.Decimal(stage.electricityKwh),
            labourCost: stage.labourCost === undefined ? null : new Prisma.Decimal(stage.labourCost),
            remarks: stage.remarks?.trim() || null,
          })),
        });
        const created = await tx.parboilingBatch.findUniqueOrThrow({ where: { id: batch.id }, include: parboilingInclude });
        await this.audit(tx, dto.companyId, userId, 'CREATE', batch.id, undefined, created);
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A parboiling batch with this number already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Parboiling data changed during creation. Refresh and retry.');
      }
      throw error;
    }
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const batch = await tx.parboilingBatch.findFirst({ where: { id, companyId, factoryId }, include: parboilingInclude });
      if (!batch) throw new NotFoundException('Parboiling batch not found in this factory.');
      if (batch.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft parboiling batches can be approved.');
      const changed = await tx.parboilingBatch.updateMany({
        where: { id, companyId, factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Parboiling batch changed while approval was being recorded.');
      const after = await tx.parboilingBatch.findUniqueOrThrow({ where: { id }, include: parboilingInclude });
      await this.audit(tx, companyId, userId, 'APPROVE', id, batch, after);
      return after;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const batch = await tx.parboilingBatch.findFirst({ where: { id, companyId, factoryId }, include: parboilingInclude });
        if (!batch) throw new NotFoundException('Parboiling batch not found in this factory.');
        if (batch.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved parboiling batches can be posted.');
        if (!batch.inputItem.active || !batch.outputItem.active || !batch.inputStack.godown.active || !batch.outputStack.godown.active) {
          throw new BadRequestException('Parboiling items and stacks must remain active when posting stock.');
        }

        const source = await tx.stockMovement.aggregate({
          where: { companyId, factoryId, itemId: batch.inputItemId, stackId: batch.inputStackId },
          _sum: { quantity: true },
        });
        const available = source._sum.quantity ?? new Prisma.Decimal(0);
        if (available.lt(batch.inputQuantityKg)) {
          throw new BadRequestException(`Insufficient paddy stock. Available: ${available.toFixed(3)} KG. Required: ${batch.inputQuantityKg.toFixed(3)} KG.`);
        }

        const stackIds = [...new Set([batch.inputStackId, batch.outputStackId])];
        const [occupancies, stacks] = await Promise.all([
          tx.stockMovement.groupBy({
            by: ['stackId'],
            where: { companyId, factoryId, stackId: { in: stackIds } },
            _sum: { quantity: true },
          }),
          tx.stack.findMany({ where: { id: { in: stackIds }, companyId, factoryId }, select: { id: true, capacityKg: true } }),
        ]);
        const occupancyByStack = new Map(occupancies.map(row => [row.stackId, row._sum.quantity ?? new Prisma.Decimal(0)]));
        const capacityByStack = new Map(stacks.map(stack => [stack.id, stack.capacityKg]));
        for (const stackId of stackIds) {
          const occupancy = occupancyByStack.get(stackId) ?? new Prisma.Decimal(0);
          const afterInput = stackId === batch.inputStackId ? occupancy.minus(batch.inputQuantityKg) : occupancy;
          const afterOutput = afterInput.plus(stackId === batch.outputStackId ? batch.outputQuantityKg : new Prisma.Decimal(0));
          const capacity = capacityByStack.get(stackId);
          if (!capacity) throw new BadRequestException('A parboiling stock stack is no longer available.');
          if (afterOutput.gt(capacity)) {
            const outputKg = stackId === batch.outputStackId ? batch.outputQuantityKg : new Prisma.Decimal(0);
            throw new BadRequestException(`Insufficient stack capacity. Available: ${capacity.minus(afterInput).toFixed(3)} KG. Output: ${outputKg.toFixed(3)} KG.`);
          }
        }

        await tx.stockMovement.createMany({
          data: [
            {
              companyId, factoryId, itemId: batch.inputItemId, stackId: batch.inputStackId,
              type: StockMovementType.PRODUCTION_IN, quantity: batch.inputQuantityKg.negated(),
              unit: UnitOfMeasure.KG, sourceType: 'PARBOILING_INPUT', sourceId: batch.id, occurredAt: batch.completedAt,
            },
            {
              companyId, factoryId, itemId: batch.outputItemId, stackId: batch.outputStackId,
              type: StockMovementType.PRODUCTION_OUT, quantity: batch.outputQuantityKg,
              unit: UnitOfMeasure.KG, sourceType: 'PARBOILING_OUTPUT', sourceId: batch.id, occurredAt: batch.completedAt,
            },
          ],
        });
        const changed = await tx.parboilingBatch.updateMany({
          where: { id, companyId, factoryId, status: DocumentStatus.APPROVED },
          data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException('Parboiling batch changed while stock was being posted.');
        const after = await tx.parboilingBatch.findUniqueOrThrow({ where: { id }, include: parboilingInclude });
        await this.audit(tx, companyId, userId, 'POST', id, batch, after);
        return after;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed while parboiling was posting. Refresh and retry.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Stock movements already exist for this parboiling batch.');
      }
      throw error;
    }
  }
}
