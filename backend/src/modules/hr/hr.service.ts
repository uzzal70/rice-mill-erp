import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, JournalStatus, Prisma, VoucherType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateEmployeeDto,
  CreateLoanAdvanceDto,
  GeneratePayrollDto,
  RecordAttendanceDto,
  UpdateEmployeeDto,
} from './hr.dto';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Employee Master Management
  async createEmployee(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: {
        companyId_employeeCode: {
          companyId: dto.companyId,
          employeeCode: dto.employeeCode,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Employee code ${dto.employeeCode} already exists`);
    }

    return this.prisma.employee.create({
      data: {
        companyId: dto.companyId,
        factoryId: dto.factoryId,
        employeeCode: dto.employeeCode,
        fullName: dto.fullName,
        nid: dto.nid,
        phone: dto.phone,
        address: dto.address,
        department: dto.department,
        designation: dto.designation,
        joiningDate: new Date(dto.joiningDate),
        baseSalary: new Prisma.Decimal(dto.baseSalary),
        dailyWage: dto.dailyWage ? new Prisma.Decimal(dto.dailyWage) : null,
        paymentMode: dto.paymentMode || 'BANK',
        bankAccountNumber: dto.bankAccountNumber,
      },
    });
  }

  async updateEmployee(id: string, companyId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.department ? { department: dto.department } : {}),
        ...(dto.designation ? { designation: dto.designation } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: new Prisma.Decimal(dto.baseSalary) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async listEmployees(companyId: string, department?: string, active?: boolean) {
    return this.prisma.employee.findMany({
      where: {
        companyId,
        ...(department ? { department } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async getEmployee(id: string, companyId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        loans: { where: { status: 'ACTIVE' } },
        attendances: { take: 31, orderBy: { date: 'desc' } },
        leaves: { take: 10, orderBy: { startDate: 'desc' } },
      },
    });
    if (!emp) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return emp;
  }

  // 2. Attendance & Overtime
  async recordAttendance(dto: RecordAttendanceDto) {
    const attendanceDate = new Date(dto.date);
    attendanceDate.setHours(0, 0, 0, 0);

    return this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date: attendanceDate,
        },
      },
      create: {
        companyId: dto.companyId,
        factoryId: dto.factoryId,
        employeeId: dto.employeeId,
        date: attendanceDate,
        status: dto.status,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        overtimeHours: new Prisma.Decimal(dto.overtimeHours || 0),
        remarks: dto.remarks,
      },
      update: {
        status: dto.status,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        overtimeHours: new Prisma.Decimal(dto.overtimeHours || 0),
        remarks: dto.remarks,
      },
    });
  }

  // 3. Salary Advance & Loans
  async createLoanAdvance(dto: CreateLoanAdvanceDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId: dto.companyId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const principal = new Prisma.Decimal(dto.principalAmount);
    const monthly = new Prisma.Decimal(dto.monthlyDeduction);

    return this.prisma.employeeLoan.create({
      data: {
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        type: dto.type,
        principalAmount: principal,
        monthlyDeduction: monthly,
        balanceAmount: principal,
        disbursedDate: new Date(),
        remarks: dto.remarks,
      },
    });
  }

  // 4. Payroll Generation & Net Salary Calculation
  async generatePayroll(dto: GeneratePayrollDto, userId: string) {
    const [year, month] = dto.monthYear.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('Invalid monthYear format. Must be YYYY-MM');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Existing check
    const existing = await this.prisma.payroll.findFirst({
      where: { companyId: dto.companyId, monthYear: dto.monthYear },
    });
    if (existing && existing.status === 'POSTED') {
      throw new ConflictException(`Payroll for ${dto.monthYear} has already been posted and locked`);
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: dto.companyId,
        ...(dto.factoryId ? { factoryId: dto.factoryId } : {}),
        active: true,
      },
      include: {
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
        },
        loans: {
          where: { status: 'ACTIVE', balanceAmount: { gt: 0 } },
        },
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found to generate payroll');
    }

    const bonusMap = new Map<string, number>();
    if (dto.bonusOverrides) {
      for (const b of dto.bonusOverrides) {
        bonusMap.set(b.employeeId, b.bonusAmount);
      }
    }

    const lines = [];
    let sumBaseSalary = 0;
    let sumOvertime = 0;
    let sumBonus = 0;
    let sumDeductions = 0;
    let sumNetSalary = 0;

    for (const emp of employees) {
      const baseSalaryNum = Number(emp.baseSalary);
      const dailyRate = baseSalaryNum / 30;
      const hourlyRate = (dailyRate / 8) * 1.5;

      let presentDays = 30;
      let absentDays = 0;
      let totalOvertimeHours = 0;

      if (emp.attendances.length > 0) {
        presentDays = emp.attendances.filter((a) => a.status === 'PRESENT').length;
        absentDays = emp.attendances.filter((a) => a.status === 'ABSENT').length;
        totalOvertimeHours = emp.attendances.reduce((acc, a) => acc + Number(a.overtimeHours || 0), 0);
      }

      const overtimeAmount = Number((totalOvertimeHours * hourlyRate).toFixed(2));
      const absentDeduction = Number((absentDays * dailyRate).toFixed(2));
      const bonusAmount = bonusMap.get(emp.id) || 0;

      // Loan / Advance deduction
      let advanceDeduction = 0;
      for (const loan of emp.loans) {
        const bal = Number(loan.balanceAmount);
        const monthly = Number(loan.monthlyDeduction);
        const toDeduct = Math.min(bal, monthly);
        advanceDeduction += toDeduct;
      }

      const otherDeduction = absentDeduction;
      const totalDeductions = advanceDeduction + otherDeduction;
      const grossEarnings = baseSalaryNum + overtimeAmount + bonusAmount;
      const netSalary = Math.max(0, Number((grossEarnings - totalDeductions).toFixed(2)));

      sumBaseSalary += baseSalaryNum;
      sumOvertime += overtimeAmount;
      sumBonus += bonusAmount;
      sumDeductions += totalDeductions;
      sumNetSalary += netSalary;

      lines.push({
        employeeId: emp.id,
        baseSalary: new Prisma.Decimal(baseSalaryNum.toFixed(2)),
        presentDays,
        absentDays,
        overtimeHours: new Prisma.Decimal(totalOvertimeHours.toFixed(2)),
        overtimeAmount: new Prisma.Decimal(overtimeAmount.toFixed(2)),
        bonusAmount: new Prisma.Decimal(bonusAmount.toFixed(2)),
        advanceDeduction: new Prisma.Decimal(advanceDeduction.toFixed(2)),
        otherDeduction: new Prisma.Decimal(otherDeduction.toFixed(2)),
        netSalary: new Prisma.Decimal(netSalary.toFixed(2)),
      });
    }

    const payrollNumber = `PAY-${dto.monthYear.replace('-', '')}`;

    if (existing) {
      // Re-generate lines for draft
      await this.prisma.payrollLine.deleteMany({ where: { payrollId: existing.id } });
      return this.prisma.payroll.update({
        where: { id: existing.id },
        data: {
          totalEmployees: employees.length,
          totalBaseSalary: new Prisma.Decimal(sumBaseSalary.toFixed(2)),
          totalOvertime: new Prisma.Decimal(sumOvertime.toFixed(2)),
          totalBonus: new Prisma.Decimal(sumBonus.toFixed(2)),
          totalDeductions: new Prisma.Decimal(sumDeductions.toFixed(2)),
          totalNetSalary: new Prisma.Decimal(sumNetSalary.toFixed(2)),
          lines: { create: lines },
        },
        include: { lines: { include: { employee: true } } },
      });
    }

    return this.prisma.payroll.create({
      data: {
        companyId: dto.companyId,
        factoryId: dto.factoryId,
        payrollNumber,
        monthYear: dto.monthYear,
        totalEmployees: employees.length,
        totalBaseSalary: new Prisma.Decimal(sumBaseSalary.toFixed(2)),
        totalOvertime: new Prisma.Decimal(sumOvertime.toFixed(2)),
        totalBonus: new Prisma.Decimal(sumBonus.toFixed(2)),
        totalDeductions: new Prisma.Decimal(sumDeductions.toFixed(2)),
        totalNetSalary: new Prisma.Decimal(sumNetSalary.toFixed(2)),
        status: 'DRAFT',
        createdById: userId,
        lines: { create: lines },
      },
      include: { lines: { include: { employee: true } } },
    });
  }

  // 5. Post Payroll with Double-Entry Accounting
  async postPayroll(payrollId: string, companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payroll = await tx.payroll.findFirst({
        where: { id: payrollId, companyId },
        include: { lines: true },
      });

      if (!payroll) {
        throw new NotFoundException(`Payroll ${payrollId} not found`);
      }
      if (payroll.status === 'POSTED') {
        throw new ConflictException(`Payroll ${payroll.payrollNumber} is already posted`);
      }

      // Decrement loan balances
      for (const line of payroll.lines) {
        const advanceDed = Number(line.advanceDeduction);
        if (advanceDed > 0) {
          const activeLoan = await tx.employeeLoan.findFirst({
            where: { employeeId: line.employeeId, status: 'ACTIVE' },
          });
          if (activeLoan) {
            const newBal = Math.max(0, Number(activeLoan.balanceAmount) - advanceDed);
            await tx.employeeLoan.update({
              where: { id: activeLoan.id },
              data: {
                balanceAmount: new Prisma.Decimal(newBal.toFixed(2)),
                status: newBal <= 0 ? 'CLOSED' : 'ACTIVE',
              },
            });
          }
        }
      }

      // Update payroll status
      const updated = await tx.payroll.update({
        where: { id: payroll.id },
        data: {
          status: 'POSTED',
          disbursedDate: new Date(),
        },
        include: { lines: { include: { employee: true } } },
      });

      // Post Double-Entry Journal
      // Dr Salaries Expense (6010) = gross earnings (baseSalary + overtime + bonus)
      // Cr Advance Deductions (1040) = advanceDeduction
      // Cr Salaries Payable / Cash / Bank (2030) = netSalary
      const grossEarnings = Number(payroll.totalBaseSalary) + Number(payroll.totalOvertime) + Number(payroll.totalBonus);
      const grossDecimal = new Prisma.Decimal(grossEarnings.toFixed(2));
      const advanceDecimal = payroll.totalDeductions;
      const netSalaryDecimal = payroll.totalNetSalary;

      // Get or create Salary Expense Account (6010)
      let salaryExpenseAcc = await tx.account.findFirst({
        where: { companyId, code: '6010' },
      });
      if (!salaryExpenseAcc) {
        salaryExpenseAcc = await tx.account.create({
          data: {
            companyId,
            code: '6010',
            name: 'Salaries and Wages Expense',
            type: AccountType.EXPENSE,
            isSystem: true,
          },
        });
      }

      // Get or create Advance Account (1040)
      let advanceAcc = await tx.account.findFirst({
        where: { companyId, code: '1040' },
      });
      if (!advanceAcc) {
        advanceAcc = await tx.account.create({
          data: {
            companyId,
            code: '1040',
            name: 'Employee Advances and Receivables',
            type: AccountType.ASSET,
            isSystem: true,
          },
        });
      }

      // Get or create Salaries Payable Account (2030)
      let payableAcc = await tx.account.findFirst({
        where: { companyId, code: '2030' },
      });
      if (!payableAcc) {
        payableAcc = await tx.account.create({
          data: {
            companyId,
            code: '2030',
            name: 'Salaries and Wages Payable',
            type: AccountType.LIABILITY,
            isSystem: true,
          },
        });
      }

      const journalNumber = `JV-${payroll.payrollNumber}`;
      const now = new Date();

      const journalLines: any[] = [
        {
          accountId: salaryExpenseAcc.id,
          accountCode: salaryExpenseAcc.code,
          description: `Payroll Gross Earnings for ${payroll.monthYear}`,
          debit: grossDecimal,
          credit: new Prisma.Decimal(0),
        },
      ];

      if (Number(advanceDecimal) > 0) {
        journalLines.push({
          accountId: advanceAcc.id,
          accountCode: advanceAcc.code,
          description: `Loan and Advance Deductions for ${payroll.monthYear}`,
          debit: new Prisma.Decimal(0),
          credit: advanceDecimal,
        });
      }

      journalLines.push({
        accountId: payableAcc.id,
        accountCode: payableAcc.code,
        description: `Net Salary Payable for ${payroll.monthYear}`,
        debit: new Prisma.Decimal(0),
        credit: netSalaryDecimal,
      });

      // Ensure balance: sumDebit == sumCredit
      const totalDeb = journalLines.reduce((acc, l) => acc + Number(l.debit), 0);
      const totalCr = journalLines.reduce((acc, l) => acc + Number(l.credit), 0);

      if (Math.abs(totalDeb - totalCr) > 0.05) {
        // adjust roundoff to payable
        const diff = Number((totalDeb - totalCr).toFixed(2));
        journalLines[journalLines.length - 1].credit = new Prisma.Decimal(
          (Number(journalLines[journalLines.length - 1].credit) + diff).toFixed(2),
        );
      }

      await tx.journal.create({
        data: {
          companyId,
          factoryId: payroll.factoryId,
          number: journalNumber,
          voucherType: VoucherType.JOURNAL,
          sourceType: 'PAYROLL',
          sourceId: payroll.id,
          status: JournalStatus.POSTED,
          currency: 'BDT',
          voucherDate: now,
          postedAt: now,
          narration: `Automated Monthly Payroll Disbursement Journal for ${payroll.monthYear}`,
          totalAmount: grossDecimal,
          createdById: userId,
          lines: {
            create: journalLines,
          },
        },
      });

      return updated;
    });
  }

  // 6. List Payrolls
  async listPayrolls(companyId: string, factoryId?: string) {
    return this.prisma.payroll.findMany({
      where: {
        companyId,
        ...(factoryId ? { factoryId } : {}),
      },
      include: {
        lines: {
          include: {
            employee: { select: { id: true, employeeCode: true, fullName: true, department: true, designation: true } },
          },
        },
      },
      orderBy: { monthYear: 'desc' },
    });
  }
}

