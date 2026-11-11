import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  AccountSubtype,
  AccountType,
  JournalStatus,
  Prisma,
  VoucherType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  let service: AccountingService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      account: {
        count: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      journal: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      journalLine: {
        findMany: jest.fn(),
      },
      auditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest.fn((callback: any) => {
        if (Array.isArray(callback)) {
          return Promise.all(callback);
        }
        return callback(tx);
      }),
      account: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      journal: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      journalLine: {
        findMany: jest.fn(),
      },
      partner: {
        findFirst: jest.fn(),
      },
    };

    service = new AccountingService(prisma as PrismaService);
  });

  describe('seedStandardCOA', () => {
    it('initializes standard chart of accounts if none exist', async () => {
      tx.account.count.mockResolvedValueOnce(0).mockResolvedValueOnce(26);

      const res = await service.seedStandardCOA('company-1');
      expect(tx.account.createMany).toHaveBeenCalled();
      expect(res.count).toBe(26);
    });

    it('skips seeding if company already has accounts', async () => {
      tx.account.count.mockResolvedValue(15);

      const res = await service.seedStandardCOA('company-1');
      expect(tx.account.createMany).not.toHaveBeenCalled();
      expect(res.message).toContain('already initialized');
    });
  });

  describe('createAccount', () => {
    it('creates a new custom account', async () => {
      tx.account.findFirst.mockResolvedValue(null);
      const created = {
        id: 'acc-1',
        companyId: 'company-1',
        code: '1025',
        name: 'Dutch-Bangla Bank Current A/C',
        type: AccountType.ASSET,
        subtype: AccountSubtype.BANK,
        openingBalance: new Prisma.Decimal('100000.00'),
        currentBalance: new Prisma.Decimal('100000.00'),
      };
      tx.account.create.mockResolvedValue(created);

      const res = await service.createAccount(
        'company-1',
        {
          companyId: 'company-1',
          code: '1025',
          name: 'Dutch-Bangla Bank Current A/C',
          type: AccountType.ASSET,
          subtype: AccountSubtype.BANK,
          openingBalance: 100000,
        },
        'user-1',
      );

      expect(tx.account.create).toHaveBeenCalled();
      expect(res.code).toBe('1025');
    });

    it('rejects account creation with duplicate code', async () => {
      tx.account.findFirst.mockResolvedValue({ id: 'existing', code: '1010' });

      await expect(
        service.createAccount(
          'company-1',
          {
            companyId: 'company-1',
            code: '1010',
            name: 'Cash Duplicate',
            type: AccountType.ASSET,
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createJournal (Double-Entry Engine Rule)', () => {
    it('successfully creates a balanced double-entry voucher (Total Debit = Total Credit)', async () => {
      tx.journal.count.mockResolvedValue(12);
      tx.account.findFirst.mockImplementation(({ where }: any) => {
        if (where.code === '1010') {
          return Promise.resolve({ id: 'acc-cash', code: '1010', type: AccountType.ASSET });
        }
        if (where.code === '4010') {
          return Promise.resolve({ id: 'acc-sales', code: '4010', type: AccountType.REVENUE });
        }
        return Promise.resolve(null);
      });

      const createdMock = {
        id: 'jv-1',
        number: 'RV-202611-0013',
        voucherType: VoucherType.RECEIPT,
        status: JournalStatus.POSTED,
        totalAmount: new Prisma.Decimal('50000.00'),
        lines: [
          { accountCode: '1010', debit: new Prisma.Decimal('50000.00'), credit: new Prisma.Decimal('0.00') },
          { accountCode: '4010', debit: new Prisma.Decimal('0.00'), credit: new Prisma.Decimal('50000.00') },
        ],
      };
      tx.journal.create.mockResolvedValue(createdMock);
      tx.account.update.mockResolvedValue({});

      const res = await service.createJournal(
        {
          companyId: 'company-1',
          voucherType: VoucherType.RECEIPT,
          narration: 'Cash sale receipt of 20 bags Miniket',
          status: JournalStatus.POSTED,
          lines: [
            { accountCode: '1010', debit: 50000, credit: 0, description: 'Debit Cash' },
            { accountCode: '4010', debit: 0, credit: 50000, description: 'Credit Sales Revenue' },
          ],
        },
        'user-1',
      );

      expect(tx.journal.create).toHaveBeenCalled();
      expect(res.number).toMatch(/^RV-\d{6}-\d{4}$/);
    });

    it('STRICTLY REJECTS voucher when Total Debit != Total Credit', async () => {
      await expect(
        service.createJournal(
          {
            companyId: 'company-1',
            voucherType: VoucherType.JOURNAL,
            lines: [
              { accountCode: '1010', debit: 50000, credit: 0 },
              { accountCode: '4010', debit: 0, credit: 45000 }, // Unequal!
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects voucher with less than 2 lines', async () => {
      await expect(
        service.createJournal(
          {
            companyId: 'company-1',
            voucherType: VoucherType.PAYMENT,
            lines: [{ accountCode: '1010', debit: 1000, credit: 0 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects voucher with negative amount', async () => {
      await expect(
        service.createJournal(
          {
            companyId: 'company-1',
            voucherType: VoucherType.PAYMENT,
            lines: [
              { accountCode: '1010', debit: -1000, credit: 0 },
              { accountCode: '2010', debit: 0, credit: -1000 },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('postJournal and reverseJournal', () => {
    it('posts a draft journal voucher and updates account balances', async () => {
      const draftJournal = {
        id: 'jv-draft-1',
        number: 'JV-202611-0001',
        status: JournalStatus.DRAFT,
        lines: [
          { accountCode: '5030', debit: new Prisma.Decimal('15000.00'), credit: new Prisma.Decimal('0.00') },
          { accountCode: '1020', debit: new Prisma.Decimal('0.00'), credit: new Prisma.Decimal('15000.00') },
        ],
      };
      tx.journal.findFirst.mockResolvedValue(draftJournal);
      tx.journal.update.mockResolvedValue({
        ...draftJournal,
        status: JournalStatus.POSTED,
      });
      tx.account.findFirst.mockImplementation(({ where }: any) => {
        if (where.code === '5030') return Promise.resolve({ id: 'acc-pwr', type: AccountType.EXPENSE });
        if (where.code === '1020') return Promise.resolve({ id: 'acc-bnk', type: AccountType.ASSET });
        return Promise.resolve(null);
      });
      tx.account.update.mockResolvedValue({});

      const res = await service.postJournal('jv-draft-1', 'company-1', 'user-1');
      expect(res.status).toBe(JournalStatus.POSTED);
      expect(tx.account.update).toHaveBeenCalledTimes(2);
    });

    it('reverses a posted journal by swapping debits and credits', async () => {
      const postedJournal = {
        id: 'jv-posted-1',
        number: 'JV-202611-0002',
        voucherType: VoucherType.JOURNAL,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        totalAmount: new Prisma.Decimal('20000.00'),
        lines: [
          { accountCode: '1050', debit: new Prisma.Decimal('20000.00'), credit: new Prisma.Decimal('0.00') },
          { accountCode: '4010', debit: new Prisma.Decimal('0.00'), credit: new Prisma.Decimal('20000.00') },
        ],
      };
      tx.journal.findFirst.mockResolvedValue(postedJournal);
      tx.journal.create.mockResolvedValue({
        id: 'rev-1',
        number: 'REV-JV-202611-0002',
        status: JournalStatus.POSTED,
      });
      tx.journal.update.mockResolvedValue({
        ...postedJournal,
        status: JournalStatus.REVERSED,
      });
      tx.account.findFirst.mockResolvedValue({ id: 'acc-1', type: AccountType.ASSET });
      tx.account.update.mockResolvedValue({});

      const res = await service.reverseJournal('jv-posted-1', 'company-1', 'user-1', 'Wrong billing');
      expect(res.number).toBe('REV-JV-202611-0002');
      expect(tx.journal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: JournalStatus.REVERSED } }),
      );
    });
  });

  describe('getGeneralLedger', () => {
    it('calculates opening balance, period entries, and running balance', async () => {
      prisma.account.findMany.mockResolvedValue([
        {
          id: 'acc-cash',
          code: '1010',
          name: 'Cash in Hand',
          type: AccountType.ASSET,
          subtype: AccountSubtype.CASH,
          openingBalance: new Prisma.Decimal('50000.00'),
        },
      ]);

      prisma.journalLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          debit: new Prisma.Decimal('25000.00'),
          credit: new Prisma.Decimal('0.00'),
          description: 'Cash received from customer',
          journal: {
            id: 'j-1',
            number: 'RV-202611-0001',
            voucherType: VoucherType.RECEIPT,
            voucherDate: new Date('2026-11-01'),
            sourceType: 'MANUAL',
          },
        },
        {
          id: 'line-2',
          debit: new Prisma.Decimal('0.00'),
          credit: new Prisma.Decimal('10000.00'),
          description: 'Diesel purchase cash payout',
          journal: {
            id: 'j-2',
            number: 'PV-202611-0001',
            voucherType: VoucherType.PAYMENT,
            voucherDate: new Date('2026-11-02'),
            sourceType: 'MANUAL',
          },
        },
      ]);

      const gl = await service.getGeneralLedger({ companyId: 'company-1', accountCode: '1010' });
      expect(gl.length).toBe(1);
      const ledger = gl[0];
      expect(ledger.openingBalance).toBe(50000);
      expect(ledger.totalDebit).toBe(25000);
      expect(ledger.totalCredit).toBe(10000);
      expect(ledger.closingBalance).toBe(65000); // 50000 + 25000 - 10000
    });
  });

  describe('getTrialBalance', () => {
    it('verifies that Trial Balance is balanced (Total Debit == Total Credit)', async () => {
      prisma.account.count.mockResolvedValue(2);
      prisma.account.findMany.mockResolvedValue([
        {
          id: 'acc-1',
          code: '1010',
          name: 'Cash in Hand',
          type: AccountType.ASSET,
          openingBalance: new Prisma.Decimal('0.00'),
        },
        {
          id: 'acc-2',
          code: '4010',
          name: 'Sales Revenue',
          type: AccountType.REVENUE,
          openingBalance: new Prisma.Decimal('0.00'),
        },
      ]);

      prisma.journalLine.findMany
        .mockResolvedValueOnce([{ debit: new Prisma.Decimal('80000.00'), credit: new Prisma.Decimal('0.00') }])
        .mockResolvedValueOnce([{ debit: new Prisma.Decimal('0.00'), credit: new Prisma.Decimal('80000.00') }]);

      const tb = await service.getTrialBalance('company-1');
      expect(tb.totalDebit).toBe(80000);
      expect(tb.totalCredit).toBe(80000);
      expect(tb.isBalanced).toBe(true);
      expect(tb.difference).toBe(0);
    });
  });

  describe('getProfitAndLoss and getBalanceSheet', () => {
    it('computes Gross Profit and Net Profit correctly', async () => {
      prisma.account.findMany.mockResolvedValue([
        {
          id: 'acc-rev',
          code: '4010',
          name: 'Rice Sales',
          type: AccountType.REVENUE,
          subtype: AccountSubtype.OPERATING_REVENUE,
        },
        {
          id: 'acc-cogs',
          code: '5010',
          name: 'Paddy Consumed',
          type: AccountType.EXPENSE,
          subtype: AccountSubtype.COST_OF_GOODS_SOLD,
        },
        {
          id: 'acc-exp',
          code: '6010',
          name: 'Machinery Repairs',
          type: AccountType.EXPENSE,
          subtype: AccountSubtype.INDIRECT_EXPENSE,
        },
      ]);

      prisma.journalLine.findMany
        .mockResolvedValueOnce([{ debit: new Prisma.Decimal('0'), credit: new Prisma.Decimal('200000.00') }])
        .mockResolvedValueOnce([{ debit: new Prisma.Decimal('120000.00'), credit: new Prisma.Decimal('0') }])
        .mockResolvedValueOnce([{ debit: new Prisma.Decimal('15000.00'), credit: new Prisma.Decimal('0') }]);

      const pnl = await service.getProfitAndLoss('company-1');
      expect(pnl.totalRevenue).toBe(200000);
      expect(pnl.totalCogs).toBe(120000);
      expect(pnl.grossProfit).toBe(80000);
      expect(pnl.totalOperatingExpense).toBe(15000);
      expect(pnl.netProfit).toBe(65000); // 80000 - 15000
    });

    it('computes Cash Flow Statement accurately', async () => {
      // Mock getProfitAndLoss call within getCashFlow
      jest.spyOn(service, 'getProfitAndLoss').mockResolvedValueOnce({
        fromDate: new Date(),
        toDate: new Date(),
        revenues: [],
        totalRevenue: 100000,
        cogs: [],
        totalCogs: 60000,
        grossProfit: 40000,
        grossProfitMarginPct: 40,
        operatingExpenses: [],
        totalOperatingExpense: 10000,
        netProfit: 30000,
        netProfitMarginPct: 30,
      } as any);

      // getMovement calls in getCashFlow: 1050 (AR), 1060/1070/1080 (inv), 2010 (AP), 15 (fixed assets), 3/25 (equity/debt), prior lines
      prisma.journalLine.findMany.mockResolvedValue([]);

      const cf = await service.getCashFlow('company-1');
      expect(cf).toBeDefined();
      expect(cf.operatingActivities.netProfit).toBe(30000);
      expect(cf.summary).toBeDefined();
    });

    it('computes Accounts Receivable and Due Aging reports', async () => {
      prisma.partner = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cust-1',
            code: 'CUST-001',
            name: 'Agrani Rice Traders',
            phone: '01711000000',
            creditLimit: 500000,
            openingBalance: 0,
          },
        ]),
      };

      prisma.journalLine.findMany.mockResolvedValue([
        {
          debit: new Prisma.Decimal('100000.00'),
          credit: new Prisma.Decimal('0.00'),
          journal: { voucherDate: new Date() },
        },
      ]);

      const ar = await service.getAccountsReceivableReport('company-1');
      expect(ar.customers).toHaveLength(1);
      expect(ar.customers[0].totalDue).toBe(100000);
      expect(ar.totals.totalDue).toBe(100000);

      const aging = await service.getDueAgingReport('company-1');
      expect(aging.receivableAging).toBeDefined();
    });
  });
});

