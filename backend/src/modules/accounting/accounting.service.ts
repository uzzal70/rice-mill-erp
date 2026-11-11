import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountSubtype,
  AccountType,
  JournalStatus,
  PartnerType,
  Prisma,
  VoucherType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateAccountDto,
  CreateJournalDto,
  GeneralLedgerQueryDto,
  ListJournalDto,
  TrialBalanceQueryDto,
  UpdateAccountDto,
} from './accounting.dto';

const STANDARD_ACCOUNTS: Array<{
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  isSystem: boolean;
  description: string;
}> = [
  // 1000 - ASSETS
  { code: '1010', name: 'Cash in Hand', type: AccountType.ASSET, subtype: AccountSubtype.CASH, isSystem: true, description: 'Factory & office physical cash' },
  { code: '1020', name: 'Bank Operating A/C', type: AccountType.ASSET, subtype: AccountSubtype.BANK, isSystem: true, description: 'Primary commercial bank checking account' },
  { code: '1030', name: 'Petty Cash Fund', type: AccountType.ASSET, subtype: AccountSubtype.CASH, isSystem: false, description: 'Factory floor imprest cash float' },
  { code: '1050', name: 'Accounts Receivable (Trade Debtors)', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE, isSystem: true, description: 'Trade customer receivable control account' },
  { code: '1060', name: 'Raw Material Inventory (Paddy)', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY_RAW, isSystem: true, description: 'Physical paddy grain in godowns' },
  { code: '1070', name: 'Finished Goods Inventory (Rice)', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY_FINISHED, isSystem: true, description: 'Milled polished rice in godowns' },
  { code: '1080', name: 'By-Product Inventory (Husk, Bran, Broken)', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY_BYPRODUCT, isSystem: true, description: 'By-products in godowns' },
  { code: '1090', name: 'Packaging Bags Inventory', type: AccountType.ASSET, subtype: AccountSubtype.CURRENT_ASSET, isSystem: false, description: 'PP woven and gunny bags stock' },
  { code: '1200', name: 'Plant & Milling Machinery', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, isSystem: false, description: 'Auto rice mill equipment & machinery' },
  { code: '1210', name: 'Land & Godown Buildings', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, isSystem: false, description: 'Mill freehold land and warehouses' },

  // 2000 - LIABILITIES
  { code: '2010', name: 'Accounts Payable (Trade Creditors)', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCOUNTS_PAYABLE, isSystem: true, description: 'Paddy suppliers and farmers payable' },
  { code: '2020', name: 'Broker Commission Payable', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, isSystem: false, description: 'Accrued commissions due to brokers' },
  { code: '2030', name: 'Accrued Wages & Utility Bills', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, isSystem: false, description: 'Accrued factory wages and power bills' },
  { code: '2040', name: 'Short-Term Bank Overdraft / CC Loan', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, isSystem: false, description: 'Cash credit working capital bank loan' },

  // 3000 - EQUITY
  { code: '3010', name: 'Paid-Up Share Capital', type: AccountType.EQUITY, subtype: AccountSubtype.SHARE_CAPITAL, isSystem: true, description: 'Owners invested equity capital' },
  { code: '3020', name: 'Retained Earnings', type: AccountType.EQUITY, subtype: AccountSubtype.RETAINED_EARNINGS, isSystem: true, description: 'Cumulative retained profits' },

  // 4000 - REVENUE
  { code: '4010', name: 'Finished Rice Sales Revenue', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, isSystem: true, description: 'Commercial wholesale and retail rice sales' },
  { code: '4020', name: 'By-Product Sales Revenue', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, isSystem: true, description: 'Revenue from husk, bran, broken rice sales' },
  { code: '4030', name: 'Toll Milling Service Revenue', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, isSystem: true, description: 'Custom milling conversion fees' },
  { code: '4090', name: 'Miscellaneous Income', type: AccountType.REVENUE, subtype: AccountSubtype.OTHER_INCOME, isSystem: false, description: 'Weighbridge public fees, scrap, scrap bags' },

  // 5000 - COST OF GOODS SOLD (DIRECT PRODUCTION COSTS)
  { code: '5010', name: 'Cost of Raw Paddy Consumed', type: AccountType.EXPENSE, subtype: AccountSubtype.COST_OF_GOODS_SOLD, isSystem: true, description: 'Paddy issued into milling lines' },
  { code: '5020', name: 'Direct Milling & Yard Labor', type: AccountType.EXPENSE, subtype: AccountSubtype.DIRECT_EXPENSE, isSystem: false, description: 'Parboiling and drying labor wages' },
  { code: '5030', name: 'Factory Electricity & Power', type: AccountType.EXPENSE, subtype: AccountSubtype.DIRECT_EXPENSE, isSystem: false, description: 'Milling electricity and transformer charges' },
  { code: '5040', name: 'Diesel & Generator Fuel', type: AccountType.EXPENSE, subtype: AccountSubtype.DIRECT_EXPENSE, isSystem: false, description: 'Fuel for generators and heavy mobile equipment' },
  { code: '5050', name: 'Packaging Bags Consumption', type: AccountType.EXPENSE, subtype: AccountSubtype.DIRECT_EXPENSE, isSystem: false, description: 'Bags and packaging materials consumed' },

  // 6000 - OPERATING & OVERHEAD EXPENSES
  { code: '6010', name: 'Machinery Repairs & Spares', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'Rubber rolls, screens, elevator parts' },
  { code: '6020', name: 'Godown & Premises Rent', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'External warehouse leases' },
  { code: '6030', name: 'Transport & Freight Outward', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'Finished rice transport cartage' },
  { code: '6040', name: 'Security & Factory Guarding', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'Night guards and CCTV maintenance' },
  { code: '6050', name: 'Loading & Unloading Handling', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'Truck handling bagging labor' },
  { code: '6060', name: 'Office & Administrative Expenses', type: AccountType.EXPENSE, subtype: AccountSubtype.ADMINISTRATIVE_EXPENSE, isSystem: false, description: 'Stationery, internet, entertainment' },
  { code: '6090', name: 'Miscellaneous Operating Expenses', type: AccountType.EXPENSE, subtype: AccountSubtype.INDIRECT_EXPENSE, isSystem: false, description: 'Licensing, pest control, audit' },
];

