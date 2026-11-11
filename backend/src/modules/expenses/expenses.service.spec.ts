import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  DocumentStatus,
  ExpenseCategory,
  ExpensePaymentMode,
  ExpenseType,
  JournalStatus,
  PartnerType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: any;
  let tx: any;

  const activeFactory = { id: 'factory-1', companyId: 'company-1', active: true };
  const activePartner = {
    id: 'partner-1',
    companyId: 'company-1',
    name: 'Palli Bidyut Samity',
    type: PartnerType.SUPPLIER,
    active: true,
  };
  const activeVehicle = {
    id: 'veh-1',
    companyId: 'company-1',
    vehicleNumber: 'DHAKA-METRO-TA-11-2233',
    active: true,
  };
  const activeProductionLine = {
    id: 'line-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    name: 'Main Milling Line A',
    active: true,
  };

  beforeEach(() => {
    tx = {
      factory: { findFirst: jest.fn() },
      partner: { findFirst: jest.fn() },
      vehicle: { findFirst: jest.fn() },
      productionLine: { findFirst: jest.fn() },
      expense: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      expenseLine: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      journal: {
        create: jest.fn(),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: jest.fn((callback: any) => {
        if (Array.isArray(callback)) {
          return Promise.all(callback);
        }
        return callback(tx);
      }),
      expense: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    service = new ExpensesService(prisma as PrismaService);
  });

  describe('create', () => {
    it('creates a draft expense with lines, subtotal, and total amount', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(activePartner);
      tx.expense.count.mockResolvedValue(4);

      const createdMock = {
        id: 'exp-1',
        voucherNumber: 'EXP-202611-0005',
        title: 'Factory Electricity Bill for October',
        category: ExpenseCategory.ELECTRICITY,
        type: ExpenseType.FACTORY_EXPENSE,
        paymentMode: ExpensePaymentMode.BANK,
        status: DocumentStatus.DRAFT,
        subtotalAmount: new Prisma.Decimal('45000.00'),
        taxAmount: new Prisma.Decimal('2250.00'),
        totalAmount: new Prisma.Decimal('47250.00'),
      };
      tx.expense.create.mockResolvedValue(createdMock);

      const result = await service.create(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          title: 'Factory Electricity Bill for October',
          category: ExpenseCategory.ELECTRICITY,
          type: ExpenseType.FACTORY_EXPENSE,
          paymentMode: ExpensePaymentMode.BANK,
          payeePartnerId: 'partner-1',
          taxAmount: 2250,
          lines: [
            { description: 'Peak hour units', amount: 30000 },
            { description: 'Off-peak units', amount: 15000 },
          ],
        },
        'user-1',
      );

      expect(tx.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            voucherNumber: expect.stringMatching(/^EXP-\d{6}-\d{4}$/),
            subtotalAmount: new Prisma.Decimal('45000.00'),
            taxAmount: new Prisma.Decimal('2250.00'),
            totalAmount: new Prisma.Decimal('47250.00'),
            category: ExpenseCategory.ELECTRICITY,
            status: DocumentStatus.DRAFT,
          }),
          include: expect.any(Object),
        }),
      );
      expect(result).toEqual(createdMock);
    });

    it('rejects creation if active factory not found', async () => {
      tx.factory.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'invalid-factory',
            title: 'Diesel for Generator',
            category: ExpenseCategory.DIESEL,
            type: ExpenseType.PRODUCTION_EXPENSE,
            lines: [{ description: '500L Diesel', amount: 55000 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects creation if lines array is empty or missing', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            title: 'Misc expense',
            category: ExpenseCategory.MISCELLANEOUS,
            type: ExpenseType.ADMINISTRATIVE_EXPENSE,
            lines: [],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation if any line has zero or negative amount', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            title: 'Loading labor',
            category: ExpenseCategory.LOADING,
            type: ExpenseType.FACTORY_EXPENSE,
            lines: [{ description: 'Loading 100 bags', amount: -500 }],
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates a draft expense and recalculates subtotal and total', async () => {
      const existing = {
        id: 'exp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.DRAFT,
        category: ExpenseCategory.DIESEL,
        type: ExpenseType.FACTORY_EXPENSE,
        subtotalAmount: new Prisma.Decimal('50000.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        totalAmount: new Prisma.Decimal('50000.00'),
      };
      tx.expense.findFirst.mockResolvedValue(existing);
      tx.expense.update.mockResolvedValue({
        ...existing,
        title: 'Updated Diesel Purchase',
        totalAmount: new Prisma.Decimal('60000.00'),
      });

      const updated = await service.update(
        'exp-1',
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          title: 'Updated Diesel Purchase',
          lines: [{ description: '600L Generator Diesel', amount: 60000 }],
        },
        'user-1',
      );

      expect(tx.expenseLine.deleteMany).toHaveBeenCalled();
      expect(tx.expenseLine.createMany).toHaveBeenCalled();
      expect(tx.expense.update).toHaveBeenCalled();
      expect(updated.title).toBe('Updated Diesel Purchase');
    });

    it('rejects update if expense is already POSTED', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.POSTED,
      });

      await expect(
        service.update(
          'exp-1',
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            title: 'Try Edit Posted',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit, approve, and reject workflow', () => {
    it('submits a DRAFT expense for approval', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.DRAFT,
      });
      tx.expense.update.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.SUBMITTED,
      });

      const res = await service.submit('exp-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.SUBMITTED);
      expect(tx.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DocumentStatus.SUBMITTED }),
        }),
      );
    });

    it('approves a SUBMITTED expense and stamps approvedById and approvedAt', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.SUBMITTED,
      });
      tx.expense.update.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.APPROVED,
        approvedById: 'mgr-1',
      });

      const res = await service.approve('exp-1', 'company-1', 'factory-1', 'mgr-1');
      expect(res.status).toBe(DocumentStatus.APPROVED);
      expect(tx.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DocumentStatus.APPROVED,
            approvedById: 'mgr-1',
          }),
        }),
      );
    });

    it('rejects a SUBMITTED expense with rejection reason', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.SUBMITTED,
      });
      tx.expense.update.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.REJECTED,
        rejectionReason: 'Voucher bill receipt missing',
      });

      const res = await service.reject(
        'exp-1',
        'company-1',
        'factory-1',
        'mgr-1',
        'Voucher bill receipt missing',
      );
      expect(res.status).toBe(DocumentStatus.REJECTED);
      expect(tx.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DocumentStatus.REJECTED,
            rejectionReason: 'Voucher bill receipt missing',
          }),
        }),
      );
    });
  });

  describe('post and double-entry accounting journal', () => {
    it('posts an APPROVED expense, creating a balanced double-entry journal (Total Debit = Total Credit)', async () => {
      const approvedExpense = {
        id: 'exp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        voucherNumber: 'EXP-202611-0001',
        title: 'Milling Line Rubber Roll Replacement',
        category: ExpenseCategory.MAINTENANCE,
        type: ExpenseType.PRODUCTION_EXPENSE,
        paymentMode: ExpensePaymentMode.CASH,
        status: DocumentStatus.APPROVED,
        totalAmount: new Prisma.Decimal('18500.00'),
      };
      tx.expense.findFirst.mockResolvedValue(approvedExpense);
      tx.expense.update.mockResolvedValue({
        ...approvedExpense,
        status: DocumentStatus.POSTED,
        postedById: 'acct-1',
      });
      tx.journal.create.mockResolvedValue({ id: 'jv-1' });

      const res = await service.post('exp-1', 'company-1', 'factory-1', 'acct-1');
      expect(res.status).toBe(DocumentStatus.POSTED);

      // Verify double-entry journal creation
      expect(tx.journal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          number: 'JV-EXP-EXP-202611-0001',
          sourceType: 'EXPENSE',
          sourceId: 'exp-1',
          status: JournalStatus.POSTED,
          lines: {
            create: [
              {
                accountCode: 'EXP_MAINTENANCE',
                description: 'Expense: Milling Line Rubber Roll Replacement (EXP-202611-0001)',
                debit: approvedExpense.totalAmount,
                credit: new Prisma.Decimal(0),
              },
              {
                accountCode: 'ASSET_CASH',
                description: 'Payment for EXP-202611-0001 via CASH',
                debit: new Prisma.Decimal(0),
                credit: approvedExpense.totalAmount,
              },
            ],
          },
        }),
      });
    });

    it('rejects posting if expense is already POSTED', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        voucherNumber: 'EXP-202611-0001',
        status: DocumentStatus.POSTED,
      });

      await expect(
        service.post('exp-1', 'company-1', 'factory-1', 'acct-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects posting if expense is still in DRAFT', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.DRAFT,
      });

      await expect(
        service.post('exp-1', 'company-1', 'factory-1', 'acct-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel and delete', () => {
    it('cancels a DRAFT or APPROVED expense', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.APPROVED,
        remarks: 'Original notes',
      });
      tx.expense.update.mockResolvedValue({
        id: 'exp-1',
        status: DocumentStatus.CANCELLED,
      });

      const res = await service.cancel('exp-1', 'company-1', 'factory-1', 'mgr-1', 'Duplicated voucher');
      expect(res.status).toBe(DocumentStatus.CANCELLED);
    });

    it('rejects cancellation of a POSTED expense', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        voucherNumber: 'EXP-1',
        status: DocumentStatus.POSTED,
      });

      await expect(
        service.cancel('exp-1', 'company-1', 'factory-1', 'mgr-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deletes a DRAFT expense and its lines', async () => {
      tx.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        voucherNumber: 'EXP-1',
        status: DocumentStatus.DRAFT,
      });
      tx.expenseLine.deleteMany.mockResolvedValue({ count: 2 });
      tx.expense.delete.mockResolvedValue({ id: 'exp-1' });

      const res = await service.delete('exp-1', 'company-1', 'factory-1', 'user-1');
      expect(res.success).toBe(true);
      expect(tx.expenseLine.deleteMany).toHaveBeenCalled();
      expect(tx.expense.delete).toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('aggregates expenses by category, type, and payment mode', async () => {
      prisma.expense.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          category: ExpenseCategory.ELECTRICITY,
          type: ExpenseType.FACTORY_EXPENSE,
          paymentMode: ExpensePaymentMode.BANK,
          status: DocumentStatus.POSTED,
          totalAmount: new Prisma.Decimal('50000.00'),
          expenseDate: new Date(),
        },
        {
          id: 'exp-2',
          category: ExpenseCategory.DIESEL,
          type: ExpenseType.PRODUCTION_EXPENSE,
          paymentMode: ExpensePaymentMode.CASH,
          status: DocumentStatus.SUBMITTED,
          totalAmount: new Prisma.Decimal('20000.00'),
          expenseDate: new Date(),
        },
        {
          id: 'exp-3',
          category: ExpenseCategory.OFFICE,
          type: ExpenseType.OFFICE_EXPENSE,
          paymentMode: ExpensePaymentMode.PETTY_CASH,
          status: DocumentStatus.CANCELLED,
          totalAmount: new Prisma.Decimal('3000.00'),
          expenseDate: new Date(),
        },
      ]);

      const summary = await service.getSummary('company-1', 'factory-1');
      expect(summary.totalCount).toBe(3);
      expect(summary.totalExpenseAmount).toBe(70000);
      expect(summary.postedExpenseAmount).toBe(50000);
      expect(summary.pendingApprovalCount).toBe(1);
      expect(summary.pendingApprovalAmount).toBe(20000);
      expect(summary.byCategory[ExpenseCategory.ELECTRICITY]).toBe(50000);
      expect(summary.byCategory[ExpenseCategory.DIESEL]).toBe(20000);
      expect(summary.byType[ExpenseType.FACTORY_EXPENSE]).toBe(50000);
      expect(summary.byPaymentMode[ExpensePaymentMode.BANK]).toBe(50000);
      expect(summary.byPaymentMode[ExpensePaymentMode.CASH]).toBe(20000);
    });
  });
});

