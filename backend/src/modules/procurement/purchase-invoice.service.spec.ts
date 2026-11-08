import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { PurchaseInvoiceService } from './purchase-invoice.service';

describe('PurchaseInvoiceService', () => {
  const tx: any = {
    goodsReceipt: { findFirst: jest.fn() },
    purchaseInvoice: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new PurchaseInvoiceService(prisma as PrismaService);
  const dto = {
    companyId: 'company-1',
    factoryId: 'factory-1',
    goodsReceiptId: 'grn-1',
    invoiceNumber: ' inv-1 ',
    qualityDeductionAmount: '15',
    transportCost: '100',
    loadingCost: '25',
    unloadingCost: '30',
    otherCost: '5',
  };
  const receipt = {
    id: 'grn-1',
    status: DocumentStatus.POSTED,
    quantity: new Prisma.Decimal(1250),
    purchaseOrder: {
      id: 'po-1',
      supplierId: 'supplier-1',
      orderedQuantity: new Prisma.Decimal(2500),
      payableQuantityKg: new Prisma.Decimal(2400),
      adjustedUnitRate: new Prisma.Decimal(30),
    },
    purchaseInvoice: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.goodsReceipt.findFirst.mockResolvedValue(receipt);
    tx.purchaseInvoice.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'invoice-1', ...data }));
    tx.purchaseInvoice.findFirst.mockResolvedValue({ id: 'invoice-1', status: DocumentStatus.APPROVED });
    tx.purchaseInvoice.updateMany.mockResolvedValue({ count: 1 });
    tx.purchaseInvoice.findUniqueOrThrow.mockResolvedValue({ id: 'invoice-1', status: DocumentStatus.POSTED });
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates a GRN-linked invoice with moisture-adjusted value, manual quality deduction, and separate costs', async () => {
    const result = await service.create(dto, 'user-1');

    expect(tx.purchaseInvoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        factoryId: 'factory-1',
        goodsReceiptId: 'grn-1',
        purchaseOrderId: 'po-1',
        supplierId: 'supplier-1',
        invoiceNumber: 'INV-1',
        physicalQuantityKg: new Prisma.Decimal(1250),
        payableQuantityKg: new Prisma.Decimal(1200),
        adjustedUnitRate: new Prisma.Decimal(30),
        grossAmount: new Prisma.Decimal(36000),
        qualityDeductionAmount: new Prisma.Decimal(15),
        netSupplierPayable: new Prisma.Decimal(35985),
        transportCost: new Prisma.Decimal(100),
        loadingCost: new Prisma.Decimal(25),
        unloadingCost: new Prisma.Decimal(30),
        otherCost: new Prisma.Decimal(5),
        createdById: 'user-1',
      }),
    });
    expect(result.netSupplierPayable).toEqual(new Prisma.Decimal(35985));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CREATE', resource: 'purchase-invoices', resourceId: 'invoice-1' }),
    }));
  });

  it('requires a posted GRN and rejects quality deductions greater than gross purchase value', async () => {
    tx.goodsReceipt.findFirst.mockResolvedValue({ ...receipt, status: DocumentStatus.APPROVED });
    await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.purchaseInvoice.create).not.toHaveBeenCalled();

    tx.goodsReceipt.findFirst.mockResolvedValue(receipt);
    await expect(service.create({ ...dto, qualityDeductionAmount: '36000.01' }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.purchaseInvoice.create).not.toHaveBeenCalled();
  });

  it('approves drafts and posts only approved invoices with audited state changes', async () => {
    tx.purchaseInvoice.findFirst
      .mockResolvedValueOnce({ id: 'invoice-1', status: DocumentStatus.DRAFT })
      .mockResolvedValueOnce({ id: 'invoice-1', status: DocumentStatus.APPROVED });
    tx.purchaseInvoice.findUniqueOrThrow
      .mockResolvedValueOnce({ id: 'invoice-1', status: DocumentStatus.APPROVED })
      .mockResolvedValueOnce({ id: 'invoice-1', status: DocumentStatus.POSTED });
    await expect(service.approve('invoice-1', { companyId: 'company-1', factoryId: 'factory-1' }, 'user-2'))
      .resolves.toEqual(expect.objectContaining({ status: DocumentStatus.APPROVED }));
    expect(tx.purchaseInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'invoice-1', companyId: 'company-1', factoryId: 'factory-1', status: DocumentStatus.DRAFT },
      data: expect.objectContaining({ status: DocumentStatus.APPROVED, approvedById: 'user-2' }),
    }));

    await expect(service.post('invoice-1', { companyId: 'company-1', factoryId: 'factory-1' }, 'user-3'))
      .resolves.toEqual(expect.objectContaining({ status: DocumentStatus.POSTED }));
    expect(tx.purchaseInvoice.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'invoice-1', companyId: 'company-1', factoryId: 'factory-1', status: DocumentStatus.APPROVED },
      data: expect.objectContaining({ status: DocumentStatus.POSTED, postedById: 'user-3' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(2);
  });
});
