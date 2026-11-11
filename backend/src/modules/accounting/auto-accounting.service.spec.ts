import { Test, TestingModule } from '@nestjs/testing';
import { AutoAccountingService } from './auto-accounting.service';
import { AccountType, JournalStatus, VoucherType, Prisma } from '@prisma/client';

describe('AutoAccountingService', () => {
  let service: AutoAccountingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AutoAccountingService],
    }).compile();

    service = module.get<AutoAccountingService>(AutoAccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('postPurchaseInvoice', () => {
    it('should generate balanced double-entry journal for purchase invoice', async () => {
      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'j-1', ...args.data })),
        },
        account: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code === '1060') return Promise.resolve({ id: 'acc-1060', code: '1060', name: 'Raw Paddy' });
            if (where.code === '2010') return Promise.resolve({ id: 'acc-2010', code: '2010', name: 'Accounts Payable' });
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: `acc-${args.data.code}`, ...args.data })),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.postPurchaseInvoice(
        mockTx,
        {
          id: 'inv-123',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          invoiceNumber: 'PINV-001',
          supplierId: 'supp-1',
          payableAmount: new Prisma.Decimal(150000),
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTx.journal.create).toHaveBeenCalled();
      const createArgs = mockTx.journal.create.mock.calls[0][0];
      expect(createArgs.data.voucherType).toBe(VoucherType.PURCHASE);
      expect(createArgs.data.status).toBe(JournalStatus.POSTED);

      const lines = createArgs.data.lines.create;
      expect(lines).toHaveLength(2);
      // Dr Inventory (Debit = 150000, Credit = 0)
      expect(lines[0].accountCode).toBe('1060');
      expect(Number(lines[0].debit)).toBe(150000);
      expect(Number(lines[0].credit)).toBe(0);
      // Cr Payable (Debit = 0, Credit = 150000)
      expect(lines[1].accountCode).toBe('2010');
      expect(Number(lines[1].debit)).toBe(0);
      expect(Number(lines[1].credit)).toBe(150000);
    });

    it('should skip if amount is zero or negative', async () => {
      const mockTx: any = {
        journal: { findUnique: jest.fn() },
      };

      const result = await service.postPurchaseInvoice(
        mockTx,
        {
          id: 'inv-zero',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          invoiceNumber: 'PINV-000',
          supplierId: 'supp-1',
          payableAmount: new Prisma.Decimal(0),
        },
        'user-1',
      );

      expect(result).toBeNull();
      expect(mockTx.journal.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('postSalesDispatch', () => {
    it('should generate balanced double-entry journal for sales dispatch', async () => {
      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'j-sales', ...args.data })),
        },
        account: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code === '1050') return Promise.resolve({ id: 'acc-1050', code: '1050', name: 'AR' });
            if (where.code === '4010') return Promise.resolve({ id: 'acc-4010', code: '4010', name: 'Sales Revenue' });
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: `acc-${args.data.code}`, ...args.data })),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.postSalesDispatch(
        mockTx,
        {
          id: 'disp-1',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          deliveryNumber: 'DISP-001',
          customerId: 'cust-1',
          lines: [{ dispatchedKg: 1000, salesOrderLine: { unitRate: 60 } }],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      const createArgs = mockTx.journal.create.mock.calls[0][0];
      expect(createArgs.data.voucherType).toBe(VoucherType.SALES);
      expect(Number(createArgs.data.totalAmount)).toBe(60000);

      const lines = createArgs.data.lines.create;
      expect(lines).toHaveLength(2);
      // Dr AR
      expect(lines[0].accountCode).toBe('1050');
      expect(Number(lines[0].debit)).toBe(60000);
      // Cr Revenue
      expect(lines[1].accountCode).toBe('4010');
      expect(Number(lines[1].credit)).toBe(60000);
    });
  });

  describe('postProductionBatch', () => {
    it('should generate balanced double-entry journal for production conversion', async () => {
      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'j-prd', ...args.data })),
        },
        account: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.code === '1070') return Promise.resolve({ id: 'acc-1070', code: '1070' });
            if (where.code === '1080') return Promise.resolve({ id: 'acc-1080', code: '1080' });
            if (where.code === '5010') return Promise.resolve({ id: 'acc-5010', code: '5010' });
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: `acc-${args.data.code}`, ...args.data })),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.postProductionBatch(
        mockTx,
        {
          id: 'batch-1',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          batchNumber: 'BATCH-001',
          inputQuantityKg: 10000,
        },
        'user-1',
      );

      expect(result).toBeDefined();
      const createArgs = mockTx.journal.create.mock.calls[0][0];
      const lines = createArgs.data.lines.create;
      expect(lines).toHaveLength(3);

      const totalDebit = lines.reduce((acc: number, l: any) => acc + Number(l.debit), 0);
      const totalCredit = lines.reduce((acc: number, l: any) => acc + Number(l.credit), 0);
      expect(totalDebit).toBeCloseTo(totalCredit, 2);
    });
  });

  describe('postCustomerReceipt & postSupplierPayment', () => {
    it('should generate customer receipt voucher', async () => {
      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'j-rcpt', ...args.data })),
        },
        account: {
          findFirst: jest.fn().mockResolvedValue({ id: 'acc-1', code: '1010' }),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.postCustomerReceipt(
        mockTx,
        {
          id: 'rcpt-1',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          receiptNumber: 'CR-001',
          customerId: 'cust-1',
          amount: 50000,
          paymentMode: 'CASH',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTx.journal.create).toHaveBeenCalled();
    });

    it('should generate supplier payment voucher', async () => {
      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'j-pay', ...args.data })),
        },
        account: {
          findFirst: jest.fn().mockResolvedValue({ id: 'acc-1', code: '2010' }),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.postSupplierPayment(
        mockTx,
        {
          id: 'pay-1',
          companyId: 'comp-1',
          factoryId: 'fact-1',
          paymentNumber: 'PV-001',
          supplierId: 'supp-1',
          amount: 80000,
          paymentMode: 'BANK',
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTx.journal.create).toHaveBeenCalled();
    });

    it('should generate reversal journal with inverted debits and credits and update original status (#77, #78)', async () => {
      const mockOriginal = {
        id: 'j-orig',
        companyId: 'comp-1',
        factoryId: 'fact-1',
        number: 'JV-001',
        voucherType: 'JOURNAL',
        status: 'POSTED',
        currency: 'BDT',
        totalAmount: 10000,
        partnerId: 'part-1',
        lines: [
          { accountId: 'acc-1', accountCode: '1060', debit: 10000, credit: 0 },
          { accountId: 'acc-2', accountCode: '2010', debit: 0, credit: 10000 },
        ],
      };

      const mockTx: any = {
        journal: {
          findUnique: jest.fn().mockResolvedValue(mockOriginal),
          update: jest.fn().mockResolvedValue({ ...mockOriginal, status: 'REVERSED' }),
          create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'j-rev', ...args.data })),
        },
        account: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      const result = await service.createReversalJournal(
        mockTx,
        'j-orig',
        'Duplicate entry correction',
        'user-1',
      );

      expect(result).toBeDefined();
      expect(mockTx.journal.update).toHaveBeenCalledWith({
        where: { id: 'j-orig' },
        data: { status: 'REVERSED' },
      });
      expect(mockTx.journal.create).toHaveBeenCalled();
      const createdLines = mockTx.journal.create.mock.calls[0][0].data.lines.create;
      expect(createdLines[0].debit).toBe(0);
      expect(createdLines[0].credit).toBe(10000);
      expect(createdLines[1].debit).toBe(10000);
      expect(createdLines[1].credit).toBe(0);
    });
  });
});

