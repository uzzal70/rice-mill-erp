import { BadRequestException } from '@nestjs/common';
import { BrokerCommissionType, PartnerType, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PartnersService } from './partners.service';
import { PrismaService } from '../../common/prisma.service';
import { CreateBrokerDto, ListPartnerLedgerDto, PartnerFinancialDto, UpdatePartnerDto } from './partners.dto';

describe('PartnersService', () => {
  const prisma: any = {
    partner: { findFirst: jest.fn() },
    goodsReceipt: { findMany: jest.fn(), count: jest.fn() },
    purchaseInvoice: { aggregate: jest.fn() },
    salesOrder: { findMany: jest.fn(), count: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const service = new PartnersService(prisma as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.purchaseInvoice.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
  });

  it('redacts bank and financial fields from ordinary partner reads', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'partner-1', companyId: 'company-1', type: PartnerType.SUPPLIER, name: 'Supplier', code: 'SUP-1',
      bankName: 'Test Bank', bankAccount: '0123456789', paymentMethod: 'BANK', creditLimit: '1000', paymentTermsDays: 30,
      commissionType: null, commissionRate: null, openingBalance: '25',
    });
    const result = await service.get('partner-1', 'company-1');
    expect(prisma.partner.findFirst).toHaveBeenCalledWith({ where: { id: 'partner-1', companyId: 'company-1' } });
    expect(result).not.toHaveProperty('bankAccount');
    expect(result).not.toHaveProperty('creditLimit');
    expect(result).toMatchObject({ hasBankAccount: true, hasOpeningBalance: true });
  });

  it('lists only posted company-scoped purchase receipts and summarizes gross amount', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'supplier-1',
      type: PartnerType.SUPPLIER,
      openingBalance: '250.00',
    });
    const receipt = {
      id: 'grn-1',
      receiptNumber: 'GRN-1',
      postedAt: new Date('2026-10-01T10:00:00Z'),
      quantity: new Prisma.Decimal('1250'),
      unit: 'KG',
      purchaseOrder: {
        orderNumber: 'PO-1',
        unitRate: new Prisma.Decimal('32'),
        orderedQuantity: new Prisma.Decimal('2500'),
        payableQuantityKg: new Prisma.Decimal('2400'),
        adjustedUnitRate: new Prisma.Decimal('30'),
        item: { id: 'paddy-1', name: 'BRRI Dhan 29', code: 'BR29' },
      },
      factory: { id: 'factory-1', name: 'Bogura Factory', code: 'BOG' },
    };
    prisma.goodsReceipt.findMany.mockResolvedValue([receipt]);
    prisma.goodsReceipt.count.mockResolvedValue(1);
    prisma.$queryRaw.mockResolvedValue([{
      receivedQuantity: new Prisma.Decimal('1250'),
      grossPurchaseAmount: new Prisma.Decimal('36000'),
    }]);
    prisma.purchaseInvoice.aggregate.mockResolvedValue({
      _count: { _all: 1 },
      _sum: {
        grossAmount: new Prisma.Decimal('36000'),
        qualityDeductionAmount: new Prisma.Decimal('15'),
        netSupplierPayable: new Prisma.Decimal('35985'),
        transportCost: new Prisma.Decimal('100'),
        loadingCost: new Prisma.Decimal('25'),
        unloadingCost: new Prisma.Decimal('30'),
        otherCost: new Prisma.Decimal('5'),
      },
    });

    const result = await service.listLedger('supplier-1', { companyId: 'company-1', page: 1, pageSize: 25 });

    expect(prisma.goodsReceipt.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'company-1', status: 'POSTED', purchaseOrder: { supplierId: 'supplier-1' } },
      skip: 0,
      take: 25,
    }));
    expect(result.purchases).toEqual({
      postedReceiptCount: 1,
      receivedQuantityKg: new Prisma.Decimal('1250'),
      grossPurchaseAmount: new Prisma.Decimal('36000'),
      postedInvoiceCount: 1,
      invoicedGrossAmount: new Prisma.Decimal('36000'),
      qualityDeductionAmount: new Prisma.Decimal('15'),
      netSupplierPayable: new Prisma.Decimal('35985'),
      separateOperatingCosts: new Prisma.Decimal('160'),
    });
    expect(result.data[0]).toEqual(expect.objectContaining({
      receiptNumber: 'GRN-1',
      purchaseOrderNumber: 'PO-1',
      payableQuantity: new Prisma.Decimal('1200'),
      grossAmount: new Prisma.Decimal('36000'),
      item: { id: 'paddy-1', name: 'BRRI Dhan 29', code: 'BR29' },
    }));
  });

  it('does not expose a partner ledger across company boundaries', async () => {
    prisma.partner.findFirst.mockResolvedValue(null);
    await expect(service.listLedger('supplier-1', { companyId: 'company-other', page: 1, pageSize: 25 }))
      .rejects.toThrow('Partner not found.');
    expect(prisma.goodsReceipt.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns zero posted purchase totals when a supplier has no posted receipts', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'supplier-1',
      type: PartnerType.FARMER,
      openingBalance: '1000.00',
    });
    prisma.goodsReceipt.findMany.mockResolvedValue([]);
    prisma.goodsReceipt.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.listLedger('supplier-1', { companyId: 'company-1', page: 1, pageSize: 25 });

    expect(result.purchases).toEqual({
      postedReceiptCount: 0,
      receivedQuantityKg: new Prisma.Decimal(0),
      grossPurchaseAmount: new Prisma.Decimal(0),
      postedInvoiceCount: 0,
      invoicedGrossAmount: new Prisma.Decimal(0),
      qualityDeductionAmount: new Prisma.Decimal(0),
      netSupplierPayable: new Prisma.Decimal(0),
      separateOperatingCosts: new Prisma.Decimal(0),
    });
    expect(result.partner.openingBalance).toBe('1000.00');
    expect(result.data).toEqual([]);
  });

  it('rejects purchase-ledger access for customers and brokers', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'customer-1',
      type: PartnerType.CUSTOMER,
      openingBalance: '0',
    });
    await expect(service.listLedger('customer-1', { companyId: 'company-1', page: 1, pageSize: 25 }))
      .rejects.toThrow('Purchase ledgers are available only for suppliers and farmers.');
    expect(prisma.goodsReceipt.findMany).not.toHaveBeenCalled();
  });

  it('lists customer ledger with orders, total due, and credit limit tracking', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'customer-1',
      type: PartnerType.CUSTOMER,
      name: 'Rahim Rice Trading',
      businessName: 'Rahim Agency',
      code: 'CUST-01',
      phone: '01711111111',
      creditLimit: new Prisma.Decimal('500000.00'),
      paymentTermsDays: 15,
      openingBalance: new Prisma.Decimal('25000.00'),
    });
    prisma.salesOrder.findMany
      .mockResolvedValueOnce([
        {
          id: 'so-1',
          orderNumber: 'SO-101',
          totalAmount: new Prisma.Decimal('100000.00'),
          channel: 'WHOLESALE',
          status: 'APPROVED',
          lines: [],
        },
      ])
      .mockResolvedValueOnce([{ totalAmount: new Prisma.Decimal('100000.00') }]);
    prisma.salesOrder.count.mockResolvedValue(1);

    const result = await service.listCustomerLedger('customer-1', { companyId: 'company-1', page: 1, pageSize: 25 });
    expect(result.partner.code).toBe('CUST-01');
    expect(result.partner.creditLimit).toBe('500000.00');
    expect(result.summary.openingBalance).toEqual(new Prisma.Decimal('25000.00'));
    expect(result.summary.totalApprovedOrders).toEqual(new Prisma.Decimal('100000.00'));
    expect(result.summary.totalDue).toEqual(new Prisma.Decimal('125000.00'));
    expect(result.summary.availableCredit).toEqual(new Prisma.Decimal('375000.00'));
    expect(result.data).toHaveLength(1);
  });

  it('rejects customer-ledger access for non-customer partners', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'supplier-1',
      type: PartnerType.SUPPLIER,
      openingBalance: '0',
    });
    await expect(service.listCustomerLedger('supplier-1', { companyId: 'company-1', page: 1, pageSize: 25 }))
      .rejects.toThrow('Customer ledgers are available only for customer partners.');
    expect(prisma.salesOrder.findMany).not.toHaveBeenCalled();
  });

  it('creates a normalized supplier profile with an audit event', async () => {
    const record = {
      id: 'supplier-1', companyId: 'company-1', type: PartnerType.SUPPLIER, name: 'Bogura Paddy Supplier',
      code: 'SUP-01', phone: '01700000000', bankAccount: null, openingBalance: '0',
    };
    const tx = {
      partner: { create: jest.fn().mockResolvedValue(record) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.create({
      companyId: 'company-1',
      type: PartnerType.SUPPLIER,
      name: ' Bogura Paddy Supplier ',
      code: ' sup-01 ',
      phone: '01700000000',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'supplier-1', code: 'SUP-01', hasBankAccount: false }));
    expect(tx.partner.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId: 'company-1', type: PartnerType.SUPPLIER, name: 'Bogura Paddy Supplier', code: 'SUP-01' }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('creates broker identity and commission terms atomically', async () => {
    const record = {
      id: 'broker-1',
      companyId: 'company-1',
      type: PartnerType.BROKER,
      name: 'Local Broker',
      code: 'BR-1',
      phone: '01700000000',
      commissionType: BrokerCommissionType.PER_MON,
      commissionRate: new Prisma.Decimal('2.5'),
    };
    const tx = {
      partner: { create: jest.fn().mockResolvedValue(record) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.createBroker({
      companyId: 'company-1',
      type: PartnerType.BROKER,
      name: ' Local Broker ',
      code: ' br-1 ',
      phone: ' 01700000000 ',
      commissionType: BrokerCommissionType.PER_MON,
      commissionRate: '2.5',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'broker-1', code: 'BR-1', hasCommission: true }));
    expect(tx.partner.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: PartnerType.BROKER,
        name: 'Local Broker',
        code: 'BR-1',
        commissionType: BrokerCommissionType.PER_MON,
        commissionRate: expect.any(Prisma.Decimal),
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CREATE_BROKER', resourceId: 'broker-1' }),
    }));
  });

  it('rejects generic broker creation without required commission terms', async () => {
    await expect(service.create({
      companyId: 'company-1',
      type: PartnerType.BROKER,
      name: 'Broker',
      code: 'BR-1',
    }, 'user-1')).rejects.toThrow('Create brokers through the broker master with configured commission terms.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires broker type and a positive commission rate capped for percentage', async () => {
    const base = {
      companyId: 'company-1',
      type: PartnerType.BROKER,
      name: 'Broker',
      code: 'BR-1',
      commissionType: BrokerCommissionType.PER_KG,
    };
    await expect(service.createBroker({ ...base, type: PartnerType.SUPPLIER, commissionRate: '1' } as CreateBrokerDto, 'user-1'))
      .rejects.toThrow('Broker records must use the BROKER partner type.');
    await expect(service.createBroker({ ...base, commissionRate: '0' } as CreateBrokerDto, 'user-1'))
      .rejects.toThrow('Broker commission rate must be greater than zero.');
    await expect(service.createBroker({ ...base, commissionType: BrokerCommissionType.PERCENTAGE, commissionRate: '100.0001' } as CreateBrokerDto, 'user-1'))
      .rejects.toThrow('Percentage commission cannot exceed 100.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('updates protected supplier payment defaults and opening balance atomically', async () => {
    const existing = {
      id: 'supplier-1', companyId: 'company-1', type: PartnerType.SUPPLIER,
      bankName: null, bankAccount: null, paymentMethod: null, creditLimit: null, paymentTermsDays: null,
      openingBalance: '0', commissionType: null, commissionRate: null,
    };
    prisma.partner.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, bankName: 'Sonali Bank', bankAccount: '12345', paymentMethod: 'BANK', openingBalance: '1250.00' };
    const tx = {
      partner: { update: jest.fn().mockResolvedValue(updated) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.updateFinancial('supplier-1', {
      companyId: 'company-1',
      bankName: 'Sonali Bank',
      bankAccount: '12345',
      paymentMethod: 'BANK',
      openingBalance: '1250.00',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'supplier-1', type: PartnerType.SUPPLIER }));
    expect(tx.partner.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'supplier-1' },
      data: expect.objectContaining({
        bankName: 'Sonali Bank',
        bankAccount: '12345',
        paymentMethod: 'BANK',
        openingBalance: expect.anything(),
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('allows authorized financial updates to clear optional supplier payment details', async () => {
    prisma.partner.findFirst.mockResolvedValue({
      id: 'supplier-1', companyId: 'company-1', type: PartnerType.SUPPLIER,
      bankName: 'Bank', bankAccount: '123', paymentMethod: 'BANK', creditLimit: '500', paymentTermsDays: 30,
      openingBalance: '0', commissionType: null, commissionRate: null,
    });
    const tx = {
      partner: { update: jest.fn().mockResolvedValue({ id: 'supplier-1', type: PartnerType.SUPPLIER }) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await service.updateFinancial('supplier-1', {
      companyId: 'company-1',
      bankName: null,
      bankAccount: null,
      paymentMethod: null,
      creditLimit: null,
      paymentTermsDays: null,
    }, 'user-1');
    expect(tx.partner.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { bankName: null, bankAccount: null, paymentMethod: null, creditLimit: null, paymentTermsDays: null },
    }));
  });

  it('accepts explicit nulls for clearable optional partner and financial fields', async () => {
    const profileDto = plainToInstance(UpdatePartnerDto, { companyId: 'company-1', email: null });
    const financialDto = plainToInstance(PartnerFinancialDto, {
      companyId: 'company-1',
      bankName: null,
      bankAccount: null,
      paymentMethod: null,
      creditLimit: null,
      paymentTermsDays: null,
    });

    await expect(validate(profileDto)).resolves.toHaveLength(0);
    await expect(validate(financialDto)).resolves.toHaveLength(0);
  });

  it('validates pagination on supplier ledger queries', async () => {
    const valid = plainToInstance(ListPartnerLedgerDto, { companyId: 'company-1', page: '2', pageSize: '50' });
    const invalid = plainToInstance(ListPartnerLedgerDto, { companyId: 'company-1', page: '0', pageSize: '101' });

    await expect(validate(valid)).resolves.toHaveLength(0);
    const errors = await validate(invalid);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['page', 'pageSize']));
  });

  it('validates required broker commission type and numeric rate', async () => {
    const dto = plainToInstance(CreateBrokerDto, {
      companyId: 'company-1',
      type: 'BROKER',
      name: 'Broker',
      code: 'BR-1',
      commissionType: 'INVALID',
      commissionRate: '-5',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['commissionType', 'commissionRate']));
  });

  it('requires commission terms to be paired and prevents percentages above 100', async () => {
    prisma.partner.findFirst.mockResolvedValue({ type: PartnerType.BROKER, commissionType: null, commissionRate: null });
    await expect(service.updateFinancial('broker-1', { companyId: 'company-1', commissionType: BrokerCommissionType.PERCENTAGE }, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateFinancial('broker-1', { companyId: 'company-1', commissionType: BrokerCommissionType.PERCENTAGE, commissionRate: '101' }, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
