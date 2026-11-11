import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentStatus,
  ItemKind,
  PartnerType,
  Prisma,
  SalesReturnCondition,
  SalesReturnSettlement,
  SalesReturnType,
  StockMovementType,
  UnitOfMeasure,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateSalesReturnDto, ListSalesReturnDto } from './sales-return.dto';

const salesReturnInclude = {
  customer: { select: { id: true, name: true, businessName: true, code: true, phone: true } },
  salesOrder: { select: { id: true, orderNumber: true, status: true, channel: true } },
  dispatch: { select: { id: true, challanNumber: true, gatePassNumber: true, vehicleNumber: true } },
  lines: {
    include: {
      item: { select: { id: true, name: true, code: true, kind: true, baseUnit: true } },
      restockStack: {
        select: {
          id: true,
          code: true,
          godown: { select: { id: true, name: true, code: true } },
        },
      },
      salesOrderLine: { select: { id: true, quantityKg: true, fulfilledKg: true, unitRate: true } },
      dispatchLine: { select: { id: true, netWeightKg: true, unitRate: true } },
    },
  },
};

@Injectable()
export class SalesReturnService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(
    tx: Prisma.TransactionClient,
    companyId: string,
    userId: string,
    action: string,
    resourceId: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditEvent.create({
      data: {
        companyId,
        userId,
        resource: 'sales-returns',
        action,
        resourceId,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      },
    });
  }

  async list(query: ListSalesReturnDto) {
    const where: Prisma.SalesReturnWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.salesOrderId ? { salesOrderId: query.salesOrderId } : {}),
      ...(query.dispatchId ? { dispatchId: query.dispatchId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status as DocumentStatus } : {}),
      ...(query.type ? { type: query.type as SalesReturnType } : {}),
      ...(query.search
        ? {
            OR: [
              { returnNumber: { contains: query.search, mode: 'insensitive' } },
              { creditNoteNumber: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { customer: { businessName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesReturn.findMany({
        where,
        include: salesReturnInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getReturn(id: string, companyId: string, factoryId: string) {
    const record = await this.prisma.salesReturn.findFirst({
      where: { id, companyId, factoryId },
      include: salesReturnInclude,
    });
    if (!record) {
      throw new NotFoundException('Sales return record not found in this factory.');
    }
    return { success: true, data: record };
  }

  async create(dto: CreateSalesReturnDto, userId: string) {
    if (!dto.lines.length || dto.lines.length > 100) {
      throw new BadRequestException('A sales return must contain between 1 and 100 lines.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const [factory, customer, order] = await Promise.all([
          tx.factory.findFirst({
            where: { id: dto.factoryId, companyId: dto.companyId, active: true },
            select: { id: true },
          }),
          tx.partner.findFirst({
            where: { id: dto.customerId, companyId: dto.companyId, type: PartnerType.CUSTOMER, active: true },
            select: { id: true, name: true },
          }),
          tx.salesOrder.findFirst({
            where: { id: dto.salesOrderId, companyId: dto.companyId, factoryId: dto.factoryId },
            include: { lines: true },
          }),
        ]);

        if (!factory) throw new BadRequestException('Select an active company factory.');
        if (!customer) throw new BadRequestException('Select an active customer partner of this company.');
        if (!order) throw new BadRequestException('Sales order does not belong to this factory.');
        if (order.status !== DocumentStatus.APPROVED && order.status !== DocumentStatus.POSTED) {
          throw new BadRequestException('Sales returns can only be created against approved or fulfilled orders.');
        }

        let dispatchRecord: { id: string; lines: Array<{ id: string; salesOrderLineId: string; netWeightKg: Prisma.Decimal }> } | null = null;
        if (dto.dispatchId) {
          const foundDispatch = await tx.dispatch.findFirst({
            where: {
              id: dto.dispatchId,
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              salesOrderId: order.id,
            },
            include: { lines: true },
          });
          if (!foundDispatch) {
            throw new BadRequestException('Linked dispatch does not exist or does not match this sales order.');
          }
          if (foundDispatch.status !== DocumentStatus.POSTED) {
            throw new BadRequestException('Returns can only be booked against POSTED dispatch documents.');
          }
          dispatchRecord = foundDispatch;
        }

        const orderLinesMap = new Map(order.lines.map((l) => [l.id, l]));
        const dispatchLinesMap = dispatchRecord
          ? new Map(dispatchRecord.lines.map((l) => [l.id, l]))
          : new Map<string, { id: string; salesOrderLineId: string; netWeightKg: Prisma.Decimal }>();

        let totalWeightKg = new Prisma.Decimal(0);
        let totalAmount = new Prisma.Decimal(0);
        let totalBags = 0;
        const rows: Prisma.SalesReturnLineCreateWithoutSalesReturnInput[] = [];

        for (const line of dto.lines) {
          const orderLine = orderLinesMap.get(line.salesOrderLineId);
          if (!orderLine) {
            throw new BadRequestException(`Order line ${line.salesOrderLineId} does not belong to order ${order.orderNumber}.`);
          }

          const returnWeight = new Prisma.Decimal(line.returnKg);
          if (!returnWeight.gt(0)) {
            throw new BadRequestException('Returned weight must be greater than zero.');
          }

          if (line.dispatchLineId) {
            const dispatchLine = dispatchLinesMap.get(line.dispatchLineId);
            if (!dispatchLine) {
              throw new BadRequestException('Dispatch line does not belong to the selected dispatch document.');
            }
            if (returnWeight.gt(dispatchLine.netWeightKg)) {
              throw new BadRequestException(
                `Returned weight ${returnWeight.toFixed(3)} KG exceeds dispatched weight ${dispatchLine.netWeightKg.toFixed(3)} KG.`,
              );
            }
          } else {
            if (returnWeight.gt(orderLine.fulfilledKg)) {
              throw new BadRequestException(
                `Returned weight ${returnWeight.toFixed(3)} KG exceeds fulfilled quantity ${orderLine.fulfilledKg.toFixed(3)} KG for line.`,
              );
            }
          }

          const [item, stack] = await Promise.all([
            tx.item.findFirst({
              where: { id: line.itemId, companyId: dto.companyId, active: true },
            }),
            tx.stack.findFirst({
              where: { id: line.restockStackId, companyId: dto.companyId, factoryId: dto.factoryId },
              include: { godown: true },
            }),
          ]);

          if (!item || (item.kind !== ItemKind.RICE && item.kind !== ItemKind.BY_PRODUCT)) {
            throw new BadRequestException('Sales returns only accept rice or by-product items.');
          }
          if (!stack || !stack.godown.active) {
            throw new BadRequestException('Restock stack must belong to an active godown of this factory.');
          }

          const unitRate = line.unitRate ? new Prisma.Decimal(line.unitRate) : orderLine.unitRate;
          const lineAmount = returnWeight.mul(unitRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          totalWeightKg = totalWeightKg.plus(returnWeight);
          totalAmount = totalAmount.plus(lineAmount);
          const bagCount = line.bagCount ?? 0;
          totalBags += bagCount;

          rows.push({
            company: { connect: { id: dto.companyId } },
            factory: { connect: { companyId_id: { companyId: dto.companyId, id: dto.factoryId } } },
            salesOrderLine: { connect: { companyId_factoryId_id: { companyId: dto.companyId, factoryId: dto.factoryId, id: orderLine.id } } },
            ...(line.dispatchLineId
              ? { dispatchLine: { connect: { companyId_factoryId_id: { companyId: dto.companyId, factoryId: dto.factoryId, id: line.dispatchLineId } } } }
              : {}),
            item: { connect: { companyId_id: { companyId: dto.companyId, id: item.id } } },
            restockStack: { connect: { companyId_factoryId_id: { companyId: dto.companyId, factoryId: dto.factoryId, id: stack.id } } },
            condition: line.condition,
            bagCount,
            returnKg: returnWeight,
            unitRate,
            lineAmount,
            damageNotes: line.damageNotes?.trim() || null,
          });
        }

        const creditNoteNumber =
          dto.creditNoteNumber?.trim().toUpperCase() ||
          (dto.settlement === SalesReturnSettlement.CREDIT_NOTE
            ? `CN-${Date.now().toString().slice(-6)}`
            : null);

        try {
          const salesReturn = await tx.salesReturn.create({
            data: {
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              salesOrderId: order.id,
              dispatchId: dto.dispatchId || null,
              customerId: order.customerId,
              returnNumber: dto.returnNumber.trim().toUpperCase(),
              creditNoteNumber,
              type: dto.type,
              settlement: dto.settlement,
              returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
              reason: dto.reason.trim(),
              totalBags,
              totalWeightKg,
              totalAmount,
              remarks: dto.remarks?.trim() || null,
              createdById: userId,
              lines: { create: rows },
            },
            include: salesReturnInclude,
          });

          await this.audit(tx, dto.companyId, userId, 'CREATE', salesReturn.id, undefined, salesReturn);
          return salesReturn;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('A sales return with this Return or Credit Note number already exists.');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.salesReturn.findFirst({
        where: { id, companyId, factoryId },
        include: salesReturnInclude,
      });

      if (!record) throw new NotFoundException('Sales return record not found in this factory.');
      if (record.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Only draft sales return records can be approved.');
      }

      const updated = await tx.salesReturn.update({
        where: { id },
        data: {
          status: DocumentStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        },
        include: salesReturnInclude,
      });

      await this.audit(tx, companyId, userId, 'APPROVE', id, record, updated);
      return updated;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const salesReturn = await tx.salesReturn.findFirst({
          where: { id, companyId, factoryId },
          include: {
            ...salesReturnInclude,
            lines: {
              include: {
                item: true,
                restockStack: true,
                salesOrderLine: true,
              },
            },
          },
        });

        if (!salesReturn) throw new NotFoundException('Sales return record not found in this factory.');
        if (salesReturn.status !== DocumentStatus.DRAFT && salesReturn.status !== DocumentStatus.APPROVED) {
          throw new BadRequestException('Only draft or approved sales returns can be posted.');
        }

        // 1. Process Stock Movements (restock prime or damage stack)
        for (const line of salesReturn.lines) {
          const movementType =
            line.condition === SalesReturnCondition.DAMAGED
              ? StockMovementType.DAMAGE
              : StockMovementType.SALE_RETURN;

          await tx.stockMovement.create({
            data: {
              companyId,
              factoryId,
              itemId: line.itemId,
              stackId: line.restockStackId,
              type: movementType,
              quantity: line.returnKg,
              unit: UnitOfMeasure.KG,
              sourceType: 'SALES_RETURN',
              sourceId: line.id,
            },
          });

          // 2. If settlement is REPLACEMENT, adjust SalesOrderLine fulfilledKg so it can be re-dispatched
          if (salesReturn.settlement === SalesReturnSettlement.REPLACEMENT) {
            const currentFulfilled = line.salesOrderLine.fulfilledKg;
            const newFulfilled = Prisma.Decimal.max(0, currentFulfilled.minus(line.returnKg));

            await tx.salesOrderLine.update({
              where: { id: line.salesOrderLineId },
              data: { fulfilledKg: newFulfilled },
            });
          }
        }

        // If replacement reduced fulfillment, ensure order status is APPROVED (reopened if COMPLETED)
        if (salesReturn.settlement === SalesReturnSettlement.REPLACEMENT) {
          const order = await tx.salesOrder.findUnique({
            where: { id: salesReturn.salesOrderId },
            select: { id: true, status: true },
          });
          if (order && order.status === DocumentStatus.POSTED) {
            await tx.salesOrder.update({
              where: { id: order.id },
              data: { status: DocumentStatus.APPROVED },
            });
          }
        }

        // 3. Mark return as POSTED
        const updated = await tx.salesReturn.update({
          where: { id },
          data: {
            status: DocumentStatus.POSTED,
            postedById: userId,
            postedAt: new Date(),
          },
          include: salesReturnInclude,
        });

        await this.audit(tx, companyId, userId, 'POST', id, salesReturn, updated);
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancel(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findFirst({
        where: { id, companyId, factoryId },
        include: salesReturnInclude,
      });

      if (!salesReturn) throw new NotFoundException('Sales return record not found in this factory.');
      if (salesReturn.status === DocumentStatus.POSTED) {
        throw new BadRequestException('Posted sales returns cannot be cancelled. Inventory and ledgers are already updated.');
      }
      if (salesReturn.status === DocumentStatus.CANCELLED) {
        throw new BadRequestException('Sales return is already cancelled.');
      }

      const updated = await tx.salesReturn.update({
        where: { id },
        data: { status: DocumentStatus.CANCELLED },
        include: salesReturnInclude,
      });

      await this.audit(tx, companyId, userId, 'CANCEL', id, salesReturn, updated);
      return updated;
    });
  }
}

