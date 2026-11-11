import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { HrService } from './hr.service';

describe('HrService', () => {
  let service: HrService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      payroll: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      employeeLoan: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      journal: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      employee: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      attendance: {
        upsert: jest.fn(),
      },
      employeeLoan: {
        create: jest.fn(),
      },
      payroll: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      payrollLine: {
        deleteMany: jest.fn(),
      },
    };

    service = new HrService(prisma as PrismaService);
  });

  describe('createEmployee', () => {
    it('creates an employee record', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      prisma.employee.create.mockImplementation((args: any) => Promise.resolve({ id: 'emp-1', ...args.data }));

      const res = await service.createEmployee({
        companyId: 'comp-1',
        employeeCode: 'EMP-001',
        fullName: 'Abdur Rahim',
        department: 'MILLING',
        designation: 'Mill Operator',
        joiningDate: '2026-01-01',
        baseSalary: 30000,
      });

      expect(res).toBeDefined();
      expect(res.employeeCode).toBe('EMP-001');
      expect(res.fullName).toBe('Abdur Rahim');
    });

    it('throws ConflictException on duplicate employee code', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createEmployee({
          companyId: 'comp-1',
          employeeCode: 'EMP-001',
          fullName: 'Abdur Rahim',
          department: 'MILLING',
          designation: 'Mill Operator',
          joiningDate: '2026-01-01',
          baseSalary: 30000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordAttendance & createLoanAdvance', () => {
    it('upserts attendance record with overtime', async () => {
      prisma.attendance.upsert.mockResolvedValue({ id: 'att-1', status: 'PRESENT', overtimeHours: 2.5 });

      const res = await service.recordAttendance({
        companyId: 'comp-1',
        employeeId: 'emp-1',
        date: '2026-11-01',
        status: 'PRESENT',
        overtimeHours: 2.5,
      });

      expect(res.status).toBe('PRESENT');
      expect(res.overtimeHours).toBe(2.5);
    });

    it('creates a salary advance or loan', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      prisma.employeeLoan.create.mockImplementation((args: any) => Promise.resolve({ id: 'loan-1', ...args.data }));

      const res = await service.createLoanAdvance({
        companyId: 'comp-1',
        employeeId: 'emp-1',
        type: 'ADVANCE',
        principalAmount: 10000,
        monthlyDeduction: 2500,
      });

      expect(res.id).toBe('loan-1');
      expect(Number(res.principalAmount)).toBe(10000);
      expect(Number(res.balanceAmount)).toBe(10000);
    });
  });

  describe('generatePayroll', () => {
    it('calculates net salary including base, overtime, absent deductions, bonus, and loans', async () => {
      prisma.payroll.findFirst.mockResolvedValue(null);

      // Employee with baseSalary 30000
      // Daily rate = 1000, Hourly overtime = 1000/8 * 1.5 = 187.5
      // 28 days present, 2 days absent -> Absent deduction = 2000
      // Overtime 8 hours -> 8 * 187.5 = 1500
      // Loan balance 5000, monthly deduction 2000 -> Advance deduction = 2000
      // Bonus override = 1000
      // Expected Net Salary = 30000 + 1500 + 1000 - 2000 - 2000 = 28500
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          employeeCode: 'EMP-001',
          fullName: 'Abdur Rahim',
          baseSalary: new Prisma.Decimal(30000),
          attendances: [
            ...Array.from({ length: 28 }, (_, i) => ({ status: 'PRESENT', overtimeHours: i === 0 ? 8 : 0 })),
            { status: 'ABSENT', overtimeHours: 0 },
            { status: 'ABSENT', overtimeHours: 0 },
          ],
          loans: [
            { balanceAmount: new Prisma.Decimal(5000), monthlyDeduction: new Prisma.Decimal(2000) },
          ],
        },
      ]);

      prisma.payroll.create.mockImplementation((args: any) => Promise.resolve({ id: 'pay-1', ...args.data }));

      const res = await service.generatePayroll(
        {
          companyId: 'comp-1',
          monthYear: '2026-11',
          bonusOverrides: [{ employeeId: 'emp-1', bonusAmount: 1000 }],
        },
        'user-1',
      );

      expect(res).toBeDefined();
      expect(res.payrollNumber).toBe('PAY-202611');
      expect(res.totalEmployees).toBe(1);
      expect(Number(res.totalBaseSalary)).toBe(30000);
      expect(Number(res.totalOvertime)).toBe(1500);
      expect(Number(res.totalBonus)).toBe(1000);
      expect(Number(res.totalDeductions)).toBe(4000); // 2000 loan + 2000 absent
      expect(Number(res.totalNetSalary)).toBe(28500);
    });
  });

  describe('postPayroll', () => {
    it('posts payroll, decrements loans, and writes balanced double-entry accounting journal', async () => {
      tx.payroll.findFirst.mockResolvedValue({
        id: 'pay-1',
        payrollNumber: 'PAY-202611',
        monthYear: '2026-11',
        status: 'DRAFT',
        totalBaseSalary: new Prisma.Decimal(30000),
        totalOvertime: new Prisma.Decimal(1500),
        totalBonus: new Prisma.Decimal(1000),
        totalDeductions: new Prisma.Decimal(4000),
        totalNetSalary: new Prisma.Decimal(28500),
        lines: [
          {
            employeeId: 'emp-1',
            advanceDeduction: new Prisma.Decimal(2000),
          },
        ],
      });

      tx.employeeLoan.findFirst.mockResolvedValue({
        id: 'loan-1',
        balanceAmount: new Prisma.Decimal(5000),
      });
      tx.employeeLoan.update.mockResolvedValue({});
      tx.payroll.update.mockResolvedValue({ id: 'pay-1', status: 'POSTED' });

      tx.account.findFirst.mockImplementation(({ where }: any) => {
        if (where.code === '6010') return Promise.resolve({ id: 'acc-6010', code: '6010' });
        if (where.code === '1040') return Promise.resolve({ id: 'acc-1040', code: '1040' });
        if (where.code === '2030') return Promise.resolve({ id: 'acc-2030', code: '2030' });
        return Promise.resolve(null);
      });

      tx.journal.create.mockImplementation((args: any) => Promise.resolve({ id: 'j-1', ...args.data }));

      const res = await service.postPayroll('pay-1', 'comp-1', 'user-1');
      expect(res.status).toBe('POSTED');

      // Verify loan updated
      expect(tx.employeeLoan.update).toHaveBeenCalled();
      const loanUpdateArgs = tx.employeeLoan.update.mock.calls[0][0];
      expect(Number(loanUpdateArgs.data.balanceAmount)).toBe(3000); // 5000 - 2000

      // Verify balanced double-entry journal created
      expect(tx.journal.create).toHaveBeenCalled();
      const journalArgs = tx.journal.create.mock.calls[0][0];
      const jLines = journalArgs.data.lines.create;

      const sumDebit = jLines.reduce((acc: number, l: any) => acc + Number(l.debit), 0);
      const sumCredit = jLines.reduce((acc: number, l: any) => acc + Number(l.credit), 0);
      expect(sumDebit).toBeCloseTo(sumCredit, 2);
    });
  });
});

