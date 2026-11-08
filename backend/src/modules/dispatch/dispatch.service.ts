import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateDispatchDto, ListDispatchDto } from './dispatch.dto';

const dispatchInclude = {
  customer: { select: { id: true, name: true, businessName: true, code: true, phone: true } },
  salesOrder: {
    select: {
      id: true,
      orderNumber: true,
      channel: true,
      status: true,
      currency: true,
      totalAmount: true,
    },
  },
  lines: {
    include: {
      item: true,
      packagingItem: true,
      stack: { include: { godown: true } },
      salesOrderLine: true,
    },
  },
} satisfies Prisma.DispatchInclude;

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    action: string,
    id: string,
    before: unknown,
    after: unknown,
  ) {
    const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
    await tx.auditEvent.create({
      data: {
        companyId,
        userId,
        resource: 'dispatch',
        action,
        resourceId: id,
        before: json(before),
        after: json(after),
      },
    });
  }

  async list(q: ListDispatchDto) {
    const where: Prisma.DispatchWhereInput = {
      companyId: q.companyId,
      factoryId: q.factoryId,
      ...(q.salesOrderId ? { salesOrderId: q.salesOrderId } : {}),
      ...(q.status ? { status: q.status as DocumentStatus } : {}),
      ...(q.search
        ? {
            OR: [
              { challanNumber: { contains: q.search, mode: 'insensitive' } },
              { gatePassNumber: { contains: q.search, mode: 'insensitive' } },
              { vehicleNumber: { contains: q.search, mode: 'insensitive' } },
              { driverName: { contains: q.search, mode: 'insensitive' } },
              { customer: { name: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.dispatch.findMany({
        where,
        include: dispatchInclude,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.dispatch.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: { page: q.page, pageSize: q.pageSize, total, pageCount: Math.ceil(total / q.pageSize) },
    };
  }

  async get(id: string, companyId: string, factoryId: string) {
    const dispatch = await this.prisma.dispatch.findFirst({
      where: { id, companyId, factoryId },
      include: dispatchInclude,
    });
    if (!dispatch) throw new NotFoundException('Dispatch record not found in this factory.');
    return { success: true, data: dispatch };
  }

  async create(dto: CreateDispatchDto, userId: string) {
    if (!dto.lines.length || dto.lines.length > 100) {
      throw new BadRequestException('A dispatch document must contain between 1 and 100 lines.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const [factory, order] = await Promise.all([
          tx.factory.findFirst({
            where: { id: dto.factoryId, companyId: dto.companyId, active: true },
            select: { id: true },
          }),
          tx.salesOrder.findFirst({
            where: { id: dto.salesOrderId, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { lines: true, customer: true },
          }),
        ]);

        if (!factory) throw new BadRequestException('Select an active company factory.');
        if (!order) throw new BadRequestException('Sales order does not belong to this factory.');
        if (order.status !== DocumentStatus.APPROVED) {
          throw new BadRequestException('Dispatches can only be created against APPROVED sales orders.');
        }

        const orderLinesMap = new Map(order.lines.map((l) => [l.id, l]));

        let totalWeightKg = new Prisma.Decimal(0);
        let totalBags = 0;
        const rows: Prisma.DispatchLineCreateWithoutDispatchInput[] = [];

        for (const line of dto.lines) {
          const orderLine = orderLinesMap.get(line.salesOrderLineId);
          if (!orderLine) {
            throw new BadRequestException(`Line does not belong to sales order ${order.orderNumber}.`);
          }

          const netWeight = new Prisma.Decimal(line.netWeightKg);
          if (!netWeight.gt(0)) {
            throw new BadRequestException('Dispatched net weight must be greater than zero.');
          }

          const remainingOrderQty = orderLine.quantityKg.minus(orderLine.fulfilledKg);
          if (netWeight.gt(remainingOrderQty)) {
            throw new BadRequestException(
              `Dispatched weight ${netWeight.toFixed(3)} KG exceeds unfulfilled order line quantity of ${remainingOrderQty.toFixed(3)} KG.`,
            );
          }

          const [item, stack] = await Promise.all([
            tx.item.findFirst({ where: { id: line.itemId, companyId: dto.companyId, active: true } }),
            tx.stack.findFirst({
              where: { id: line.stackId, companyId: dto.companyId, factoryId: dto.factoryId },
              include: { godown: { select: { active: true } } },
            }),
          ]);

          if (!item || (item.kind !== ItemKind.RICE && item.kind !== ItemKind.BY_PRODUCT)) {
            throw new BadRequestException('Dispatch line items must be active rice or by-product items.');
          }
          if (!stack || !stack.godown.active) {
            throw new BadRequestException('Each line must use a stack in an active godown of this factory.');
          }

          let packagingItemConnect: { connect: { companyId_id: { companyId: string; id: string } } } | undefined;
          if (line.packagingItemId) {
            const packagingItem = await tx.item.findFirst({
              where: { id: line.packagingItemId, companyId: dto.companyId, kind: ItemKind.PACKAGING, active: true },
            });
            if (!packagingItem) {
              throw new BadRequestException('Selected packaging item is not an active packaging material.');
            }
            packagingItemConnect = { connect: { companyId_id: { companyId: dto.companyId, id: packagingItem.id } } };
          }

          const bagCount = line.bagCount ?? 0;
          totalBags += bagCount;
          totalWeightKg = totalWeightKg.plus(netWeight);

          const grossWeight = line.grossWeightKg ? new Prisma.Decimal(line.grossWeightKg) : null;
          const tareWeight = line.tareWeightKg ? new Prisma.Decimal(line.tareWeightKg) : null;
          const lineAmount = netWeight.mul(orderLine.unitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          rows.push({
            company: { connect: { id: dto.companyId } },
            factory: { connect: { companyId_id: { companyId: dto.companyId, id: dto.factoryId } } },
            salesOrderLine: {
              connect: {
                companyId_factoryId_id: {
                  companyId: dto.companyId,
                  factoryId: dto.factoryId,
                  id: orderLine.id,
                },
              },
            },
            item: { connect: { companyId_id: { companyId: dto.companyId, id: item.id } } },
            stack: { connect: { companyId_factoryId_id: { companyId: dto.companyId, factoryId: dto.factoryId, id: stack.id } } },
            ...(packagingItemConnect ? { packagingItem: packagingItemConnect } : {}),
            bagCount,
            grossWeightKg: grossWeight,
            tareWeightKg: tareWeight,
            netWeightKg: netWeight,
            unitRate: orderLine.unitRate,
            lineAmount,
          });
        }

        try {
          const dispatch = await tx.dispatch.create({
            data: {
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              salesOrderId: order.id,
              customerId: order.customerId,
              challanNumber: dto.challanNumber.trim().toUpperCase(),
              gatePassNumber: dto.gatePassNumber.trim().toUpperCase(),
              dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : new Date(),
              vehicleNumber: dto.vehicleNumber.trim().toUpperCase(),
              driverName: dto.driverName.trim(),
              driverMobile: dto.driverMobile?.trim() || null,
              totalBags,
              totalWeightKg,
              remarks: dto.remarks?.trim() || null,
              createdById: userId,
              lines: { create: rows },
            },
            include: dispatchInclude,
          });

          await this.audit(tx, dto.companyId, userId, 'CREATE', dispatch.id, undefined, dispatch);
          return dispatch;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('A dispatch with this Delivery Challan or Gate Pass number already exists.');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findFirst({
        where: { id, companyId, factoryId },
        include: dispatchInclude,
      });
      if (!dispatch) throw new NotFoundException('Dispatch record not found in this factory.');
      if (dispatch.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Only draft dispatch documents can be approved.');
      }

      const now = new Date();
      const updated = await tx.dispatch.update({
        where: { id },
        data: {
          status: DocumentStatus.APPROVED,
          approvedById: userId,
          approvedAt: now,
        },
        include: dispatchInclude,
      });

      await this.audit(tx, companyId, userId, 'APPROVE', id, dispatch, updated);
      return updated;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const dispatch = await tx.dispatch.findFirst({
            where: { id, companyId, factoryId },
            include: {
              ...dispatchInclude,
              lines: {
                include: {
                  item: true,
                  stack: true,
                  salesOrderLine: true,
                },
              },
            },
          });

          if (!dispatch) throw new NotFoundException('Dispatch record not found in this factory.');
          if (dispatch.status !== DocumentStatus.DRAFT && dispatch.status !== DocumentStatus.APPROVED) {
            throw new BadRequestException('Only draft or approved dispatch documents can be posted.');
          }

          // 1. Physical stock verification before dispatch
          for (const line of dispatch.lines) {
            const stockAggregate = await tx.stockMovement.aggregate({
              where: { companyId, factoryId, itemId: line.itemId, stackId: line.stackId },
              _sum: { quantity: true },
            });
            const onHand = stockAggregate._sum.quantity ?? new Prisma.Decimal(0);
            if (onHand.lt(line.netWeightKg)) {
              throw new BadRequestException(
                `Insufficient physical stock on stack ${line.stack.code} for item ${line.item.name}; available ${onHand.toFixed(3)} KG, required ${line.netWeightKg.toFixed(3)} KG.`,
              );
            }
          }

          // 2. Write Stock Movements (deduct stock atomically)
          for (const line of dispatch.lines) {
            await tx.stockMovement.create({
              data: {
                companyId,
                factoryId,
                itemId: line.itemId,
                stackId: line.stackId,
                type: StockMovementType.SALE,
                quantity: line.netWeightKg.negated(),
                unit: UnitOfMeasure.KG,
                sourceType: 'SALES_DISPATCH',
                sourceId: dispatch.id,
              },
            });

            // 3. Update SalesOrderLine fulfilled quantity
            await tx.salesOrderLine.update({
              where: { id: line.salesOrderLineId },
              data: {
                fulfilledKg: { increment: line.netWeightKg },
              },
            });
          }

          // 4. Check if the parent SalesOrder is fully fulfilled
          const updatedOrderLines = await tx.salesOrderLine.findMany({
            where: { salesOrderId: dispatch.salesOrderId },
            select: { quantityKg: true, fulfilledKg: true },
          });
          const allFulfilled = updatedOrderLines.every((l) => l.fulfilledKg.gte(l.quantityKg));
          if (allFulfilled) {
            await tx.salesOrder.update({
              where: { id: dispatch.salesOrderId },
              data: { status: DocumentStatus.POSTED },
            });
          }

          // 5. Update Dispatch to POSTED
          const now = new Date();
          const postedDispatch = await tx.dispatch.update({
            where: { id },
            data: {
              status: DocumentStatus.POSTED,
              postedById: userId,
              postedAt: now,
            },
            include: dispatchInclude,
          });

          await this.audit(tx, companyId, userId, 'POST', id, dispatch, postedDispatch);
          return postedDispatch;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock or order state changed during dispatch posting. Refresh and retry.');
      }
      throw error;
    }
  }

  async cancel(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findFirst({
        where: { id, companyId, factoryId },
        include: dispatchInclude,
      });
      if (!dispatch) throw new NotFoundException('Dispatch record not found in this factory.');
      if (dispatch.status === DocumentStatus.POSTED) {
        throw new BadRequestException('Posted dispatch documents cannot be cancelled. Use a sales return workflow.');
      }
      if (dispatch.status === DocumentStatus.CANCELLED) {
        throw new BadRequestException('Dispatch document is already cancelled.');
      }

      const cancelled = await tx.dispatch.update({
        where: { id },
        data: { status: DocumentStatus.CANCELLED },
        include: dispatchInclude,
      });

      await this.audit(tx, companyId, userId, 'CANCEL', id, dispatch, cancelled);
      return cancelled;
    });
  }
}