@Injectable()
export class AccountingService {
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
        resource: 'accounting',
        action,
        resourceId,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      },
    });
  }

  // Seed standard chart of accounts if empty
  async seedStandardCOA(companyId: string, userId = 'system') {
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.account.count({ where: { companyId } });
      if (existingCount > 0) {
        return { count: existingCount, message: 'COA already initialized' };
      }

      await tx.account.createMany({
        data: STANDARD_ACCOUNTS.map((acc) => ({
          companyId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
          isSystem: acc.isSystem,
          description: acc.description,
        })),
      });

      const total = await tx.account.count({ where: { companyId } });
      return { count: total, message: `Standard COA initialized with ${total} accounts` };
    });
  }

  // List Accounts with balances
  async listAccounts(companyId: string, type?: AccountType, subtype?: AccountSubtype, active?: boolean) {
    // Auto-seed if company has no accounts
    const count = await this.prisma.account.count({ where: { companyId } });
    if (count === 0) {
      await this.seedStandardCOA(companyId);
    }

    return this.prisma.account.findMany({
      where: {
        companyId,
        ...(type ? { type } : {}),
        ...(subtype ? { subtype } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  // Create custom account
  async createAccount(companyId: string, dto: CreateAccountDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.account.findFirst({
        where: { companyId, code: dto.code.trim() },
      });
      if (existing) {
        throw new ConflictException(`Account with code ${dto.code} already exists`);
      }

      if (dto.parentId) {
        const parent = await tx.account.findFirst({
          where: { id: dto.parentId, companyId },
        });
        if (!parent) {
          throw new NotFoundException('Parent account not found');
        }
      }

      const openingBalance = new Prisma.Decimal(dto.openingBalance || 0);

      const account = await tx.account.create({
        data: {
          companyId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          type: dto.type,
          subtype: dto.subtype,
          currency: dto.currency || 'BDT',
          openingBalance,
          currentBalance: openingBalance,
          isSystem: dto.isSystem || false,
          description: dto.description?.trim(),
          parentId: dto.parentId,
        },
      });

      await this.audit(tx, companyId, userId, 'CREATE_ACCOUNT', account.id, null, account);
      return account;
    });
  }

  // Update account
  async updateAccount(id: string, companyId: string, dto: UpdateAccountDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.account.findFirst({ where: { id, companyId } });
      if (!existing) {
        throw new NotFoundException(`Account ${id} not found`);
      }

      if (existing.isSystem && dto.active === false && !existing.currentBalance.isZero()) {
        throw new BadRequestException('Cannot deactivate a system control account with active balance');
      }

      const updated = await tx.account.update({
        where: { id: existing.id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : existing.name,
          type: dto.type || existing.type,
          subtype: dto.subtype !== undefined ? dto.subtype : existing.subtype,
          active: dto.active !== undefined ? dto.active : existing.active,
          description: dto.description !== undefined ? dto.description?.trim() : existing.description,
          parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
        },
      });

      await this.audit(tx, companyId, userId, 'UPDATE_ACCOUNT', existing.id, existing, updated);
      return updated;
    });
  }

  // Generate Voucher Number
  private async generateVoucherNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    voucherType: VoucherType,
    date: Date,
  ): Promise<string> {
    const prefixMap: Record<VoucherType, string> = {
      JOURNAL: 'JV',
      PAYMENT: 'PV',
      RECEIPT: 'RV',
      CONTRA: 'CV',
      SALES: 'SV',
      PURCHASE: 'PB',
      EXPENSE: 'EXP',
      OPENING: 'OB',
    };
    const prefix = prefixMap[voucherType] || 'JV';
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const fullPrefix = `${prefix}-${yearMonth}-`;

    const count = await tx.journal.count({
      where: {
        companyId,
        number: { startsWith: fullPrefix },
      },
    });
    return `${fullPrefix}${String(count + 1).padStart(4, '0')}`;
  }

  // Create Double-Entry Journal Voucher
  async createJournal(dto: CreateJournalDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (!dto.lines || dto.lines.length < 2) {
        throw new BadRequestException('Double-entry voucher requires at least two line items (Debit and Credit)');
      }

      // Check account codes and double-entry mathematical equilibrium
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of dto.lines) {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);

        if (debit < 0 || credit < 0) {
          throw new BadRequestException('Debit and credit amounts cannot be negative');
        }
        if (debit === 0 && credit === 0) {
          throw new BadRequestException('A journal line must have either a positive debit or positive credit');
        }
        if (debit > 0 && credit > 0) {
          throw new BadRequestException('A journal line cannot have both debit and credit amounts');
        }

        totalDebit += debit;
        totalCredit += credit;
      }

      // ENFORCE GOLDEN RULE: TOTAL DEBIT = TOTAL CREDIT
      if (Math.abs(totalDebit - totalCredit) > 0.005) {
        throw new BadRequestException(
          `Double-entry rule violation: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`,
        );
      }

      const voucherType = dto.voucherType || VoucherType.JOURNAL;
      const voucherDate = dto.voucherDate ? new Date(dto.voucherDate) : new Date();
      const number = await this.generateVoucherNumber(tx, dto.companyId, voucherType, voucherDate);
      const isPosted = dto.status === JournalStatus.POSTED;

      // Resolve account IDs if not explicitly given
      const resolvedLines = [];
      for (const line of dto.lines) {
        let accountId = line.accountId;
        if (!accountId) {
          const acc = await tx.account.findFirst({
            where: { companyId: dto.companyId, code: line.accountCode.trim() },
          });
          if (acc) {
            accountId = acc.id;
          }
        }

        resolvedLines.push({
          accountId,
          accountCode: line.accountCode.trim(),
          partnerId: line.partnerId || dto.partnerId || undefined,
          description: line.description?.trim(),
          debit: new Prisma.Decimal(Number(line.debit || 0).toFixed(2)),
          credit: new Prisma.Decimal(Number(line.credit || 0).toFixed(2)),
        });
      }

      const journal = await tx.journal.create({
        data: {
          companyId: dto.companyId,
          number,
          voucherType,
          sourceType: 'MANUAL',
          sourceId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          status: isPosted ? JournalStatus.POSTED : JournalStatus.DRAFT,
          currency: 'BDT',
          voucherDate,
          narration: dto.narration?.trim(),
          totalAmount: new Prisma.Decimal(totalDebit.toFixed(2)),
          factoryId: dto.factoryId,
          createdById: userId,
          chequeOrRefNo: dto.chequeOrRefNo?.trim(),
          partnerId: dto.partnerId,
          postedAt: isPosted ? new Date() : null,
          lines: {
            create: resolvedLines,
          },
        },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
          },
        },
      });

      // If posted immediately, update account balances
      if (isPosted) {
        await this.applyJournalToAccountBalances(tx, dto.companyId, resolvedLines);
      }

      await this.audit(tx, dto.companyId, userId, 'CREATE_JOURNAL', journal.id, null, journal);
      return journal;
    });
  }

  private async applyJournalToAccountBalances(
    tx: Prisma.TransactionClient,
    companyId: string,
    lines: Array<{ accountId?: string | null; accountCode: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>,
  ) {
    for (const line of lines) {
      const account = line.accountId
        ? await tx.account.findFirst({ where: { id: line.accountId, companyId } })
        : await tx.account.findFirst({ where: { code: line.accountCode, companyId } });

      if (account) {
        const debitNum = Number(line.debit);
        const creditNum = Number(line.credit);
        let delta = 0;

        // Normal balance rules:
        // Asset & Expense: Debit increases (+), Credit decreases (-)
        // Liability, Equity, Revenue: Credit increases (+), Debit decreases (-)
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          delta = debitNum - creditNum;
        } else {
          delta = creditNum - debitNum;
        }

        await tx.account.update({
          where: { id: account.id },
          data: {
            currentBalance: { increment: new Prisma.Decimal(delta.toFixed(2)) },
          },
        });
      }
    }
  }

  // Post Draft Journal
  async postJournal(id: string, companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const journal = await tx.journal.findFirst({
        where: { id, companyId },
        include: { lines: true },
      });
      if (!journal) {
        throw new NotFoundException(`Journal voucher ${id} not found`);
      }
      if (journal.status === JournalStatus.POSTED) {
        throw new ConflictException(`Journal voucher ${journal.number} is already posted`);
      }

      const updated = await tx.journal.update({
        where: { id: journal.id },
        data: {
          status: JournalStatus.POSTED,
          postedAt: new Date(),
        },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, type: true } } },
          },
        },
      });

      await this.applyJournalToAccountBalances(tx, companyId, journal.lines);
      await this.audit(tx, companyId, userId, 'POST_JOURNAL', journal.id, journal, updated);
      return updated;
    });
  }

  // Reverse Journal
  async reverseJournal(id: string, companyId: string, userId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.journal.findFirst({
        where: { id, companyId },
        include: { lines: true },
      });
      if (!original) {
        throw new NotFoundException(`Journal voucher ${id} not found`);
      }
      if (original.status !== JournalStatus.POSTED) {
        throw new BadRequestException('Only POSTED journals can be reversed');
      }

      const reversalDate = new Date();
      const reversalNumber = `REV-${original.number}`;

      // Swap debits and credits
      const reversalLines = original.lines.map((l) => ({
        accountId: l.accountId || undefined,
        accountCode: l.accountCode,
        partnerId: l.partnerId || undefined,
        description: `Reversal of ${original.number}${reason ? ': ' + reason : ''}`,
        debit: l.credit,
        credit: l.debit,
      }));

      const reversal = await tx.journal.create({
        data: {
          companyId,
          number: reversalNumber,
          voucherType: original.voucherType,
          sourceType: 'REVERSAL',
          sourceId: original.id,
          status: JournalStatus.POSTED,
          currency: original.currency,
          voucherDate: reversalDate,
          narration: `Reversal of ${original.number}. ${reason || ''}`.trim(),
          totalAmount: original.totalAmount,
          factoryId: original.factoryId,
          createdById: userId,
          partnerId: original.partnerId,
          reversalOfId: original.id,
          postedAt: reversalDate,
          lines: {
            create: reversalLines,
          },
        },
        include: { lines: true },
      });

      await tx.journal.update({
        where: { id: original.id },
        data: { status: JournalStatus.REVERSED },
      });

      // Apply reversal lines to account balances
      await this.applyJournalToAccountBalances(tx, companyId, reversalLines);
      await this.audit(tx, companyId, userId, 'REVERSE_JOURNAL', original.id, original, reversal);
      return reversal;
    });
  }

  // List Journals
  async listJournals(q: ListJournalDto) {
    const where: Prisma.JournalWhereInput = {
      companyId: q.companyId,
      ...(q.factoryId ? { factoryId: q.factoryId } : {}),
      ...(q.voucherType ? { voucherType: q.voucherType } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.fromDate || q.toDate
        ? {
            voucherDate: {
              ...(q.fromDate ? { gte: new Date(q.fromDate) } : {}),
              ...(q.toDate ? { lte: new Date(q.toDate) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { number: { contains: q.search, mode: 'insensitive' } },
              { narration: { contains: q.search, mode: 'insensitive' } },
              { chequeOrRefNo: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(q.accountCode
        ? {
            lines: {
              some: { accountCode: q.accountCode },
            },
          }
        : {}),
    };

    return this.prisma.journal.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true, code: true, type: true } },
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
      orderBy: { voucherDate: 'desc' },
    });
  }

  // Get Journal Detail
  async getJournal(id: string, companyId: string) {
    const journal = await this.prisma.journal.findFirst({
      where: { id, companyId },
      include: {
        partner: { select: { id: true, name: true, code: true, type: true, phone: true } },
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true, subtype: true } },
          },
        },
      },
    });
    if (!journal) {
      throw new NotFoundException(`Journal voucher ${id} not found`);
    }
    return journal;
  }

  // General Ledger
  async getGeneralLedger(q: GeneralLedgerQueryDto) {
    const whereAccount: Prisma.AccountWhereInput = {
      companyId: q.companyId,
      ...(q.accountCode ? { code: q.accountCode } : {}),
      ...(q.accountId ? { id: q.accountId } : {}),
    };

    const accounts = await this.prisma.account.findMany({
      where: whereAccount,
      orderBy: { code: 'asc' },
    });

    const results = [];

    for (const acc of accounts) {
      const fromDate = q.fromDate ? new Date(q.fromDate) : null;
      const toDate = q.toDate ? new Date(q.toDate) : null;

      // 1. Calculate opening balance before fromDate
      let openingBalance = Number(acc.openingBalance);
      if (fromDate) {
        const priorLines = await this.prisma.journalLine.findMany({
          where: {
            OR: [{ accountId: acc.id }, { accountCode: acc.code }],
            journal: {
              companyId: q.companyId,
              status: JournalStatus.POSTED,
              voucherDate: { lt: fromDate },
            },
          },
          select: { debit: true, credit: true },
        });

        for (const pl of priorLines) {
          const deb = Number(pl.debit);
          const cr = Number(pl.credit);
          if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
            openingBalance += deb - cr;
          } else {
            openingBalance += cr - deb;
          }
        }
      }

      // 2. Fetch period lines
      const periodLines = await this.prisma.journalLine.findMany({
        where: {
          OR: [{ accountId: acc.id }, { accountCode: acc.code }],
          journal: {
            companyId: q.companyId,
            status: JournalStatus.POSTED,
            ...(fromDate || toDate
              ? {
                  voucherDate: {
                    ...(fromDate ? { gte: fromDate } : {}),
                    ...(toDate ? { lte: toDate } : {}),
                  },
                }
              : {}),
          },
        },
        include: {
          journal: {
            select: {
              id: true,
              number: true,
              voucherType: true,
              voucherDate: true,
              narration: true,
              sourceType: true,
            },
          },
        },
        orderBy: { journal: { voucherDate: 'asc' } },
      });

      let running = openingBalance;
      let totalPeriodDebit = 0;
      let totalPeriodCredit = 0;

      const entries = periodLines.map((pl) => {
        const debit = Number(pl.debit);
        const credit = Number(pl.credit);
        totalPeriodDebit += debit;
        totalPeriodCredit += credit;

        if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
          running += debit - credit;
        } else {
          running += credit - debit;
        }

        return {
          id: pl.id,
          date: pl.journal.voucherDate,
          voucherNumber: pl.journal.number,
          voucherType: pl.journal.voucherType,
          sourceType: pl.journal.sourceType,
          narration: pl.description || pl.journal.narration,
          debit,
          credit,
          runningBalance: Number(running.toFixed(2)),
        };
      });

      results.push({
        account: {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype,
        },
        openingBalance: Number(openingBalance.toFixed(2)),
        totalDebit: Number(totalPeriodDebit.toFixed(2)),
        totalCredit: Number(totalPeriodCredit.toFixed(2)),
        closingBalance: Number(running.toFixed(2)),
        entries,
      });
    }

    return results;
  }

  // Cash Book
  async getCashBook(companyId: string, fromDate?: string, toDate?: string) {
    const cashAccounts = await this.prisma.account.findMany({
      where: { companyId, subtype: AccountSubtype.CASH, active: true },
    });

    const results = [];
    for (const ca of cashAccounts) {
      const gl = await this.getGeneralLedger({
        companyId,
        accountId: ca.id,
        fromDate,
        toDate,
      });
      if (gl.length > 0) results.push(gl[0]);
    }
    return results;
  }

  // Bank Book
  async getBankBook(companyId: string, fromDate?: string, toDate?: string) {
    const bankAccounts = await this.prisma.account.findMany({
      where: { companyId, subtype: AccountSubtype.BANK, active: true },
    });

    const results = [];
    for (const ba of bankAccounts) {
      const gl = await this.getGeneralLedger({
        companyId,
        accountId: ba.id,
        fromDate,
        toDate,
      });
      if (gl.length > 0) results.push(gl[0]);
    }
    return results;
  }

  // Trial Balance
  async getTrialBalance(companyId: string, asOfDate?: string) {
    // Ensure standard COA exists
    const accountCount = await this.prisma.account.count({ where: { companyId } });
    if (accountCount === 0) {
      await this.seedStandardCOA(companyId);
    }

    const accounts = await this.prisma.account.findMany({
      where: { companyId, active: true },
      orderBy: { code: 'asc' },
    });

    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    const rows = [];
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    for (const acc of accounts) {
      // Aggregate all posted journal lines up to asOf
      const lines = await this.prisma.journalLine.findMany({
        where: {
          OR: [{ accountId: acc.id }, { accountCode: acc.code }],
          journal: {
            companyId,
            status: JournalStatus.POSTED,
            voucherDate: { lte: asOf },
          },
        },
        select: { debit: true, credit: true },
      });

      let netMovement = 0;
      let lineDebits = 0;
      let lineCredits = 0;

      for (const l of lines) {
        lineDebits += Number(l.debit);
        lineCredits += Number(l.credit);
      }

      const opening = Number(acc.openingBalance);

      let debitBalance = 0;
      let creditBalance = 0;

      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
        const net = opening + (lineDebits - lineCredits);
        if (net >= 0) {
          debitBalance = net;
        } else {
          creditBalance = Math.abs(net);
        }
      } else {
        const net = opening + (lineCredits - lineDebits);
        if (net >= 0) {
          creditBalance = net;
        } else {
          debitBalance = Math.abs(net);
        }
      }

      grandTotalDebit += debitBalance;
      grandTotalCredit += creditBalance;

      rows.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        debit: Number(debitBalance.toFixed(2)),
        credit: Number(creditBalance.toFixed(2)),
      });
    }

    const diff = Math.abs(grandTotalDebit - grandTotalCredit);

    return {
      asOfDate: asOf,
      accounts: rows,
      totalDebit: Number(grandTotalDebit.toFixed(2)),
      totalCredit: Number(grandTotalCredit.toFixed(2)),
      isBalanced: diff < 0.01,
      difference: Number(diff.toFixed(2)),
    };
  }

  // Profit and Loss Statement
  async getProfitAndLoss(companyId: string, fromDate?: string, toDate?: string) {
    const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const to = toDate ? new Date(toDate) : new Date();

    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        type: { in: [AccountType.REVENUE, AccountType.EXPENSE] },
        active: true,
      },
      orderBy: { code: 'asc' },
    });

    const revenueRows = [];
    const cogsRows = [];
    const expenseRows = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOperatingExpense = 0;

    for (const acc of accounts) {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          OR: [{ accountId: acc.id }, { accountCode: acc.code }],
          journal: {
            companyId,
            status: JournalStatus.POSTED,
            voucherDate: { gte: from, lte: to },
          },
        },
        select: { debit: true, credit: true },
      });

      let netAmount = 0;
      for (const l of lines) {
        if (acc.type === AccountType.REVENUE) {
          netAmount += Number(l.credit) - Number(l.debit);
        } else {
          netAmount += Number(l.debit) - Number(l.credit);
        }
      }

      const item = {
        code: acc.code,
        name: acc.name,
        subtype: acc.subtype,
        amount: Number(netAmount.toFixed(2)),
      };

      if (acc.type === AccountType.REVENUE) {
        revenueRows.push(item);
        totalRevenue += netAmount;
      } else if (acc.subtype === AccountSubtype.COST_OF_GOODS_SOLD || acc.subtype === AccountSubtype.DIRECT_EXPENSE) {
        cogsRows.push(item);
        totalCogs += netAmount;
      } else {
        expenseRows.push(item);
        totalOperatingExpense += netAmount;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalOperatingExpense;

    return {
      fromDate: from,
      toDate: to,
      revenues: revenueRows,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      cogs: cogsRows,
      totalCogs: Number(totalCogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossProfitMarginPct: totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0,
      operatingExpenses: expenseRows,
      totalOperatingExpense: Number(totalOperatingExpense.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      netProfitMarginPct: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
    };
  }

  // Balance Sheet
  async getBalanceSheet(companyId: string, asOfDate?: string) {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        type: { in: [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY] },
        active: true,
      },
      orderBy: { code: 'asc' },
    });

    const assetRows = [];
    const liabilityRows = [];
    const equityRows = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const acc of accounts) {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          OR: [{ accountId: acc.id }, { accountCode: acc.code }],
          journal: {
            companyId,
            status: JournalStatus.POSTED,
            voucherDate: { lte: asOf },
          },
        },
        select: { debit: true, credit: true },
      });

      let netAmount = Number(acc.openingBalance);
      for (const l of lines) {
        if (acc.type === AccountType.ASSET) {
          netAmount += Number(l.debit) - Number(l.credit);
        } else {
          netAmount += Number(l.credit) - Number(l.debit);
        }
      }

      const item = {
        code: acc.code,
        name: acc.name,
        subtype: acc.subtype,
        balance: Number(netAmount.toFixed(2)),
      };

      if (acc.type === AccountType.ASSET) {
        assetRows.push(item);
        totalAssets += netAmount;
      } else if (acc.type === AccountType.LIABILITY) {
        liabilityRows.push(item);
        totalLiabilities += netAmount;
      } else {
        equityRows.push(item);
        totalEquity += netAmount;
      }
    }

    // Include Net Profit from Current Year in Equity
    const pnl = await this.getProfitAndLoss(companyId, undefined, asOf.toISOString());
    const currentYearSurplus = pnl.netProfit;
    const finalEquity = totalEquity + currentYearSurplus;
    const totalLiabilitiesAndEquity = totalLiabilities + finalEquity;

    const diff = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    return {
      asOfDate: asOf,
      assets: assetRows,
      totalAssets: Number(totalAssets.toFixed(2)),
      liabilities: liabilityRows,
      totalLiabilities: Number(totalLiabilities.toFixed(2)),
      equity: equityRows,
      currentYearSurplus: Number(currentYearSurplus.toFixed(2)),
      totalEquity: Number(finalEquity.toFixed(2)),
      totalLiabilitiesAndEquity: Number(totalLiabilitiesAndEquity.toFixed(2)),
      isBalanced: diff < 0.05,
      difference: Number(diff.toFixed(2)),
    };
  }

  // Customer / Supplier Sub-Ledger Balances
  async getSubLedger(companyId: string, partnerId: string, fromDate?: string, toDate?: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: partnerId, companyId },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const lines = await this.prisma.journalLine.findMany({
      where: {
        partnerId,
        journal: {
          companyId,
          status: JournalStatus.POSTED,
          ...(from || to
            ? {
                voucherDate: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {}),
        },
      },
      include: {
        journal: {
          select: {
            id: true,
            number: true,
            voucherType: true,
            voucherDate: true,
            narration: true,
          },
        },
      },
      orderBy: { journal: { voucherDate: 'asc' } },
    });

    let running = Number(partner.openingBalance);
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = lines.map((l) => {
      const debit = Number(l.debit);
      const credit = Number(l.credit);
      totalDebit += debit;
      totalCredit += credit;

      // For customers (receivable): Debit increases due, Credit decreases due
      // For suppliers (payable): Credit increases due, Debit decreases due
      if (partner.type === 'CUSTOMER') {
        running += debit - credit;
      } else {
        running += credit - debit;
      }

      return {
        id: l.id,
        date: l.journal.voucherDate,
        voucherNumber: l.journal.number,
        voucherType: l.journal.voucherType,
        narration: l.description || l.journal.narration,
        debit,
        credit,
        runningBalance: Number(running.toFixed(2)),
      };
    });

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        code: partner.code,
        type: partner.type,
      },
      openingBalance: Number(partner.openingBalance),
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      closingDue: Number(running.toFixed(2)),
      entries,
    };
  }

  // 9. Cash Flow Statement
  async getCashFlow(companyId: string, fromDate?: string, toDate?: string) {
    const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const to = toDate ? new Date(toDate) : new Date();

    const pnl = await this.getProfitAndLoss(companyId, from.toISOString(), to.toISOString());
    const netProfit = pnl.netProfit;

    // Helper to get net movement for account code prefix
    const getMovement = async (prefix: string, isDebitPositive: boolean) => {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          accountCode: { startsWith: prefix },
          journal: {
            companyId,
            status: JournalStatus.POSTED,
            voucherDate: { gte: from, lte: to },
          },
        },
        select: { debit: true, credit: true },
      });
      let sum = 0;
      for (const l of lines) {
        if (isDebitPositive) sum += Number(l.debit) - Number(l.credit);
        else sum += Number(l.credit) - Number(l.debit);
      }
      return sum;
    };

    // Working capital changes:
    // AR increase reduces operating cash; decrease increases cash
    const arChange = await getMovement('1050', true);
    const operatingArEffect = -arChange;

    // Inventory increase reduces operating cash; decrease increases cash
    const invChange = (await getMovement('1060', true)) + (await getMovement('1070', true)) + (await getMovement('1080', true));
    const operatingInvEffect = -invChange;

    // AP increase increases operating cash (deferred payment); decrease reduces cash
    const apChange = await getMovement('2010', false);
    const operatingApEffect = apChange;

    const netOperatingCash = Number((netProfit + operatingArEffect + operatingInvEffect + operatingApEffect).toFixed(2));

    // Investing activities (Fixed Assets 15xx)
    const fixedAssetPurchases = await getMovement('15', true);
    const netInvestingCash = Number((-fixedAssetPurchases).toFixed(2));

    // Financing activities (Equity 3xxx, Long-Term Debt 25xx)
    const financingChange = (await getMovement('3', false)) + (await getMovement('25', false));
    const netFinancingCash = Number(financingChange.toFixed(2));

    const netCashChange = Number((netOperatingCash + netInvestingCash + netFinancingCash).toFixed(2));

    // Starting cash & bank
    const priorLines = await this.prisma.journalLine.findMany({
      where: {
        OR: [{ accountCode: { startsWith: '101' } }, { accountCode: { startsWith: '102' } }],
        journal: {
          companyId,
          status: JournalStatus.POSTED,
          voucherDate: { lt: from },
        },
      },
      select: { debit: true, credit: true },
    });
    let openingCash = 0;
    for (const pl of priorLines) {
      openingCash += Number(pl.debit) - Number(pl.credit);
    }

    const closingCash = Number((openingCash + netCashChange).toFixed(2));

    return {
      fromDate: from,
      toDate: to,
      operatingActivities: {
        netProfit,
        changeInReceivables: Number(operatingArEffect.toFixed(2)),
        changeInInventories: Number(operatingInvEffect.toFixed(2)),
        changeInPayables: Number(operatingApEffect.toFixed(2)),
        netCashFromOperations: netOperatingCash,
      },
      investingActivities: {
        capitalExpenditures: Number((-netInvestingCash).toFixed(2)),
        netCashFromInvesting: netInvestingCash,
      },
      financingActivities: {
        capitalAndBorrowings: netFinancingCash,
        netCashFromFinancing: netFinancingCash,
      },
      summary: {
        netCashChange,
        openingCashAndBank: Number(openingCash.toFixed(2)),
        closingCashAndBank: closingCash,
      },
    };
  }

  // 10. Accounts Receivable Report
  async getAccountsReceivableReport(companyId: string) {
    const customers = await this.prisma.partner.findMany({
      where: {
        companyId,
        type: PartnerType.CUSTOMER,
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const rows = [];
    let grandTotal = 0;
    let grandCurrent = 0;
    let grand30 = 0;
    let grand60 = 0;
    let grand90 = 0;

    for (const c of customers) {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          partnerId: c.id,
          journal: { companyId, status: JournalStatus.POSTED },
        },
        include: { journal: { select: { voucherDate: true } } },
        orderBy: { journal: { voucherDate: 'asc' } },
      });

      let netDue = Number(c.openingBalance);
      for (const l of lines) {
        netDue += Number(l.debit) - Number(l.credit);
      }

      if (netDue > 0.01) {
        // Compute aging for outstanding debit lines
        let current = 0;
        let d30 = 0;
        let d60 = 0;
        let d90 = 0;

        for (const l of lines) {
          const deb = Number(l.debit);
          if (deb > 0) {
            const ageDays = Math.floor((now.getTime() - new Date(l.journal.voucherDate).getTime()) / (1000 * 60 * 60 * 24));
            if (ageDays <= 30) current += deb;
            else if (ageDays <= 60) d30 += deb;
            else if (ageDays <= 90) d60 += deb;
            else d90 += deb;
          }
        }

        const scale = netDue / (current + d30 + d60 + d90 || 1);
        const curAlloc = Number((current * scale).toFixed(2));
        const d30Alloc = Number((d30 * scale).toFixed(2));
        const d60Alloc = Number((d60 * scale).toFixed(2));
        const d90Alloc = Number((netDue - curAlloc - d30Alloc - d60Alloc).toFixed(2));

        grandTotal += netDue;
        grandCurrent += curAlloc;
        grand30 += d30Alloc;
        grand60 += d60Alloc;
        grand90 += Math.max(0, d90Alloc);

        rows.push({
          partnerId: c.id,
          code: c.code,
          name: c.name,
          phone: c.phone,
          creditLimit: Number(c.creditLimit),
          totalDue: Number(netDue.toFixed(2)),
          current: curAlloc,
          days31To60: d30Alloc,
          days61To90: d60Alloc,
          days90Plus: Math.max(0, d90Alloc),
        });
      }
    }

    return {
      asOfDate: now,
      customers: rows,
      totals: {
        totalDue: Number(grandTotal.toFixed(2)),
        current: Number(grandCurrent.toFixed(2)),
        days31To60: Number(grand30.toFixed(2)),
        days61To90: Number(grand60.toFixed(2)),
        days90Plus: Number(grand90.toFixed(2)),
      },
    };
  }

  // 11. Accounts Payable Report
  async getAccountsPayableReport(companyId: string) {
    const suppliers = await this.prisma.partner.findMany({
      where: {
        companyId,
        type: { in: [PartnerType.SUPPLIER, PartnerType.FARMER] },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const rows = [];
    let grandTotal = 0;
    let grandCurrent = 0;
    let grand30 = 0;
    let grand60 = 0;
    let grand90 = 0;

    for (const s of suppliers) {
      const lines = await this.prisma.journalLine.findMany({
        where: {
          partnerId: s.id,
          journal: { companyId, status: JournalStatus.POSTED },
        },
        include: { journal: { select: { voucherDate: true } } },
        orderBy: { journal: { voucherDate: 'asc' } },
      });

      let netPayable = Number(s.openingBalance);
      for (const l of lines) {
        netPayable += Number(l.credit) - Number(l.debit);
      }

      if (netPayable > 0.01) {
        let current = 0;
        let d30 = 0;
        let d60 = 0;
        let d90 = 0;

        for (const l of lines) {
          const cr = Number(l.credit);
          if (cr > 0) {
            const ageDays = Math.floor((now.getTime() - new Date(l.journal.voucherDate).getTime()) / (1000 * 60 * 60 * 24));
            if (ageDays <= 30) current += cr;
            else if (ageDays <= 60) d30 += cr;
            else if (ageDays <= 90) d60 += cr;
            else d90 += cr;
          }
        }

        const scale = netPayable / (current + d30 + d60 + d90 || 1);
        const curAlloc = Number((current * scale).toFixed(2));
        const d30Alloc = Number((d30 * scale).toFixed(2));
        const d60Alloc = Number((d60 * scale).toFixed(2));
        const d90Alloc = Number((netPayable - curAlloc - d30Alloc - d60Alloc).toFixed(2));

        grandTotal += netPayable;
        grandCurrent += curAlloc;
        grand30 += d30Alloc;
        grand60 += d60Alloc;
        grand90 += Math.max(0, d90Alloc);

        rows.push({
          partnerId: s.id,
          code: s.code,
          name: s.name,
          phone: s.phone,
          totalPayable: Number(netPayable.toFixed(2)),
          current: curAlloc,
          days31To60: d30Alloc,
          days61To90: d60Alloc,
          days90Plus: Math.max(0, d90Alloc),
        });
      }
    }

    return {
      asOfDate: now,
      suppliers: rows,
      totals: {
        totalPayable: Number(grandTotal.toFixed(2)),
        current: Number(grandCurrent.toFixed(2)),
        days31To60: Number(grand30.toFixed(2)),
        days61To90: Number(grand60.toFixed(2)),
        days90Plus: Number(grand90.toFixed(2)),
      },
    };
  }

  // 12. Due Aging Summary Report
  async getDueAgingReport(companyId: string, type?: 'RECEIVABLE' | 'PAYABLE') {
    const ar = await this.getAccountsReceivableReport(companyId);
    const ap = await this.getAccountsPayableReport(companyId);

    return {
      asOfDate: new Date(),
      receivableAging: type === 'PAYABLE' ? undefined : ar.totals,
      payableAging: type === 'RECEIVABLE' ? undefined : ap.totals,
      netWorkingCapitalDue: Number((ar.totals.totalDue - ap.totals.totalPayable).toFixed(2)),
    };
  }

  // 13. Expense & Income Detailed Report
  async getIncomeExpenseReport(companyId: string, fromDate?: string, toDate?: string) {
    const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
    const to = toDate ? new Date(toDate) : new Date();

    const pnl = await this.getProfitAndLoss(companyId, from.toISOString(), to.toISOString());

    return {
      period: { fromDate: from, toDate: to },
      revenues: {
        items: pnl.revenues,
        total: pnl.totalRevenue,
      },
      costOfGoodsSold: {
        items: pnl.cogs,
        total: pnl.totalCogs,
      },
      grossProfit: pnl.grossProfit,
      grossMarginPct: pnl.grossProfitMarginPct,
      operatingExpenses: {
        items: pnl.operatingExpenses,
        total: pnl.totalOperatingExpense,
      },
      netProfit: pnl.netProfit,
      netMarginPct: pnl.netProfitMarginPct,
    };
  }
}
