import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, GateDirection, GatePurpose, GateStatus, ItemKind, MoistureDeductionFormula, PartnerType, Prisma, QualityDecision, QualitySampleStatus, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateGoodsReceiptDto, CreatePurchaseOrderDto, ListGoodsReceiptsDto, ListPurchasesDto, PurchaseActionDto } from './procurement.dto';
import { calculateBrokerCommission } from './procurement.calculations';
import { calculateMoistureAdjustment } from './moisture.calculations';
import { MoisturePolicyService } from './moisture-policy.service';

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, resource: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource, action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  async listPurchases(query: ListPurchasesDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { gateEntry: { gateNumber: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true, item: true, gateEntry: { include: { weighbridgeTicket: true } }, goodsReceipts: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId: string) {
    const unitRate = new Prisma.Decimal(dto.unitRate);
    if (unitRate.lte(0)) throw new BadRequestException('Purchase rate must be greater than zero.');
    try {
      return await this.prisma.$transaction(async tx => {
        const [gate, supplier, broker, item, godown, stack] = await Promise.all([
          tx.gateEntry.findFirst({
            where: { id: dto.gateEntryId, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { weighbridgeTicket: true, qualitySamples: true },
          }),
          tx.partner.findFirst({ where: { id: dto.supplierId, companyId: dto.companyId, active: true }, select: { id: true, type: true } }),
          dto.brokerId
            ? tx.partner.findFirst({ where: { id: dto.brokerId, companyId: dto.companyId, active: true, type: PartnerType.BROKER }, select: { id: true, commissionType: true, commissionRate: true } })
            : Promise.resolve(null),
          tx.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId, active: true }, select: { id: true, kind: true, baseUnit: true } }),
          tx.godown.findFirst({ where: { id: dto.destinationGodownId, companyId: dto.companyId, factoryId: dto.factoryId, active: true }, select: { id: true } }),
          tx.stack.findFirst({ where: { id: dto.destinationStackId, companyId: dto.companyId, factoryId: dto.factoryId }, select: { id: true, godownId: true } }),
        ]);
        if (!gate) throw new NotFoundException('Gate entry not found in this factory.');
        if (gate.status !== GateStatus.RECEIVING || gate.direction !== GateDirection.INWARD || gate.purpose !== GatePurpose.PROCUREMENT) {
          throw new ConflictException('Purchase can only be created from an accepted inward procurement gate entry.');
        }
        if (!gate.weighbridgeTicket) throw new ConflictException('Complete weighbridge weighing before creating a purchase.');
        const acceptedSamples = gate.qualitySamples.filter(sample => sample.status === QualitySampleStatus.APPROVED && sample.decision === QualityDecision.ACCEPT);
        if (acceptedSamples.length === 0) {
          throw new ConflictException('An accepted quality sample is required before creating a purchase.');
        }
        if (!supplier || (supplier.type !== PartnerType.SUPPLIER && supplier.type !== PartnerType.FARMER)) {
          throw new BadRequestException('Select an active supplier or farmer belonging to this company.');
        }
        if (dto.brokerId && (!broker || !broker.commissionType || !broker.commissionRate)) {
          throw new BadRequestException('Select an active company broker with configured commission terms.');
        }
        if (!item || item.kind !== ItemKind.PADDY || item.baseUnit !== UnitOfMeasure.KG) {
          throw new BadRequestException('Purchase receiving currently requires an active paddy item measured in KG.');
        }
        if (gate.partnerId && gate.partnerId !== supplier.id) throw new BadRequestException('Supplier does not match the gate entry.');
        if (gate.itemId && gate.itemId !== item.id) throw new BadRequestException('Paddy item does not match the gate entry.');
        if (!godown || !stack || stack.godownId !== godown.id) {
          throw new BadRequestException('Select a stack in an active godown belonging to this factory.');
        }
        const quantityKg = new Prisma.Decimal(gate.weighbridgeTicket.netWeight);
        const moistureOf = (sample: typeof acceptedSamples[number]) => {
          if (sample.measurements === null || Array.isArray(sample.measurements) || typeof sample.measurements !== 'object') return undefined;
          const value = sample.measurements.moisturePct;
          return typeof value === 'number' ? new Prisma.Decimal(value) : undefined;
        };
        const moistureSamples = acceptedSamples.filter(sample => moistureOf(sample) !== undefined);
        let qualitySample = dto.qualitySampleId
          ? acceptedSamples.find(sample => sample.id === dto.qualitySampleId)
          : undefined;
        if (dto.qualitySampleId && !qualitySample) {
          throw new BadRequestException('Select an accepted quality sample belonging to this gate entry.');
        }
        if (!qualitySample && moistureSamples.length > 1) {
          throw new ConflictException('Multiple accepted samples contain moisture readings. Select the sample to apply to this purchase.');
        }
        if (!qualitySample && moistureSamples.length === 1) qualitySample = moistureSamples[0];
        if (qualitySample && moistureSamples.length > 0 && moistureOf(qualitySample) === undefined) {
          throw new BadRequestException('Select an accepted sample with a measured moisture value.');
        }

        let payableQuantityKg = quantityKg;
        let adjustedUnitRate = unitRate;
        let moistureSnapshot: {
          qualitySampleId: string;
          moisturePolicyId: string;
          moisturePolicyName: string;
          moistureReceivedPct: Prisma.Decimal;
          moistureAllowedPct: Prisma.Decimal;
          moistureTolerancePct: Prisma.Decimal;
          moistureDifferencePct: Prisma.Decimal;
          moistureDeductionFormula: MoistureDeductionFormula;
          moistureDeductionPct: Prisma.Decimal;
          moistureDeductionQuantityKg: Prisma.Decimal;
          moistureRateDeductionPct: Prisma.Decimal;
        } | undefined;
        const receivedMoisture = qualitySample ? moistureOf(qualitySample) : undefined;
        if (qualitySample && receivedMoisture) {
          const policies = await tx.moisturePolicy.findMany({ where: { companyId: dto.companyId, active: true } });
          const applicable = policies.filter(policy =>
            (!policy.factoryId || policy.factoryId === dto.factoryId)
            && (!policy.paddyItemId || policy.paddyItemId === item.id)
            && (!policy.supplierPartnerId || policy.supplierPartnerId === supplier.id));
          if (applicable.length === 0) {
            throw new ConflictException('Moisture was measured, but no active applicable moisture policy exists. Configure a policy before creating the purchase.');
          }
          const highestPriority = Math.max(...applicable.map(policy => policy.priority));
          const winningPolicies = applicable.filter(policy => policy.priority === highestPriority);
          if (winningPolicies.length !== 1) {
            throw new ConflictException('Multiple applicable moisture policies share the highest priority. Resolve the priority conflict before purchasing.');
          }
          const policy = winningPolicies[0];
          const adjustment = calculateMoistureAdjustment(
            quantityKg,
            unitRate,
            receivedMoisture,
            {
              allowedMoisturePct: new Prisma.Decimal(policy.allowedMoisturePct),
              tolerancePct: new Prisma.Decimal(policy.tolerancePct),
              formula: policy.formula,
              rateDeductionPct: new Prisma.Decimal(policy.rateDeductionPct),
              slabs: policy.formula === MoistureDeductionFormula.SLAB_PERCENTAGE
                ? MoisturePolicyService.parseSlabs(policy.slabs)
                : [],
            },
          );
          payableQuantityKg = adjustment.payableQuantityKg;
          adjustedUnitRate = adjustment.adjustedUnitRate;
          moistureSnapshot = {
            qualitySampleId: qualitySample.id,
            moisturePolicyId: policy.id,
            moisturePolicyName: policy.name,
            moistureReceivedPct: receivedMoisture,
            moistureAllowedPct: new Prisma.Decimal(policy.allowedMoisturePct),
            moistureTolerancePct: new Prisma.Decimal(policy.tolerancePct),
            moistureDifferencePct: adjustment.excessMoisturePct,
            moistureDeductionFormula: policy.formula,
            moistureDeductionPct: adjustment.deductionPct,
            moistureDeductionQuantityKg: adjustment.deductionQuantityKg,
            moistureRateDeductionPct: adjustment.appliedRateDeductionPct,
          };
        }
        const commissionRules = broker && broker.commissionType !== 'PERCENTAGE' && broker.commissionType !== 'FIXED_AMOUNT'
          ? await tx.unitConversion.findMany({
            where: { companyId: dto.companyId, effectiveFrom: { lte: new Date() } },
            orderBy: [{ fromUnit: 'asc' }, { toUnit: 'asc' }, { effectiveFrom: 'desc' }],
          }).then(rows => {
            const latest = new Map<string, typeof rows[number]>();
            for (const row of rows) {
              const key = `${row.fromUnit}:${row.toUnit}`;
              if (!latest.has(key)) latest.set(key, row);
            }
            return [...latest.values()];
          })
          : [];
        const brokerCommissionAmount = broker?.commissionType && broker.commissionRate
          ? calculateBrokerCommission(quantityKg, unitRate, broker.commissionType, broker.commissionRate, commissionRules)
          : null;
        const order = await tx.purchaseOrder.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            orderNumber: dto.orderNumber.trim().toUpperCase(),
            gateEntryId: gate.id,
            supplierId: supplier.id,
            brokerId: broker?.id,
            itemId: item.id,
            destinationGodownId: godown.id,
            destinationStackId: stack.id,
            orderedQuantity: gate.weighbridgeTicket.netWeight,
            unit: UnitOfMeasure.KG,
            unitRate,
            payableQuantityKg,
            adjustedUnitRate,
            ...(moistureSnapshot ?? (qualitySample ? { qualitySampleId: qualitySample.id } : {})),
            ...(broker?.commissionType && broker.commissionRate && brokerCommissionAmount
              ? {
                brokerCommissionType: broker.commissionType,
                brokerCommissionRate: broker.commissionRate,
                brokerCommissionAmount,
              }
              : {}),
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'procurement', 'CREATE', order.id, undefined, order);
        return order;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A purchase order already exists for this gate entry or order number.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Purchase records changed during creation. Refresh and retry.');
      }
      throw error;
    }
  }

  async approvePurchaseOrder(id: string, dto: PurchaseActionDto, userId: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.purchaseOrder.findFirst({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId } });
      if (!order) throw new NotFoundException('Purchase order not found in this factory.');
      if (order.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft purchase orders can be approved.');
      const changed = await tx.purchaseOrder.updateMany({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Purchase order changed while approval was being recorded.');
      const after = await tx.purchaseOrder.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, dto.companyId, userId, 'procurement', 'APPROVE', id, order, after);
      return after;
    });
  }

  async listGoodsReceipts(query: ListGoodsReceiptsDto) {
    const where: Prisma.GoodsReceiptWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { receiptNumber: { contains: query.search, mode: 'insensitive' } },
        { purchaseOrder: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          purchaseOrder: { include: { supplier: true, item: true } },
          destinationGodown: true,
          destinationStack: true,
          purchaseInvoice: { select: { id: true } },
          landedCost: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async createGoodsReceipt(dto: CreateGoodsReceiptDto, userId: string) {
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.lte(0)) throw new BadRequestException('Received quantity must be greater than zero.');
    try {
      return await this.prisma.$transaction(async tx => {
        const order = await tx.purchaseOrder.findFirst({
          where: { id: dto.purchaseOrderId, companyId: dto.companyId, factoryId: dto.factoryId },
          include: { goodsReceipts: { where: { status: DocumentStatus.POSTED } } },
        });
        if (!order) throw new NotFoundException('Purchase order not found in this factory.');
        if (order.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved purchase orders can receive goods.');
        const alreadyReceived = order.goodsReceipts.reduce((total, receipt) => total.plus(receipt.quantity), new Prisma.Decimal(0));
        if (alreadyReceived.plus(quantity).gt(order.orderedQuantity)) {
          throw new BadRequestException(`Receipt exceeds outstanding purchase quantity. Outstanding: ${order.orderedQuantity.minus(alreadyReceived).toFixed(3)} KG.`);
        }
        const receipt = await tx.goodsReceipt.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            receiptNumber: dto.receiptNumber.trim().toUpperCase(),
            purchaseOrderId: order.id,
            destinationGodownId: order.destinationGodownId,
            destinationStackId: order.destinationStackId,
            quantity,
            unit: order.unit,
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'goods-receipts', 'CREATE', receipt.id, undefined, receipt);
        return receipt;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A goods receipt with this number already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Purchase quantities changed during receipt creation. Refresh and retry.');
      }
      throw error;
    }
  }

  async approveGoodsReceipt(id: string, dto: PurchaseActionDto, userId: string) {
    return this.prisma.$transaction(async tx => {
      const receipt = await tx.goodsReceipt.findFirst({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId },
        include: { purchaseOrder: true },
      });
      if (!receipt) throw new NotFoundException('Goods receipt not found in this factory.');
      if (receipt.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft goods receipts can be approved.');
      if (receipt.purchaseOrder.status !== DocumentStatus.APPROVED) throw new ConflictException('Purchase order is not open for receiving.');
      const changed = await tx.goodsReceipt.updateMany({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Goods receipt changed while approval was being recorded.');
      const after = await tx.goodsReceipt.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, dto.companyId, userId, 'goods-receipts', 'APPROVE', id, receipt, after);
      return after;
    });
  }

  async postGoodsReceipt(id: string, dto: PurchaseActionDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const receipt = await tx.goodsReceipt.findFirst({
          where: { id, companyId: dto.companyId, factoryId: dto.factoryId },
          include: { purchaseOrder: { include: { gateEntry: true } }, destinationStack: true },
        });
        if (!receipt) throw new NotFoundException('Goods receipt not found in this factory.');
        if (receipt.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved goods receipts can be posted.');
        if (receipt.purchaseOrder.status !== DocumentStatus.APPROVED) throw new ConflictException('Purchase order is not open for receiving.');
        const order = receipt.purchaseOrder;
        const [priorReceipts, stackBalance] = await Promise.all([
          tx.goodsReceipt.aggregate({
            where: { purchaseOrderId: order.id, status: DocumentStatus.POSTED },
            _sum: { quantity: true },
          }),
          tx.stockMovement.aggregate({
            where: { companyId: dto.companyId, factoryId: dto.factoryId, stackId: receipt.destinationStackId },
            _sum: { quantity: true },
          }),
        ]);
        const alreadyReceived = priorReceipts._sum.quantity ?? new Prisma.Decimal(0);
        if (alreadyReceived.plus(receipt.quantity).gt(order.orderedQuantity)) {
          throw new BadRequestException(`Receipt exceeds outstanding purchase quantity. Outstanding: ${order.orderedQuantity.minus(alreadyReceived).toFixed(3)} KG.`);
        }
        const currentStock = stackBalance._sum.quantity ?? new Prisma.Decimal(0);
        const capacityAvailable = receipt.destinationStack.capacityKg.minus(currentStock);
        if (receipt.quantity.gt(capacityAvailable)) {
          throw new BadRequestException(`Insufficient stack capacity. Available: ${capacityAvailable.toFixed(3)} KG. Requested: ${receipt.quantity.toFixed(3)} KG.`);
        }
        const changed = await tx.goodsReceipt.updateMany({
          where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.APPROVED },
          data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException('Goods receipt changed while posting was being recorded.');
        await tx.stockMovement.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            itemId: order.itemId,
            stackId: receipt.destinationStackId,
            type: 'RECEIPT',
            quantity: receipt.quantity,
            unit: receipt.unit,
            unitCost: order.payableQuantityKg
              .mul(order.adjustedUnitRate)
              .div(order.orderedQuantity)
              .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
            sourceType: 'GOODS_RECEIPT',
            sourceId: receipt.id,
          },
        });
        const totalReceived = alreadyReceived.plus(receipt.quantity);
        if (totalReceived.eq(order.orderedQuantity)) {
          const orderChanged = await tx.purchaseOrder.updateMany({
            where: { id: order.id, status: DocumentStatus.APPROVED },
            data: { status: DocumentStatus.POSTED },
          });
          if (orderChanged.count !== 1) throw new ConflictException('Purchase order changed while final receipt was being posted.');
          const gateChanged = await tx.gateEntry.updateMany({
            where: { id: order.gateEntryId, companyId: dto.companyId, factoryId: dto.factoryId, status: GateStatus.RECEIVING },
            data: { status: GateStatus.COMPLETED, completedAt: new Date() },
          });
          if (gateChanged.count !== 1) throw new ConflictException('Gate entry changed while final receipt was being posted.');
        }
        const after = await tx.goodsReceipt.findUniqueOrThrow({ where: { id } });
        await this.audit(tx, dto.companyId, userId, 'goods-receipts', 'POST', id, receipt, after);
        await this.audit(tx, dto.companyId, userId, 'inventory', 'RECEIPT', receipt.id, { stock: currentStock }, { stock: currentStock.plus(receipt.quantity) });
        return after;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This goods receipt has already created a stock transaction.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock or receipt quantities changed during posting. Refresh and retry.');
      }
      throw error;
    }
  }
}
