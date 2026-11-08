import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { conversionFactor } from '../unit-conversions/unit-conversions.service';
import { CreateRepackingBatchDto, ListRepackingBatchesDto } from './repacking.dto';

const repackingInclude = {
  sourceItem: true,
  outputItem: true,
  packagingItem: { include: { packagingSpec: true } },
  sourceStack: { include: { godown: true } },
  destinationStack: { include: { godown: true } },
} satisfies Prisma.RepackingBatchInclude;

@Injectable()
export class RepackingService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const json = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({ data: { companyId, userId, resource: 'repacking', action, resourceId: id, before: json(before), after: json(after) } });
  }

  private async quantityInKg(tx: Prisma.TransactionClient, companyId: string, unit: UnitOfMeasure, quantity: Prisma.Decimal) {
    if (unit === UnitOfMeasure.KG) return quantity;
    const rows = await tx.unitConversion.findMany({ where: { companyId, effectiveFrom: { lte: new Date() } }, orderBy: [{ fromUnit: 'asc' }, { toUnit: 'asc' }, { effectiveFrom: 'desc' }] });
    const latest = new Map<string, typeof rows[number]>();
    for (const row of rows) { const key = `${row.fromUnit}:${row.toUnit}`; if (!latest.has(key)) latest.set(key, row); }
    return quantity.mul(conversionFactor(unit, UnitOfMeasure.KG, [...latest.values()].map(row => ({ fromUnit: row.fromUnit, toUnit: row.toUnit, factor: new Prisma.Decimal(row.factor) }))));
  }

  private async stackOccupancyKg(tx: Prisma.TransactionClient, companyId: string, factoryId: string, stackId: string) {
    const groups = await tx.stockMovement.groupBy({ by: ['unit'], where: { companyId, factoryId, stackId }, _sum: { quantity: true } });
    let total = new Prisma.Decimal(0);
    for (const group of groups) total = total.plus(await this.quantityInKg(tx, companyId, group.unit, group._sum.quantity ?? new Prisma.Decimal(0)));
    return total;
  }

  async list(query: ListRepackingBatchesDto) {
    const where: Prisma.RepackingBatchWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { batchNumber: { contains: query.search, mode: 'insensitive' } },
        { sourceItem: { name: { contains: query.search, mode: 'insensitive' } } },
        { outputItem: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.repackingBatch.findMany({ where, include: repackingInclude, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.repackingBatch.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreateRepackingBatchDto, userId: string) {
    const input = new Prisma.Decimal(dto.inputQuantityKg);
    if (input.lte(0)) throw new BadRequestException('Repacking input quantity must be greater than zero.');
    try {
      return await this.prisma.$transaction(async tx => {
        const [factory, sourceItem, outputItem, packagingItem, stacks] = await Promise.all([
          tx.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId, active: true }, select: { id: true } }),
          tx.item.findFirst({ where: { id: dto.sourceItemId, companyId: dto.companyId, active: true } }),
          tx.item.findFirst({ where: { id: dto.outputItemId, companyId: dto.companyId, active: true } }),
          tx.item.findFirst({ where: { id: dto.packagingItemId, companyId: dto.companyId, active: true }, include: { packagingSpec: true } }),
          tx.stack.findMany({ where: { id: { in: [...new Set([dto.sourceStackId, dto.destinationStackId])] }, companyId: dto.companyId, factoryId: dto.factoryId }, include: { godown: { select: { active: true } } } }),
        ]);
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        if (!sourceItem || sourceItem.kind !== ItemKind.RICE || sourceItem.baseUnit !== UnitOfMeasure.KG) throw new BadRequestException('Repacking source must be active rice measured in KG.');
        if (!outputItem || outputItem.kind !== ItemKind.RICE || outputItem.baseUnit !== UnitOfMeasure.KG) throw new BadRequestException('Repacking output must be active rice measured in KG.');
        if (!packagingItem || packagingItem.kind !== ItemKind.PACKAGING || packagingItem.baseUnit !== UnitOfMeasure.PIECE || !packagingItem.packagingSpec) throw new BadRequestException('Select an active packaging item with a packaging specification, stocked in pieces.');
        if (stacks.length !== new Set([dto.sourceStackId, dto.destinationStackId]).size || stacks.some(stack => !stack.godown.active)) throw new BadRequestException('Select source and destination stacks in active godowns belonging to this factory.');
        const sizeKg = new Prisma.Decimal(packagingItem.packagingSpec.sizeKg);
        if (sizeKg.lte(0)) throw new BadRequestException('Packaging size must be greater than zero.');
        const packed = sizeKg.mul(dto.packageCount).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
        if (packed.lte(0) || packed.gt(input)) throw new BadRequestException(`Packed quantity (${packed.toFixed(3)} KG) must be positive and cannot exceed source input (${input.toFixed(3)} KG).`);
        const batch = await tx.repackingBatch.create({
          data: {
            companyId: dto.companyId, factoryId: dto.factoryId, batchNumber: dto.batchNumber.trim().toUpperCase(),
            sourceItemId: sourceItem.id, outputItemId: outputItem.id, packagingItemId: packagingItem.id,
            sourceStackId: dto.sourceStackId, destinationStackId: dto.destinationStackId,
            inputQuantityKg: input, packageSizeKg: sizeKg, packageCount: dto.packageCount,
            packedQuantityKg: packed, packingLossKg: input.minus(packed), remarks: dto.remarks?.trim() || null,
            createdById: userId,
          }, include: repackingInclude,
        });
        await this.audit(tx, dto.companyId, userId, 'CREATE', batch.id, undefined, batch);
        return batch;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A repacking batch with this number already exists.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Repacking data changed during creation. Refresh and retry.');
      throw error;
    }
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const batch = await tx.repackingBatch.findFirst({ where: { id, companyId, factoryId }, include: repackingInclude });
      if (!batch) throw new NotFoundException('Repacking batch not found in this factory.');
      if (batch.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft repacking batches can be approved.');
      const result = await tx.repackingBatch.updateMany({ where: { id, companyId, factoryId, status: DocumentStatus.DRAFT }, data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() } });
      if (result.count !== 1) throw new ConflictException('Repacking batch changed while approval was being recorded.');
      const after = await tx.repackingBatch.findUniqueOrThrow({ where: { id }, include: repackingInclude });
      await this.audit(tx, companyId, userId, 'APPROVE', id, batch, after);
      return after;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const batch = await tx.repackingBatch.findFirst({ where: { id, companyId, factoryId }, include: repackingInclude });
        if (!batch) throw new NotFoundException('Repacking batch not found in this factory.');
        if (batch.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved repacking batches can be posted.');
        if (!batch.sourceItem.active || !batch.outputItem.active || !batch.packagingItem.active || !batch.sourceStack.godown.active || !batch.destinationStack.godown.active) throw new BadRequestException('Repacking items and stacks must remain active when posting.');
        if (!batch.packagingItem.packagingSpec || !new Prisma.Decimal(batch.packagingItem.packagingSpec.sizeKg).eq(batch.packageSizeKg)) throw new ConflictException('Packaging specification changed after this batch was created. Create a new repacking batch.');

        const [riceBalance, packageBalance] = await Promise.all([
          tx.stockMovement.aggregate({ where: { companyId, factoryId, itemId: batch.sourceItemId, stackId: batch.sourceStackId }, _sum: { quantity: true } }),
          tx.stockMovement.aggregate({ where: { companyId, factoryId, itemId: batch.packagingItemId }, _sum: { quantity: true } }),
        ]);
        const availableRice = riceBalance._sum.quantity ?? new Prisma.Decimal(0);
        const availablePackaging = packageBalance._sum.quantity ?? new Prisma.Decimal(0);
        if (availableRice.lt(batch.inputQuantityKg)) throw new BadRequestException(`Insufficient source rice. Available: ${availableRice.toFixed(3)} KG; requested: ${batch.inputQuantityKg.toFixed(3)} KG.`);
        if (availablePackaging.lt(batch.packageCount)) throw new BadRequestException(`Insufficient packaging stock. Available: ${availablePackaging.toFixed(0)} pieces; requested: ${batch.packageCount} pieces.`);

        const [sourceOccupancy, destinationOccupancy] = await Promise.all([
          this.stackOccupancyKg(tx, companyId, factoryId, batch.sourceStackId),
          batch.destinationStackId === batch.sourceStackId ? Promise.resolve(new Prisma.Decimal(0)) : this.stackOccupancyKg(tx, companyId, factoryId, batch.destinationStackId),
        ]);
        const destination = await tx.stack.findFirstOrThrow({ where: { id: batch.destinationStackId, companyId, factoryId }, select: { capacityKg: true } });
        const occupancyAfterInput = batch.destinationStackId === batch.sourceStackId ? sourceOccupancy.minus(batch.inputQuantityKg) : destinationOccupancy;
        const occupancyAfterOutput = occupancyAfterInput.plus(batch.packedQuantityKg);
        if (occupancyAfterOutput.gt(destination.capacityKg)) throw new BadRequestException(`Repacked rice exceeds destination capacity. Available after input is removed: ${destination.capacityKg.minus(occupancyAfterInput).toFixed(3)} KG.`);

        await tx.stockMovement.createMany({ data: [
          { companyId, factoryId, itemId: batch.sourceItemId, stackId: batch.sourceStackId, type: StockMovementType.REPACK, quantity: batch.inputQuantityKg.negated(), unit: UnitOfMeasure.KG, sourceType: 'REPACK_INPUT', sourceId: batch.id },
          { companyId, factoryId, itemId: batch.outputItemId, stackId: batch.destinationStackId, type: StockMovementType.REPACK, quantity: batch.packedQuantityKg, unit: UnitOfMeasure.KG, sourceType: 'REPACK_OUTPUT', sourceId: batch.id },
          { companyId, factoryId, itemId: batch.packagingItemId, stackId: null, type: StockMovementType.REPACK, quantity: new Prisma.Decimal(batch.packageCount).negated(), unit: UnitOfMeasure.PIECE, sourceType: 'REPACK_PACKAGING', sourceId: batch.id },
        ] });
        const changed = await tx.repackingBatch.updateMany({ where: { id, companyId, factoryId, status: DocumentStatus.APPROVED }, data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() } });
        if (changed.count !== 1) throw new ConflictException('Repacking batch changed while stock was being posted.');
        const after = await tx.repackingBatch.findUniqueOrThrow({ where: { id }, include: repackingInclude });
        await this.audit(tx, companyId, userId, 'POST', id, batch, after);
        return after;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Stock changed while repacking was posting. Refresh and retry.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Stock movements already exist for this repacking batch.');
      throw error;
    }
  }
}
