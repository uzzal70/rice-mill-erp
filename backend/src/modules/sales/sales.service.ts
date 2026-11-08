import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, ItemKind, PartnerType, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateSalesOrderDto,
  CreateSalesQuotationDto,
  ListSalesOrdersDto,
  ListSalesQuotationsDto,
} from './sales.dto';

const quotationInclude = {
  customer: { select: { id: true, name: true, businessName: true, code: true, creditLimit: true } },
  lines: { include: { item: true } },
} satisfies Prisma.SalesQuotationInclude;

const orderInclude = {
  customer: { select: { id: true, name: true, businessName: true, code: true, creditLimit: true, openingBalance: true } },
  quotation: { select: { id: true, quotationNumber: true, validUntil: true } },
  lines: {
    include: {
      item: true,
      packagingItem: true,
      stack: { include: { godown: true } },
    },
  },
} satisfies Prisma.SalesOrderInclude;

@Injectable()
export class SalesService {
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
        resource: 'sales',
        action,
        resourceId: id,
        before: json(before),
        after: json(after),
      },
    });
  }

  // --- QUOTATIONS ---

  async listQuotations(q: ListSalesQuotationsDto) {
    const where: Prisma.SalesQuotationWhereInput = {
      companyId: q.companyId,
      factoryId: q.factoryId,
      ...(q.status ? { status: q.status as DocumentStatus } : {}),
      ...(q.search
        ? {
            OR: [
              { quotationNumber: { contains: q.search, mode: 'insensitive' } },
              { customer: { name: { contains: q.search, mode: 'insensitive' } } },
              { customer: { businessName: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesQuotation.findMany({
        where,
        include: quotationInclude,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.salesQuotation.count({ where }),
    ]);
    return {
      success: true,
      data,
      meta: { page: q.page, pageSize: q.pageSize, total, pageCount: Math.ceil(total / q.pageSize) },
    };
  }

  async getQuotation(id: string, companyId: string, factoryId: string) {
    const quotation = await this.prisma.salesQuotation.findFirst({
      where: { id, companyId, factoryId },
      include: quotationInclude,
    });
    if (!quotation) throw new NotFoundException('Sales quotation not found in this factory.');
    return { success: true, data: quotation };
  }

  async createQuotation(dto: CreateSalesQuotationDto, userId: string) {
    if (!dto.lines.length || dto.lines.length > 100) {
      throw new BadRequestException('A sales quotation must contain between 1 and 100 lines.');
    }
    const validUntilDate = new Date(dto.validUntil);
    if (isNaN(validUntilDate.getTime())) {
      throw new BadRequestException('Provide a valid validity date.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const [factory, customer] = await Promise.all([
          tx.factory.findFirst({
            where: { id: dto.factoryId, companyId: dto.companyId, active: true },
            select: { id: true },
          }),
          tx.partner.findFirst({
            where: { id: dto.customerId, companyId: dto.companyId, type: PartnerType.CUSTOMER, active: true },
            select: { id: true, creditLimit: true },
          }),
        ]);
        if (!factory) throw new BadRequestException('Select an active company factory.');
        if (!customer) throw new BadRequestException('Select an active customer belonging to this company.');

        const exchangeRate = dto.exchangeRate ? new Prisma.Decimal(dto.exchangeRate) : new Prisma.Decimal(1);
        if (exchangeRate.lte(0)) throw new BadRequestException('Exchange rate must be greater than zero.');

        let total = new Prisma.Decimal(0);
        const rows: Prisma.SalesQuotationLineCreateWithoutQuotationInput[] = [];

        for (const line of dto.lines) {
          const quantity = new Prisma.Decimal(line.quantityKg);
          const rate = new Prisma.Decimal(line.unitRate);
          if (!quantity.gt(0) || !rate.gt(0)) {
            throw new BadRequestException('Quantity and unit rate must be greater than zero.');
          }

          const item = await tx.item.findFirst({
            where: { id: line.itemId, companyId: dto.companyId, active: true },
          });
          if (!item || (item.kind !== ItemKind.RICE && item.kind !== ItemKind.BY_PRODUCT) || item.baseUnit !== UnitOfMeasure.KG) {
            throw new BadRequestException('Quotation lines must use active rice or by-product items measured in KG.');
          }

          const amount = quantity.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          total = total.plus(amount);

          rows.push({
            company: { connect: { id: dto.companyId } },
            factory: { connect: { companyId_id: { companyId: dto.companyId, id: dto.factoryId } } },
            item: { connect: { companyId_id: { companyId: dto.companyId, id: item.id } } },
            quantityKg: quantity,
            unitRate: rate,
            lineAmount: amount,
          });
        }

        try {
          const quotation = await tx.salesQuotation.create({
            data: {
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              customerId: customer.id,
              quotationNumber: dto.quotationNumber.trim().toUpperCase(),
              channel: dto.channel,
              validUntil: validUntilDate,
              currency: dto.currency?.trim().toUpperCase() || 'BDT',
              exchangeRate,
              totalAmount: total,
              remarks: dto.remarks?.trim() || null,
              createdById: userId,
              lines: { create: rows },
            },
            include: quotationInclude,
          });
          await this.audit(tx, dto.companyId, userId, 'CREATE_QUOTATION', quotation.id, undefined, quotation);
          return quotation;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('A quotation with this number already exists.');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async approveQuotation(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.salesQuotation.findFirst({
        where: { id, companyId, factoryId },
        include: quotationInclude,
      });
      if (!quotation) throw new NotFoundException('Sales quotation not found in this factory.');
      if (quotation.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Only draft quotations can be approved.');
      }

      const now = new Date();
      const updated = await tx.salesQuotation.update({
        where: { id },
        data: {
          status: DocumentStatus.APPROVED,
          approvedById: userId,
          approvedAt: now,
        },
        include: quotationInclude,
      });
      await this.audit(tx, companyId, userId, 'APPROVE_QUOTATION', id, quotation, updated);
      return updated;
    });
  }

  async rejectQuotation(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.salesQuotation.findFirst({
        where: { id, companyId, factoryId },
        include: quotationInclude,
      });
      if (!quotation) throw new NotFoundException('Sales quotation not found in this factory.');
      if (quotation.status !== DocumentStatus.DRAFT) {
        throw new BadRequestException('Only draft quotations can be rejected.');
      }

      const updated = await tx.salesQuotation.update({
        where: { id },
        data: { status: DocumentStatus.REJECTED },
        include: quotationInclude,
      });
      await this.audit(tx, companyId, userId, 'REJECT_QUOTATION', id, quotation, updated);
      return updated;
    });
  }

  // --- SALES ORDERS ---

  async list(q: ListSalesOrdersDto) {
    const where: Prisma.SalesOrderWhereInput = {
      companyId: q.companyId,
      factoryId: q.factoryId,
      ...(q.channel ? { channel: q.channel } : {}),
      ...(q.status ? { status: q.status as DocumentStatus } : {}),
      ...(q.search
        ? {
            OR: [
              { orderNumber: { contains: q.search, mode: 'insensitive' } },
              { customer: { name: { contains: q.search, mode: 'insensitive' } } },
              { customer: { businessName: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return {
      success: true,
      data,
      meta: { page: q.page, pageSize: q.pageSize, total, pageCount: Math.ceil(total / q.pageSize) },
    };
  }

  async getOrder(id: string, companyId: string, factoryId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId, factoryId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Sales order not found in this factory.');
    return { success: true, data: order };
  }

  async create(dto: CreateSalesOrderDto, userId: string) {
    if (!dto.lines.length || dto.lines.length > 100) {
      throw new BadRequestException('A sales order must contain between 1 and 100 lines.');
    }

    if (dto.channel === 'EXPORT') {
      if (!dto.exportCountry?.trim()) {
        throw new BadRequestException('Export country is required for export sales orders.');
      }
      if (dto.currency && dto.currency !== 'BDT' && (!dto.exchangeRate || Number(dto.exchangeRate) <= 0)) {
        throw new BadRequestException('Valid exchange rate is required for foreign currency export orders.');
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        const [factory, customer] = await Promise.all([
          tx.factory.findFirst({
            where: { id: dto.factoryId, companyId: dto.companyId, active: true },
            select: { id: true },
          }),
          tx.partner.findFirst({
            where: { id: dto.customerId, companyId: dto.companyId, type: PartnerType.CUSTOMER, active: true },
            select: { id: true, creditLimit: true, openingBalance: true },
          }),
        ]);
        if (!factory) throw new BadRequestException('Select an active company factory.');
        if (!customer) throw new BadRequestException('Select an active customer belonging to this company.');

        // Customer Credit Channel Validation
        if (dto.channel === 'CREDIT') {
          if (!customer.creditLimit || customer.creditLimit.lte(0)) {
            throw new BadRequestException('Customer has no approved credit limit. Cannot create order with CREDIT channel.');
          }
        }

        // Validate optional quotation
        if (dto.quotationId) {
          const quotation = await tx.salesQuotation.findFirst({
            where: { id: dto.quotationId, companyId: dto.companyId, factoryId: dto.factoryId },
          });
          if (!quotation) {
            throw new BadRequestException('Linked quotation does not belong to this factory.');
          }
          if (quotation.status !== DocumentStatus.APPROVED && quotation.status !== DocumentStatus.DRAFT) {
            throw new BadRequestException('Linked quotation must be in draft or approved status.');
          }
        }

        const exchangeRate = dto.exchangeRate ? new Prisma.Decimal(dto.exchangeRate) : new Prisma.Decimal(1);
        if (exchangeRate.lte(0)) throw new BadRequestException('Exchange rate must be greater than zero.');

        let total = new Prisma.Decimal(0);
        const rows: Prisma.SalesOrderLineCreateWithoutSalesOrderInput[] = [];

        for (const line of dto.lines) {
          const quantity = new Prisma.Decimal(line.quantityKg);
          const rate = new Prisma.Decimal(line.unitRate);
          if (!quantity.gt(0) || !rate.gt(0)) {
            throw new BadRequestException('Quantity and transaction unit rate must be greater than zero.');
          }

          const [item, stack] = await Promise.all([
            tx.item.findFirst({ where: { id: line.itemId, companyId: dto.companyId, active: true } }),
            tx.stack.findFirst({
              where: { id: line.stackId, companyId: dto.companyId, factoryId: dto.factoryId },
              include: { godown: { select: { active: true } } },
            }),
          ]);

          if (!item || (item.kind !== ItemKind.RICE && item.kind !== ItemKind.BY_PRODUCT) || item.baseUnit !== UnitOfMeasure.KG) {
            throw new BadRequestException('Sales order lines must use active rice or by-product items measured in KG.');
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

          const amount = quantity.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          total = total.plus(amount);

          rows.push({
            company: { connect: { id: dto.companyId } },
            factory: { connect: { companyId_id: { companyId: dto.companyId, id: dto.factoryId } } },
            item: { connect: { companyId_id: { companyId: dto.companyId, id: item.id } } },
            stack: { connect: { companyId_factoryId_id: { companyId: dto.companyId, factoryId: dto.factoryId, id: stack.id } } },
            ...(packagingItemConnect ? { packagingItem: packagingItemConnect } : {}),
            bagCount: line.bagCount ?? null,
            quantityKg: quantity,
            unitRate: rate,
            lineAmount: amount,
          });
        }

        // Customer Credit Exposure Validation
        if (customer.creditLimit && customer.creditLimit.gt(0)) {
          // If customer has a defined credit limit and order is on credit, validate exposure
          if (dto.channel !== 'CASH') {
            const openOrders = await tx.salesOrder.findMany({
              where: {
                companyId: dto.companyId,
                customerId: customer.id,
                status: DocumentStatus.APPROVED,
              },
              select: { totalAmount: true },
            });
            const openOrdersTotal = openOrders.reduce((sum, o) => sum.plus(o.totalAmount), new Prisma.Decimal(0));
            const openingDue = customer.openingBalance && customer.openingBalance.gt(0) ? customer.openingBalance : new Prisma.Decimal(0);
            const totalExposure = openOrdersTotal.plus(openingDue).plus(total);

            if (totalExposure.gt(customer.creditLimit)) {
              throw new BadRequestException(
                `Order total exceeds customer credit limit of ${customer.creditLimit.toFixed(2)}. Total credit exposure would be ${totalExposure.toFixed(2)}.`,
              );
            }
          }
        }

        try {
          const order = await tx.salesOrder.create({
            data: {
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              customerId: customer.id,
              quotationId: dto.quotationId || null,
              orderNumber: dto.orderNumber.trim().toUpperCase(),
              channel: dto.channel,
              requestedDelivery: dto.requestedDelivery ? new Date(dto.requestedDelivery) : null,
              currency: dto.currency?.trim().toUpperCase() || 'BDT',
              exchangeRate,
              exportCountry: dto.exportCountry?.trim() || null,
              portOfDischarge: dto.portOfDischarge?.trim() || null,
              lcNumber: dto.lcNumber?.trim() || null,
              remarks: dto.remarks?.trim() || null,
              totalAmount: total,
              createdById: userId,
              lines: { create: rows },
            },
            include: orderInclude,
          });

          if (dto.quotationId) {
            await tx.salesQuotation.update({
              where: { id: dto.quotationId },
              data: { status: DocumentStatus.POSTED },
            });
          }

          await this.audit(tx, dto.companyId, userId, 'CREATE', order.id, undefined, order);
          return order;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('A sales order with this number already exists.');
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.salesOrder.findFirst({
            where: { id, companyId, factoryId },
            include: {
              ...orderInclude,
              lines: { include: { item: true, stack: true, packagingItem: true } },
            },
          });
          if (!order) throw new NotFoundException('Sales order not found in this factory.');
          if (order.status !== DocumentStatus.DRAFT) {
            throw new BadRequestException('Only draft sales orders can be approved.');
          }

          const aggregated = new Map<string, Prisma.Decimal>();
          for (const line of order.lines) {
            const key = `${line.itemId}:${line.stackId}`;
            aggregated.set(key, (aggregated.get(key) ?? new Prisma.Decimal(0)).plus(line.quantityKg));
          }

          for (const [key, quantity] of aggregated) {
            const [itemId, stackId] = key.split(':');
            const [stock, reservations] = await Promise.all([
              tx.stockMovement.aggregate({
                where: { companyId, factoryId, itemId, stackId },
                _sum: { quantity: true },
              }),
              tx.salesOrderLine.findMany({
                where: {
                  companyId,
                  factoryId,
                  itemId,
                  stackId,
                  reservedAt: { not: null },
                  salesOrder: { status: DocumentStatus.APPROVED },
                },
                select: { quantityKg: true, fulfilledKg: true },
              }),
            ]);
            const reserved = reservations.reduce(
              (sum, line) => sum.plus(line.quantityKg.minus(line.fulfilledKg)),
              new Prisma.Decimal(0),
            );
            const available = (stock._sum.quantity ?? new Prisma.Decimal(0)).minus(reserved);
            if (available.lt(quantity)) {
              throw new BadRequestException(
                `Insufficient unreserved stock for item ${itemId} on stack ${stackId}; available ${available.toFixed(3)} KG, requested ${quantity.toFixed(3)} KG.`,
              );
            }
          }

          const now = new Date();
          await tx.salesOrderLine.updateMany({
            where: { companyId, factoryId, salesOrderId: id },
            data: { reservedAt: now },
          });
          const result = await tx.salesOrder.update({
            where: { id },
            data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: now },
            include: orderInclude,
          });
          await this.audit(tx, companyId, userId, 'APPROVE_AND_RESERVE', id, order, result);
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed while reserving this order. Refresh and retry.');
      }
      throw error;
    }
  }

  async cancel(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({ where: { id, companyId, factoryId }, include: orderInclude });
      if (!order) throw new NotFoundException('Sales order not found in this factory.');
      if (order.status !== DocumentStatus.DRAFT && order.status !== DocumentStatus.APPROVED) {
        throw new BadRequestException('Only draft or approved orders can be cancelled.');
      }
      const result = await tx.salesOrder.update({
        where: { id },
        data: { status: DocumentStatus.CANCELLED },
        include: orderInclude,
      });
      await this.audit(tx, companyId, userId, 'CANCEL_AND_RELEASE_RESERVATION', id, order, result);
      return result;
    });
  }
}
