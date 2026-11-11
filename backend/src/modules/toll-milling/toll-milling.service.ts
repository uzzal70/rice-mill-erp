import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ByProductPolicy,
  DocumentStatus,
  ItemKind,
  PartnerType,
  Prisma,
  TollOrderStatus,
  TollRateBasis,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateTollBatchDto,
  CreateTollDeliveryDto,
  CreateTollOrderDto,
  ListTollOrderDto,
} from './toll-milling.dto';

const tollOrderInclude = {
  customer: { select: { id: true, name: true, businessName: true, code: true, phone: true } },
  paddyItem: { select: { id: true, name: true, code: true, kind: true, baseUnit: true } },
  batches: { orderBy: { createdAt: 'desc' as const } },
  deliveries: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class TollMillingService {
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
        resource: 'toll-milling',
        action,
        resourceId,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      },
    });
  }

  calculateTollCharge(processedKg: Prisma.Decimal, bagCount: number, rate: Prisma.Decimal, basis: TollRateBasis): Prisma.Decimal {
    if (basis === TollRateBasis.PER_KG) {
      return processedKg.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }
    if (basis === TollRateBasis.PER_MON) {
      // 1 Mon = 40 KG in Bangladesh standard
      return processedKg.div(40).mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }
    if (basis === TollRateBasis.PER_BAG) {
      return new Prisma.Decimal(bagCount).mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }
    return new Prisma.Decimal(0);
  }

  async listOrders(query: ListTollOrderDto) {
    const where: Prisma.TollOrderWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status as TollOrderStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { challanNumber: { contains: query.search, mode: 'insensitive' } },
              { vehicleNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { customer: { businessName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tollOrder.findMany({
        where,
        include: tollOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.tollOrder.count({ where }),
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

  async getOrder(id: string, companyId: string, factoryId: string) {
    const record = await this.prisma.tollOrder.findFirst({
      where: { id, companyId, factoryId },
      include: tollOrderInclude,
    });
    if (!record) {
      throw new NotFoundException('Toll milling order not found in this factory.');
    }
    return { success: true, data: record };
  }

  async getCustomerCustodyLedger(customerId: string, companyId: string, factoryId: string) {
    const customer = await this.prisma.partner.findFirst({
      where: { id: customerId, companyId, type: PartnerType.CUSTOMER },
      select: { id: true, name: true, businessName: true, code: true, phone: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer partner not found in this company.');
    }

    const orders = await this.prisma.tollOrder.findMany({
      where: { companyId, factoryId, customerId, status: { not: TollOrderStatus.CANCELLED } },
      include: tollOrderInclude,
      orderBy: { createdAt: 'desc' },
    });

    let totalPaddyReceivedKg = new Prisma.Decimal(0);
    let totalPaddyProcessedKg = new Prisma.Decimal(0);
    let totalRiceProducedKg = new Prisma.Decimal(0);
    let totalRiceDeliveredKg = new Prisma.Decimal(0);
    let totalByProductProducedKg = new Prisma.Decimal(0);
    let totalByProductDeliveredKg = new Prisma.Decimal(0);
    let totalServiceFees = new Prisma.Decimal(0);

    for (const ord of orders) {
      totalPaddyReceivedKg = totalPaddyReceivedKg.plus(ord.receivedQuantityKg);
      totalPaddyProcessedKg = totalPaddyProcessedKg.plus(ord.processedQuantityKg);
      totalRiceProducedKg = totalRiceProducedKg.plus(ord.totalRiceProducedKg);
      totalRiceDeliveredKg = totalRiceDeliveredKg.plus(ord.totalRiceDeliveredKg);
      totalByProductProducedKg = totalByProductProducedKg.plus(ord.totalByProductProducedKg);
      totalByProductDeliveredKg = totalByProductDeliveredKg.plus(ord.totalByProductDeliveredKg);
      totalServiceFees = totalServiceFees.plus(ord.totalAmount);
    }

    const paddyInCustodyKg = Prisma.Decimal.max(0, totalPaddyReceivedKg.minus(totalPaddyProcessedKg));
    const riceInCustodyKg = Prisma.Decimal.max(0, totalRiceProducedKg.minus(totalRiceDeliveredKg));
    const byProductInCustodyKg = Prisma.Decimal.max(0, totalByProductProducedKg.minus(totalByProductDeliveredKg));

    return {
      success: true,
      customer,
      custodySummary: {
        totalPaddyReceivedKg,
        totalPaddyProcessedKg,
        paddyInCustodyKg,
        totalRiceProducedKg,
        totalRiceDeliveredKg,
        riceInCustodyKg,
        totalByProductProducedKg,
        totalByProductDeliveredKg,
        byProductInCustodyKg,
        totalServiceFees,
      },
      orders,
    };
  }

  async createOrder(dto: CreateTollOrderDto, userId: string) {
    const receivedKg = new Prisma.Decimal(dto.receivedQuantityKg);
    const rate = new Prisma.Decimal(dto.tollRate);
    if (!receivedKg.gt(0)) {
      throw new BadRequestException('Received paddy quantity must be greater than zero.');
    }
    if (!rate.gt(0)) {
      throw new BadRequestException('Toll processing rate must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const [factory, customer, paddyItem] = await Promise.all([
        tx.factory.findFirst({
          where: { id: dto.factoryId, companyId: dto.companyId, active: true },
          select: { id: true },
        }),
        tx.partner.findFirst({
          where: { id: dto.customerId, companyId: dto.companyId, type: PartnerType.CUSTOMER, active: true },
          select: { id: true, name: true },
        }),
        tx.item.findFirst({
          where: { id: dto.paddyItemId, companyId: dto.companyId, kind: ItemKind.PADDY, active: true },
          select: { id: true, name: true },
        }),
      ]);

      if (!factory) throw new BadRequestException('Select an active company factory.');
      if (!customer) throw new BadRequestException('Select an active customer partner of this company.');
      if (!paddyItem) throw new BadRequestException('Toll order requires an active paddy variety item.');

      const bagCount = dto.receivedBagCount ?? 0;
      const additional = dto.additionalCharges ? new Prisma.Decimal(dto.additionalCharges) : new Prisma.Decimal(0);

      // If basis is PER_BAG, calculate charges upfront based on bag count
      const initialTollCharge =
        dto.tollRateBasis === TollRateBasis.PER_BAG
          ? new Prisma.Decimal(bagCount).mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          : new Prisma.Decimal(0);
      const totalAmount = initialTollCharge.plus(additional);

      try {
        const order = await tx.tollOrder.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            customerId: customer.id,
            paddyItemId: paddyItem.id,
            orderNumber: dto.orderNumber.trim().toUpperCase(),
            status: TollOrderStatus.RECEIVED,
            receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
            vehicleNumber: dto.vehicleNumber?.trim().toUpperCase() || null,
            driverName: dto.driverName?.trim() || null,
            challanNumber: dto.challanNumber?.trim().toUpperCase() || null,
            receivedBagCount: bagCount,
            receivedQuantityKg: receivedKg,
            tollRate: rate,
            tollRateBasis: dto.tollRateBasis,
            byProductPolicy: dto.byProductPolicy,
            tollChargeAmount: initialTollCharge,
            additionalCharges: additional,
            totalAmount,
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
          include: tollOrderInclude,
        });

        await this.audit(tx, dto.companyId, userId, 'CREATE_ORDER', order.id, undefined, order);
        return order;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('A toll milling order with this order number already exists.');
        }
        throw error;
      }
    });
  }

  async approveOrder(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.tollOrder.findFirst({
        where: { id, companyId, factoryId },
        include: tollOrderInclude,
      });

      if (!order) throw new NotFoundException('Toll milling order not found in this factory.');
      if (order.status === TollOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot approve a cancelled toll order.');
      }

      const updated = await tx.tollOrder.update({
        where: { id },
        data: {
          approvedById: userId,
          approvedAt: new Date(),
        },
        include: tollOrderInclude,
      });

      await this.audit(tx, companyId, userId, 'APPROVE_ORDER', id, order, updated);
      return updated;
    });
  }

  async createBatch(orderId: string, dto: CreateTollBatchDto, userId: string) {
    const inputKg = new Prisma.Decimal(dto.inputPaddyKg);
    const headRice = new Prisma.Decimal(dto.headRiceKg);
    const brokenRice = dto.brokenRiceKg ? new Prisma.Decimal(dto.brokenRiceKg) : new Prisma.Decimal(0);
    const riceBran = dto.riceBranKg ? new Prisma.Decimal(dto.riceBranKg) : new Prisma.Decimal(0);
    const husk = dto.huskKg ? new Prisma.Decimal(dto.huskKg) : new Prisma.Decimal(0);

    if (!inputKg.gt(0)) {
      throw new BadRequestException('Input paddy quantity must be greater than zero.');
    }
    if (headRice.lt(0) || brokenRice.lt(0) || riceBran.lt(0) || husk.lt(0)) {
      throw new BadRequestException('Product outputs cannot be negative.');
    }

    const totalOutputKg = headRice.plus(brokenRice).plus(riceBran).plus(husk);
    if (totalOutputKg.gt(inputKg)) {
      throw new BadRequestException('Total output quantity cannot exceed input paddy quantity.');
    }

    const processLossKg = Prisma.Decimal.max(0, inputKg.minus(totalOutputKg));
    const recoveryPct = totalOutputKg.div(inputKg).mul(100).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
    const headRiceRecoveryPct = headRice.div(inputKg).mul(100).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.tollOrder.findFirst({
          where: { id: orderId, companyId: dto.companyId, factoryId: dto.factoryId },
        });

        if (!order) throw new NotFoundException('Toll order not found in this factory.');
        if (order.status === TollOrderStatus.CANCELLED || order.status === TollOrderStatus.COMPLETED) {
          throw new BadRequestException('Batches can only be created against active or in-process toll orders.');
        }

        const remainingPaddy = order.receivedQuantityKg.minus(order.processedQuantityKg);
        if (inputKg.gt(remainingPaddy)) {
          throw new BadRequestException(
            `Input paddy ${inputKg.toFixed(3)} KG exceeds remaining unprocessed custody paddy of ${remainingPaddy.toFixed(3)} KG.`,
          );
        }

        const batch = await tx.tollBatch.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            tollOrderId: order.id,
            batchNumber: dto.batchNumber.trim().toUpperCase(),
            status: DocumentStatus.POSTED,
            inputPaddyKg: inputKg,
            headRiceKg: headRice,
            brokenRiceKg: brokenRice,
            riceBranKg: riceBran,
            huskKg: husk,
            totalOutputKg,
            processLossKg,
            recoveryPct,
            headRiceRecoveryPct,
            startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
            completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });

        // Update Toll Order cumulative figures
        const newProcessedKg = order.processedQuantityKg.plus(inputKg);
        const newRiceProducedKg = order.totalRiceProducedKg.plus(headRice).plus(brokenRice);
        const newByProductProducedKg = order.totalByProductProducedKg.plus(riceBran).plus(husk);

        const newTollCharge = this.calculateTollCharge(newProcessedKg, order.receivedBagCount, order.tollRate, order.tollRateBasis);
        const newTotalAmount = newTollCharge.plus(order.additionalCharges);

        const nextStatus =
          newProcessedKg.gte(order.receivedQuantityKg) && order.totalRiceDeliveredKg.gte(newRiceProducedKg)
            ? TollOrderStatus.COMPLETED
            : TollOrderStatus.IN_PROCESS;

        await tx.tollOrder.update({
          where: { id: order.id },
          data: {
            processedQuantityKg: newProcessedKg,
            totalRiceProducedKg: newRiceProducedKg,
            totalByProductProducedKg: newByProductProducedKg,
            tollChargeAmount: newTollCharge,
            totalAmount: newTotalAmount,
            status: nextStatus,
            ...(nextStatus === TollOrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
          },
        });

        await this.audit(tx, dto.companyId, userId, 'CREATE_BATCH', batch.id, undefined, batch);
        return batch;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createDelivery(orderId: string, dto: CreateTollDeliveryDto, userId: string) {
    const riceKg = new Prisma.Decimal(dto.riceDeliveredKg);
    const brokenRiceKg = dto.brokenRiceDeliveredKg ? new Prisma.Decimal(dto.brokenRiceDeliveredKg) : new Prisma.Decimal(0);
    const byProductKg = dto.byProductDeliveredKg ? new Prisma.Decimal(dto.byProductDeliveredKg) : new Prisma.Decimal(0);

    const totalRiceDelivered = riceKg.plus(brokenRiceKg);
    const totalDelivered = totalRiceDelivered.plus(byProductKg);

    if (!totalDelivered.gt(0)) {
      throw new BadRequestException('Delivered quantity must be greater than zero.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.tollOrder.findFirst({
          where: { id: orderId, companyId: dto.companyId, factoryId: dto.factoryId },
        });

        if (!order) throw new NotFoundException('Toll order not found in this factory.');
        if (order.status === TollOrderStatus.CANCELLED) {
          throw new BadRequestException('Cannot deliver from a cancelled toll order.');
        }

        const availableRice = order.totalRiceProducedKg.minus(order.totalRiceDeliveredKg);
        if (totalRiceDelivered.gt(availableRice)) {
          throw new BadRequestException(
            `Delivered rice ${totalRiceDelivered.toFixed(3)} KG exceeds undelivered produced rice in custody (${availableRice.toFixed(3)} KG).`,
          );
        }

        if (order.byProductPolicy === ByProductPolicy.RETURN_TO_CUSTOMER) {
          const availableByProducts = order.totalByProductProducedKg.minus(order.totalByProductDeliveredKg);
          if (byProductKg.gt(availableByProducts)) {
            throw new BadRequestException(
              `Delivered by-products ${byProductKg.toFixed(3)} KG exceed undelivered by-products in custody (${availableByProducts.toFixed(3)} KG).`,
            );
          }
        }

        const delivery = await tx.tollDelivery.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            tollOrderId: order.id,
            deliveryNumber: dto.deliveryNumber.trim().toUpperCase(),
            gatePassNumber: dto.gatePassNumber.trim().toUpperCase(),
            status: DocumentStatus.POSTED,
            deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : new Date(),
            vehicleNumber: dto.vehicleNumber.trim().toUpperCase(),
            driverName: dto.driverName.trim(),
            driverMobile: dto.driverMobile?.trim() || null,
            totalBags: dto.totalBags ?? 0,
            riceDeliveredKg: riceKg,
            brokenRiceDeliveredKg: brokenRiceKg,
            byProductDeliveredKg: byProductKg,
            totalDeliveredKg: totalDelivered,
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
            postedById: userId,
            postedAt: new Date(),
          },
        });

        const newRiceDelivered = order.totalRiceDeliveredKg.plus(totalRiceDelivered);
        const newByProductDelivered = order.totalByProductDeliveredKg.plus(byProductKg);

        const nextStatus =
          order.processedQuantityKg.gte(order.receivedQuantityKg) && newRiceDelivered.gte(order.totalRiceProducedKg)
            ? TollOrderStatus.COMPLETED
            : order.status;

        await tx.tollOrder.update({
          where: { id: order.id },
          data: {
            totalRiceDeliveredKg: newRiceDelivered,
            totalByProductDeliveredKg: newByProductDelivered,
            status: nextStatus,
            ...(nextStatus === TollOrderStatus.COMPLETED ? { completedAt: new Date() } : {}),
          },
        });

        await this.audit(tx, dto.companyId, userId, 'CREATE_DELIVERY', delivery.id, undefined, delivery);
        return delivery;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelOrder(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.tollOrder.findFirst({
        where: { id, companyId, factoryId },
        include: { batches: true, deliveries: true },
      });

      if (!order) throw new NotFoundException('Toll order not found in this factory.');
      if (order.status === TollOrderStatus.COMPLETED) {
        throw new BadRequestException('Completed toll orders cannot be cancelled.');
      }
      if (order.batches.length > 0 || order.deliveries.length > 0) {
        throw new BadRequestException('Cannot cancel a toll order that has recorded milling batches or deliveries.');
      }

      const updated = await tx.tollOrder.update({
        where: { id },
        data: { status: TollOrderStatus.CANCELLED },
        include: tollOrderInclude,
      });

      await this.audit(tx, companyId, userId, 'CANCEL_ORDER', id, order, updated);
      return updated;
    });
  }
}

