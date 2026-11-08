import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BrokerCommissionType, DocumentStatus, PartnerType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateBrokerDto, CreatePartnerDto, ListPartnerLedgerDto, ListPartnersDto, PartnerFinancialDto, UpdatePartnerDto } from './partners.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  private publicRecord<T extends { bankName?: string | null; bankAccount?: string | null; paymentMethod?: string | null; creditLimit?: unknown; paymentTermsDays?: number | null; commissionType?: BrokerCommissionType | null; commissionRate?: unknown; openingBalance?: unknown }>(record: T) {
    const { bankName, bankAccount, paymentMethod, creditLimit, paymentTermsDays, commissionType, commissionRate, openingBalance, ...safe } = record;
    return { ...safe, hasBankAccount: Boolean(bankAccount), hasCommission: commissionType != null, hasOpeningBalance: openingBalance != null };
  }

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, action, resource: 'partners', resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  async list(query: ListPartnersDto) {
    const where: Prisma.PartnerWhereInput = {
      companyId: query.companyId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ] } : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.partner.findMany({ where, orderBy: [{ name: 'asc' }, { code: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.partner.count({ where }),
    ]);
    return { success: true, data: records.map(record => this.publicRecord(record)), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(id: string, companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required.');
    const record = await this.prisma.partner.findFirst({ where: { id, companyId } });
    if (!record) throw new NotFoundException('Partner not found.');
    return this.publicRecord(record);
  }

  async getFinancial(id: string, companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required.');
    const record = await this.prisma.partner.findFirst({
      where: { id, companyId },
      select: { id: true, type: true, bankName: true, bankAccount: true, paymentMethod: true, creditLimit: true, paymentTermsDays: true, commissionType: true, commissionRate: true, openingBalance: true },
    });
    if (!record) throw new NotFoundException('Partner not found.');
    return record;
  }

  async listLedger(id: string, query: ListPartnerLedgerDto) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, companyId: query.companyId },
      select: { id: true, type: true, openingBalance: true },
    });
    if (!partner) throw new NotFoundException('Partner not found.');
    if (partner.type !== PartnerType.SUPPLIER && partner.type !== PartnerType.FARMER) {
      throw new BadRequestException('Purchase ledgers are available only for suppliers and farmers.');
    }
    const where: Prisma.GoodsReceiptWhereInput = {
      companyId: query.companyId,
      status: 'POSTED',
      purchaseOrder: { supplierId: id },
    };
    const [receipts, total, totals, purchaseInvoices] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          purchaseOrder: { include: { item: { select: { id: true, name: true, code: true } } } },
          purchaseInvoice: true,
          factory: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.goodsReceipt.count({ where }),
      this.prisma.$queryRaw<Array<{ receivedQuantity: Prisma.Decimal; grossPurchaseAmount: Prisma.Decimal }>>`
        SELECT
          COALESCE(SUM(gr."quantity"), 0)::numeric AS "receivedQuantity",
          COALESCE(SUM(gr."quantity" * po."payableQuantityKg" / NULLIF(po."orderedQuantity", 0) * po."adjustedUnitRate"), 0)::numeric AS "grossPurchaseAmount"
        FROM "GoodsReceipt" gr
        INNER JOIN "PurchaseOrder" po
          ON po."companyId" = gr."companyId"
          AND po."factoryId" = gr."factoryId"
          AND po."id" = gr."purchaseOrderId"
        WHERE gr."companyId" = ${query.companyId}
          AND po."supplierId" = ${id}
          AND gr."status" = 'POSTED'
      `,
      this.prisma.purchaseInvoice.aggregate({
        where: { companyId: query.companyId, supplierId: id, status: 'POSTED' },
        _count: { _all: true },
        _sum: {
          grossAmount: true,
          qualityDeductionAmount: true,
          netSupplierPayable: true,
          transportCost: true,
          loadingCost: true,
          unloadingCost: true,
          otherCost: true,
        },
      }),
    ]);
    return {
      partner: { id: partner.id, type: partner.type, openingBalance: partner.openingBalance },
      purchases: {
        postedReceiptCount: total,
        receivedQuantityKg: totals[0]?.receivedQuantity ?? new Prisma.Decimal(0),
        grossPurchaseAmount: totals[0]?.grossPurchaseAmount ?? new Prisma.Decimal(0),
        postedInvoiceCount: purchaseInvoices._count._all,
        invoicedGrossAmount: purchaseInvoices._sum.grossAmount ?? new Prisma.Decimal(0),
        qualityDeductionAmount: purchaseInvoices._sum.qualityDeductionAmount ?? new Prisma.Decimal(0),
        netSupplierPayable: purchaseInvoices._sum.netSupplierPayable ?? new Prisma.Decimal(0),
        separateOperatingCosts: [
          purchaseInvoices._sum.transportCost,
          purchaseInvoices._sum.loadingCost,
          purchaseInvoices._sum.unloadingCost,
          purchaseInvoices._sum.otherCost,
        ].reduce<Prisma.Decimal>((total, cost) => total.plus(cost ?? new Prisma.Decimal(0)), new Prisma.Decimal(0)),
      },
      data: receipts.map(receipt => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        postedAt: receipt.postedAt,
        quantity: receipt.quantity,
        unit: receipt.unit,
        payableQuantity: receipt.quantity.mul(receipt.purchaseOrder.payableQuantityKg).div(receipt.purchaseOrder.orderedQuantity),
        purchaseOrderNumber: receipt.purchaseOrder.orderNumber,
        unitRate: receipt.purchaseOrder.adjustedUnitRate,
        grossAmount: receipt.quantity
          .mul(receipt.purchaseOrder.payableQuantityKg)
          .div(receipt.purchaseOrder.orderedQuantity)
          .mul(receipt.purchaseOrder.adjustedUnitRate),
        item: receipt.purchaseOrder.item,
        factory: receipt.factory,
        purchaseInvoice: receipt.purchaseInvoice?.status === 'POSTED' ? {
          invoiceNumber: receipt.purchaseInvoice.invoiceNumber,
          grossAmount: receipt.purchaseInvoice.grossAmount,
          qualityDeductionAmount: receipt.purchaseInvoice.qualityDeductionAmount,
          netSupplierPayable: receipt.purchaseInvoice.netSupplierPayable,
          operatingCosts: receipt.purchaseInvoice.transportCost
            .plus(receipt.purchaseInvoice.loadingCost)
            .plus(receipt.purchaseInvoice.unloadingCost)
            .plus(receipt.purchaseInvoice.otherCost),
        } : null,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async listCustomerLedger(id: string, query: ListPartnerLedgerDto) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, companyId: query.companyId },
    });
    if (!partner) throw new NotFoundException('Partner not found.');
    if (partner.type !== PartnerType.CUSTOMER) {
      throw new BadRequestException('Customer ledgers are available only for customer partners.');
    }

    const where: Prisma.SalesOrderWhereInput = {
      companyId: query.companyId,
      customerId: id,
    };

    const [orders, total, approvedOrders] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          lines: { include: { item: true, stack: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          factory: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.salesOrder.count({ where }),
      this.prisma.salesOrder.findMany({
        where: { ...where, status: DocumentStatus.APPROVED },
        select: { totalAmount: true },
      }),
    ]);

    const openingBalance = partner.openingBalance ?? new Prisma.Decimal(0);
    const totalApprovedOrders = approvedOrders.reduce(
      (sum, o) => sum.plus(o.totalAmount),
      new Prisma.Decimal(0),
    );
    const totalInvoiced = new Prisma.Decimal(0);
    const totalPaid = new Prisma.Decimal(0);
    const totalDue = openingBalance.plus(totalApprovedOrders).minus(totalPaid);
    const availableCredit = partner.creditLimit ? partner.creditLimit.minus(totalDue) : null;

    return {
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        businessName: partner.businessName,
        code: partner.code,
        phone: partner.phone,
        email: partner.email,
        address: partner.address,
        nid: partner.nid,
        tin: partner.tin,
        bin: partner.bin,
        creditLimit: partner.creditLimit ? partner.creditLimit.toFixed(2) : null,
        paymentTermsDays: partner.paymentTermsDays,
        openingBalance: openingBalance.toFixed(2),
      },
      summary: {
        openingBalance,
        totalApprovedOrders,
        totalInvoiced,
        totalPaid,
        totalDue,
        availableCredit,
      },
      data: orders,
      meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async create(dto: CreatePartnerDto, userId: string) {
    if (dto.type === PartnerType.BROKER) {
      throw new BadRequestException('Create brokers through the broker master with configured commission terms.');
    }
    const data = { ...dto, companyId: dto.companyId, type: dto.type, name: dto.name.trim(), code: dto.code.trim().toUpperCase() };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.partner.create({ data });
        await this.audit(tx, dto.companyId, userId, 'CREATE', record.id, undefined, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A partner with this code already exists in the company.');
      throw error;
    }
  }

  async createBroker(dto: CreateBrokerDto, userId: string) {
    if (dto.type !== PartnerType.BROKER) throw new BadRequestException('Broker records must use the BROKER partner type.');
    const commissionRate = new Prisma.Decimal(dto.commissionRate);
    if (commissionRate.lte(0)) throw new BadRequestException('Broker commission rate must be greater than zero.');
    if (dto.commissionType === BrokerCommissionType.PERCENTAGE && commissionRate.gt(100)) {
      throw new BadRequestException('Percentage commission cannot exceed 100.');
    }
    const data: Prisma.PartnerCreateInput = {
      company: { connect: { id: dto.companyId } },
      type: PartnerType.BROKER,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      ...(dto.businessName !== undefined ? { businessName: dto.businessName.trim() || null } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
      ...(dto.nid !== undefined ? { nid: dto.nid.trim() || null } : {}),
      ...(dto.tin !== undefined ? { tin: dto.tin.trim() || null } : {}),
      ...(dto.bin !== undefined ? { bin: dto.bin.trim() || null } : {}),
      commissionType: dto.commissionType,
      commissionRate,
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.partner.create({ data });
        await this.audit(tx, dto.companyId, userId, 'CREATE_BROKER', record.id, undefined, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A broker with this code already exists in the company.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePartnerDto, userId: string) {
    const existing = await this.prisma.partner.findFirst({ where: { id, companyId: dto.companyId } });
    if (!existing) throw new NotFoundException('Partner not found.');
    const data: Prisma.PartnerUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.businessName !== undefined ? { businessName: dto.businessName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.nid !== undefined ? { nid: dto.nid } : {}),
      ...(dto.tin !== undefined ? { tin: dto.tin } : {}),
      ...(dto.bin !== undefined ? { bin: dto.bin } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.partner.update({ where: { id }, data });
        await this.audit(tx, dto.companyId, userId, 'UPDATE', id, existing, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A partner with this code already exists in the company.');
      throw error;
    }
  }

  async updateFinancial(id: string, dto: PartnerFinancialDto, userId: string) {
    const existing = await this.prisma.partner.findFirst({ where: { id, companyId: dto.companyId } });
    if (!existing) throw new NotFoundException('Partner not found.');
    const commissionChanged = dto.commissionType !== undefined || dto.commissionRate !== undefined;
    const commissionType = dto.commissionType ?? existing.commissionType;
    const commissionRate = dto.commissionRate ?? (existing.commissionRate == null ? null : existing.commissionRate.toString());
    if (commissionChanged && existing.type !== PartnerType.BROKER) throw new BadRequestException('Commission terms are only valid for brokers.');
    if (commissionChanged && (!commissionType || commissionRate == null)) throw new BadRequestException('Broker commission type and rate must be set together.');
    if (commissionChanged && commissionType === BrokerCommissionType.PERCENTAGE && new Prisma.Decimal(commissionRate!).gt(100)) throw new BadRequestException('Percentage commission cannot exceed 100.');
    const data: Prisma.PartnerUpdateInput = {
      ...(dto.bankName !== undefined ? { bankName: dto.bankName ?? null } : {}),
      ...(dto.bankAccount !== undefined ? { bankAccount: dto.bankAccount ?? null } : {}),
      ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod ?? null } : {}),
      ...(dto.creditLimit !== undefined ? { creditLimit: dto.creditLimit === null ? null : new Prisma.Decimal(dto.creditLimit) } : {}),
      ...(dto.paymentTermsDays !== undefined ? { paymentTermsDays: dto.paymentTermsDays ?? null } : {}),
      ...(dto.openingBalance !== undefined ? { openingBalance: new Prisma.Decimal(dto.openingBalance) } : {}),
      ...(dto.commissionType !== undefined ? { commissionType: dto.commissionType } : {}),
      ...(dto.commissionRate !== undefined ? { commissionRate: new Prisma.Decimal(dto.commissionRate) } : {}),
    };
    if (Object.keys(data).length === 0) throw new BadRequestException('Provide at least one financial field to update.');
    return this.prisma.$transaction(async tx => {
      const record = await tx.partner.update({ where: { id }, data });
      await this.audit(tx, dto.companyId, userId, 'UPDATE_FINANCIAL', id, existing, record);
      return { id: record.id, type: record.type, updatedAt: record.updatedAt };
    });
  }
}
