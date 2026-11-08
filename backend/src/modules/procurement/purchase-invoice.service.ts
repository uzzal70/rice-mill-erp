import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { PurchaseActionDto } from './procurement.dto';
import { CreatePurchaseInvoiceDto, ListPurchaseInvoicesDto } from './purchase-invoice.dto';
import { amount, calculatePurchaseInvoice } from './purchase-invoice.calculations';

@Injectable()
export class PurchaseInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, invoiceId: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: {
        companyId,
        userId,
        resource: 'purchase-invoices',
        action,
        resourceId: invoiceId,
        ...(before ? { before: snapshot(before) } : {}),
        after: snapshot(after),
      },
    });
  }

  async list(query: ListPurchaseInvoicesDto) {
    const where: Prisma.PurchaseInvoiceWhereInput = {
      companyId: query.companyId,
      factoryId: query.factoryId,
      ...(query.search ? { OR: [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { goodsReceipt: { receiptNumber: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          goodsReceipt: { include: { purchaseOrder: { include: { item: true } } } },
        },
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async create(dto: CreatePurchaseInvoiceDto, userId: string) {
    const qualityDeduction = amount(dto.qualityDeductionAmount);
    const transportCost = amount(dto.transportCost);
    const loadingCost = amount(dto.loadingCost);
    const unloadingCost = amount(dto.unloadingCost);
    const otherCost = amount(dto.otherCost);
    if ([qualityDeduction, transportCost, loadingCost, unloadingCost, otherCost].some(value => value.lt(0))) {
      throw new BadRequestException('Invoice deductions and operating costs cannot be negative.');
    }

    try {
      return await this.prisma.$transaction(async tx => {
        const receipt = await tx.goodsReceipt.findFirst({
          where: { id: dto.goodsReceiptId, companyId: dto.companyId, factoryId: dto.factoryId },
          include: { purchaseOrder: true, purchaseInvoice: true },
        });
        if (!receipt) throw new NotFoundException('Goods receipt not found in this factory.');
        if (receipt.status !== DocumentStatus.POSTED) {
          throw new ConflictException('A purchase invoice can only be created from a posted goods receipt.');
        }
        if (receipt.purchaseInvoice) throw new ConflictException('This goods receipt already has a purchase invoice.');

        const amounts = calculatePurchaseInvoice(
          new Prisma.Decimal(receipt.quantity),
          new Prisma.Decimal(receipt.purchaseOrder.orderedQuantity),
          new Prisma.Decimal(receipt.purchaseOrder.payableQuantityKg),
          new Prisma.Decimal(receipt.purchaseOrder.adjustedUnitRate),
          qualityDeduction,
        );
        const invoice = await tx.purchaseInvoice.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            goodsReceiptId: receipt.id,
            purchaseOrderId: receipt.purchaseOrder.id,
            supplierId: receipt.purchaseOrder.supplierId,
            invoiceNumber: dto.invoiceNumber.trim().toUpperCase(),
            invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
            physicalQuantityKg: receipt.quantity,
            payableQuantityKg: amounts.payableQuantityKg,
            adjustedUnitRate: receipt.purchaseOrder.adjustedUnitRate,
            grossAmount: amounts.grossAmount,
            qualityDeductionAmount: amounts.qualityDeductionAmount,
            netSupplierPayable: amounts.netSupplierPayable,
            transportCost,
            loadingCost,
            unloadingCost,
            otherCost,
            remarks: dto.remarks?.trim() || null,
            createdById: userId,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'CREATE', invoice.id, undefined, invoice);
        return invoice;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A purchase invoice already exists for this GRN or invoice number.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Purchase invoice records changed while creating this invoice. Refresh and retry.');
      }
      throw error;
    }
  }

  async approve(id: string, dto: PurchaseActionDto, userId: string) {
    return this.prisma.$transaction(async tx => {
      const invoice = await tx.purchaseInvoice.findFirst({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId } });
      if (!invoice) throw new NotFoundException('Purchase invoice not found in this factory.');
      if (invoice.status !== DocumentStatus.DRAFT) throw new ConflictException('Only draft purchase invoices can be approved.');
      const changed = await tx.purchaseInvoice.updateMany({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.APPROVED, approvedById: userId, approvedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Purchase invoice changed while approval was being recorded.');
      const after = await tx.purchaseInvoice.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, dto.companyId, userId, 'APPROVE', id, invoice, after);
      return after;
    });
  }

  async post(id: string, dto: PurchaseActionDto, userId: string) {
    return this.prisma.$transaction(async tx => {
      const invoice = await tx.purchaseInvoice.findFirst({ where: { id, companyId: dto.companyId, factoryId: dto.factoryId } });
      if (!invoice) throw new NotFoundException('Purchase invoice not found in this factory.');
      if (invoice.status !== DocumentStatus.APPROVED) throw new ConflictException('Only approved purchase invoices can be posted.');
      const changed = await tx.purchaseInvoice.updateMany({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: DocumentStatus.APPROVED },
        data: { status: DocumentStatus.POSTED, postedById: userId, postedAt: new Date() },
      });
      if (changed.count !== 1) throw new ConflictException('Purchase invoice changed while posting was being recorded.');
      const after = await tx.purchaseInvoice.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, dto.companyId, userId, 'POST', id, invoice, after);
      return after;
    });
  }
}
