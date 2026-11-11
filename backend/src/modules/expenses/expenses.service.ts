import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  ExpenseCategory,
  ExpensePaymentMode,
  ExpenseType,
  JournalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateExpenseDto,
  ExpenseActionDto,
  ListExpenseDto,
  UpdateExpenseDto,
} from './expenses.dto';

const expenseInclude = {
  payeePartner: {
    select: { id: true, name: true, businessName: true, code: true, phone: true },
  },
  vehicle: {
    select: { id: true, vehicleNumber: true, vehicleType: true, driverName: true },
  },
  productionLine: {
    select: { id: true, name: true, code: true },
  },
  lines: {
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class ExpensesService {
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
        resource: 'expenses',
        action,
        resourceId,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      },
    });
  }

  private async generateVoucherNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    date: Date,
  ): Promise<string> {
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `EXP-${yearMonth}-`;
    const count = await tx.expense.count({
      where: {
        companyId,
        voucherNumber: { startsWith: prefix },
      },
    });
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async list(q: ListExpenseDto) {
    const where: Prisma.ExpenseWhereInput = {
      companyId: q.companyId,
      ...(q.factoryId ? { factoryId: q.factoryId } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.paymentMode ? { paymentMode: q.paymentMode } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.fromDate || q.toDate
        ? {
            expenseDate: {
              ...(q.fromDate ? { gte: new Date(q.fromDate) } : {}),
              ...(q.toDate ? { lte: new Date(q.toDate) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { voucherNumber: { contains: q.search, mode: 'insensitive' } },
              { title: { contains: q.search, mode: 'insensitive' } },
              { payeeName: { contains: q.search, mode: 'insensitive' } },
              { billReference: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { expenseDate: 'desc' },
    });
  }

  async getExpense(id: string, companyId: string, factoryId?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        companyId,
        ...(factoryId ? { factoryId } : {}),
      },
      include: expenseInclude,
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    return expense;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Validate company and factory
      const factory = await tx.factory.findFirst({
        where: { id: dto.factoryId, companyId: dto.companyId, active: true },
      });
      if (!factory) {
        throw new NotFoundException('Active factory not found for this company');
      }

      // Validate partner if provided
      if (dto.payeePartnerId) {
        const partner = await tx.partner.findFirst({
          where: { id: dto.payeePartnerId, companyId: dto.companyId, active: true },
        });
        if (!partner) {
          throw new NotFoundException('Payee partner not found in company');
        }
      }

      // Validate vehicle if provided
      if (dto.vehicleId) {
        const vehicle = await tx.vehicle.findFirst({
          where: { id: dto.vehicleId, companyId: dto.companyId, active: true },
        });
        if (!vehicle) {
          throw new NotFoundException('Vehicle not found in company');
        }
      }

      // Validate production line if provided
      if (dto.productionLineId) {
        const line = await tx.productionLine.findFirst({
          where: {
            id: dto.productionLineId,
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            active: true,
          },
        });
        if (!line) {
          throw new NotFoundException('Production line not found in factory');
        }
      }

      if (!dto.lines || dto.lines.length === 0) {
        throw new BadRequestException('Expense must have at least one line item');
      }

      let subtotal = 0;
      for (const line of dto.lines) {
        if (!line.description || !line.description.trim()) {
          throw new BadRequestException('Line description is required');
        }
        if (line.amount <= 0) {
          throw new BadRequestException('Line amount must be greater than zero');
        }
        subtotal += Number(line.amount);
      }

      const taxAmount = Number(dto.taxAmount || 0);
      if (taxAmount < 0) {
        throw new BadRequestException('Tax amount cannot be negative');
      }
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));

      const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : new Date();
      const voucherNumber = await this.generateVoucherNumber(tx, dto.companyId, expenseDate);

      const expense = await tx.expense.create({
        data: {
          companyId: dto.companyId,
          factoryId: dto.factoryId,
          voucherNumber,
          title: dto.title.trim(),
          category: dto.category,
          type: dto.type,
          paymentMode: dto.paymentMode || ExpensePaymentMode.CASH,
          status: DocumentStatus.DRAFT,
          expenseDate,
          payeeName: dto.payeeName?.trim(),
          payeePartnerId: dto.payeePartnerId,
          vehicleId: dto.vehicleId,
          productionLineId: dto.productionLineId,
          bankName: dto.bankName?.trim(),
          bankAccount: dto.bankAccount?.trim(),
          chequeOrTxnNumber: dto.chequeOrTxnNumber?.trim(),
          billReference: dto.billReference?.trim(),
          subtotalAmount: new Prisma.Decimal(subtotal.toFixed(2)),
          taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          remarks: dto.remarks?.trim(),
          createdById: userId,
          lines: {
            create: dto.lines.map((line) => ({
              companyId: dto.companyId,
              factoryId: dto.factoryId,
              description: line.description.trim(),
              quantity: line.quantity ? new Prisma.Decimal(line.quantity) : null,
              unitPrice: line.unitPrice ? new Prisma.Decimal(line.unitPrice) : null,
              amount: new Prisma.Decimal(line.amount.toFixed(2)),
              accountCode: line.accountCode?.trim() || `EXP_${dto.category}`,
            })),
          },
        },
        include: expenseInclude,
      });

      await this.audit(tx, dto.companyId, userId, 'CREATE', expense.id, null, expense);
      return expense;
    });
  }

  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (
        existing.status !== DocumentStatus.DRAFT &&
        existing.status !== DocumentStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Cannot update expense with status ${existing.status}. Only DRAFT or REJECTED can be edited.`,
        );
      }

      // If lines updated, recalculate
      let subtotal = Number(existing.subtotalAmount);
      let taxAmount = dto.taxAmount !== undefined ? Number(dto.taxAmount) : Number(existing.taxAmount);

      if (dto.lines) {
        if (dto.lines.length === 0) {
          throw new BadRequestException('Expense must have at least one line item');
        }
        subtotal = 0;
        for (const line of dto.lines) {
          if (!line.description || !line.description.trim()) {
            throw new BadRequestException('Line description is required');
          }
          if (line.amount <= 0) {
            throw new BadRequestException('Line amount must be greater than zero');
          }
          subtotal += Number(line.amount);
        }

        // Delete existing lines and re-create
        await tx.expenseLine.deleteMany({
          where: { expenseId: existing.id, companyId: dto.companyId, factoryId: dto.factoryId },
        });

        await tx.expenseLine.createMany({
          data: dto.lines.map((line) => ({
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            expenseId: existing.id,
            description: line.description.trim(),
            quantity: line.quantity ? new Prisma.Decimal(line.quantity) : null,
            unitPrice: line.unitPrice ? new Prisma.Decimal(line.unitPrice) : null,
            amount: new Prisma.Decimal(line.amount.toFixed(2)),
            accountCode:
              line.accountCode?.trim() || `EXP_${dto.category || existing.category}`,
          })),
        });
      }

      if (taxAmount < 0) {
        throw new BadRequestException('Tax amount cannot be negative');
      }
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : existing.title,
          category: dto.category || existing.category,
          type: dto.type || existing.type,
          paymentMode: dto.paymentMode || existing.paymentMode,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : existing.expenseDate,
          payeeName: dto.payeeName !== undefined ? dto.payeeName?.trim() : existing.payeeName,
          payeePartnerId:
            dto.payeePartnerId !== undefined ? dto.payeePartnerId : existing.payeePartnerId,
          vehicleId: dto.vehicleId !== undefined ? dto.vehicleId : existing.vehicleId,
          productionLineId:
            dto.productionLineId !== undefined ? dto.productionLineId : existing.productionLineId,
          bankName: dto.bankName !== undefined ? dto.bankName?.trim() : existing.bankName,
          bankAccount:
            dto.bankAccount !== undefined ? dto.bankAccount?.trim() : existing.bankAccount,
          chequeOrTxnNumber:
            dto.chequeOrTxnNumber !== undefined
              ? dto.chequeOrTxnNumber?.trim()
              : existing.chequeOrTxnNumber,
          billReference:
            dto.billReference !== undefined ? dto.billReference?.trim() : existing.billReference,
          subtotalAmount: new Prisma.Decimal(subtotal.toFixed(2)),
          taxAmount: new Prisma.Decimal(taxAmount.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          remarks: dto.remarks !== undefined ? dto.remarks?.trim() : existing.remarks,
        },
        include: expenseInclude,
      });

      await this.audit(tx, dto.companyId, userId, 'UPDATE', existing.id, existing, updated);
      return updated;
    });
  }

  async submit(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (
        existing.status !== DocumentStatus.DRAFT &&
        existing.status !== DocumentStatus.REJECTED
      ) {
        throw new BadRequestException(
          `Only DRAFT or REJECTED expenses can be submitted. Current status: ${existing.status}`,
        );
      }

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.SUBMITTED,
          rejectionReason: null,
        },
        include: expenseInclude,
      });

      await this.audit(tx, companyId, userId, 'SUBMIT', existing.id, existing, updated);
      return updated;
    });
  }

  async approve(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (
        existing.status !== DocumentStatus.SUBMITTED &&
        existing.status !== DocumentStatus.DRAFT
      ) {
        throw new BadRequestException(
          `Only SUBMITTED or DRAFT expenses can be approved. Current status: ${existing.status}`,
        );
      }

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          rejectionReason: null,
        },
        include: expenseInclude,
      });

      await this.audit(tx, companyId, userId, 'APPROVE', existing.id, existing, updated);
      return updated;
    });
  }

  async reject(id: string, companyId: string, factoryId: string, userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (
        existing.status !== DocumentStatus.SUBMITTED &&
        existing.status !== DocumentStatus.DRAFT
      ) {
        throw new BadRequestException(
          `Only SUBMITTED or DRAFT expenses can be rejected. Current status: ${existing.status}`,
        );
      }

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.REJECTED,
          rejectedById: userId,
          rejectionReason: reason.trim(),
        },
        include: expenseInclude,
      });

      await this.audit(tx, companyId, userId, 'REJECT', existing.id, existing, updated);
      return updated;
    });
  }

  async post(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (existing.status === DocumentStatus.POSTED) {
        throw new ConflictException(`Expense ${existing.voucherNumber} is already posted`);
      }
      if (
        existing.status !== DocumentStatus.APPROVED &&
        existing.status !== DocumentStatus.SUBMITTED
      ) {
        throw new BadRequestException(
          `Expense must be APPROVED before posting. Current status: ${existing.status}`,
        );
      }

      // Mark Expense as POSTED
      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.POSTED,
          postedById: userId,
          postedAt: new Date(),
        },
        include: expenseInclude,
      });

      // Post Double-Entry Journal Entry
      const debitAccount = `EXP_${existing.category}`;
      const creditAccount =
        existing.paymentMode === ExpensePaymentMode.CASH
          ? 'ASSET_CASH'
          : existing.paymentMode === ExpensePaymentMode.BANK
          ? 'ASSET_BANK'
          : existing.paymentMode === ExpensePaymentMode.PETTY_CASH
          ? 'ASSET_PETTY_CASH'
          : 'LIABILITY_ACCOUNTS_PAYABLE';

      const journalNumber = `JV-EXP-${existing.voucherNumber}`;

      await tx.journal.create({
        data: {
          companyId: existing.companyId,
          number: journalNumber,
          sourceType: 'EXPENSE',
          sourceId: existing.id,
          status: JournalStatus.POSTED,
          currency: 'BDT',
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountCode: debitAccount,
                description: `Expense: ${existing.title} (${existing.voucherNumber})`,
                debit: existing.totalAmount,
                credit: new Prisma.Decimal(0),
              },
              {
                accountCode: creditAccount,
                description: `Payment for ${existing.voucherNumber} via ${existing.paymentMode}${
                  existing.chequeOrTxnNumber ? ` Ref: ${existing.chequeOrTxnNumber}` : ''
                }`,
                debit: new Prisma.Decimal(0),
                credit: existing.totalAmount,
              },
            ],
          },
        },
      });

      await this.audit(tx, companyId, userId, 'POST', existing.id, existing, updated);
      return updated;
    });
  }

  async cancel(id: string, companyId: string, factoryId: string, userId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
        include: expenseInclude,
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (existing.status === DocumentStatus.POSTED) {
        throw new BadRequestException(
          `Cannot cancel a POSTED expense (${existing.voucherNumber}). A posted expense must be reversed through accounting credit adjustment.`,
        );
      }
      if (existing.status === DocumentStatus.CANCELLED) {
        throw new BadRequestException(`Expense is already cancelled`);
      }

      const updated = await tx.expense.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.CANCELLED,
          remarks: reason
            ? `${existing.remarks ? existing.remarks + ' | ' : ''}Cancelled: ${reason}`
            : existing.remarks,
        },
        include: expenseInclude,
      });

      await this.audit(tx, companyId, userId, 'CANCEL', existing.id, existing, updated);
      return updated;
    });
  }

  async delete(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findFirst({
        where: { id, companyId, factoryId },
      });
      if (!existing) {
        throw new NotFoundException(`Expense ${id} not found`);
      }
      if (
        existing.status !== DocumentStatus.DRAFT &&
        existing.status !== DocumentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Only DRAFT or CANCELLED expenses can be deleted. Current status: ${existing.status}`,
        );
      }

      await tx.expenseLine.deleteMany({
        where: { expenseId: existing.id, companyId, factoryId },
      });

      await tx.expense.delete({
        where: { id: existing.id },
      });

      await this.audit(tx, companyId, userId, 'DELETE', existing.id, existing, null);
      return { success: true, message: `Expense ${existing.voucherNumber} deleted successfully` };
    });
  }

  async getSummary(companyId: string, factoryId?: string, fromDate?: string, toDate?: string) {
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...(factoryId ? { factoryId } : {}),
      ...(fromDate || toDate
        ? {
            expenseDate: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            },
          }
        : {}),
    };

    const expenses = await this.prisma.expense.findMany({
      where,
      select: {
        id: true,
        category: true,
        type: true,
        paymentMode: true,
        status: true,
        totalAmount: true,
        expenseDate: true,
      },
    });

    let totalExpenseAmount = 0;
    let postedExpenseAmount = 0;
    let pendingApprovalCount = 0;
    let pendingApprovalAmount = 0;

    const byCategory: Record<ExpenseCategory, number> = {
      ELECTRICITY: 0,
      DIESEL: 0,
      GAS: 0,
      LABOUR: 0,
      REPAIR: 0,
      MAINTENANCE: 0,
      TRANSPORT: 0,
      LOADING: 0,
      UNLOADING: 0,
      PACKAGING: 0,
      RENT: 0,
      SECURITY: 0,
      OFFICE: 0,
      MISCELLANEOUS: 0,
    };

    const byType: Record<ExpenseType, number> = {
      FACTORY_EXPENSE: 0,
      OFFICE_EXPENSE: 0,
      PRODUCTION_EXPENSE: 0,
      TRANSPORT_EXPENSE: 0,
      ADMINISTRATIVE_EXPENSE: 0,
    };

    const byPaymentMode: Record<ExpensePaymentMode, number> = {
      CASH: 0,
      BANK: 0,
      PETTY_CASH: 0,
      PAYABLE: 0,
    };

    for (const exp of expenses) {
      if (exp.status === DocumentStatus.CANCELLED) continue;

      const amt = Number(exp.totalAmount);
      totalExpenseAmount += amt;

      if (exp.status === DocumentStatus.POSTED) {
        postedExpenseAmount += amt;
      }

      if (exp.status === DocumentStatus.SUBMITTED || exp.status === DocumentStatus.DRAFT) {
        pendingApprovalCount += 1;
        pendingApprovalAmount += amt;
      }

      byCategory[exp.category] = (byCategory[exp.category] || 0) + amt;
      byType[exp.type] = (byType[exp.type] || 0) + amt;
      byPaymentMode[exp.paymentMode] = (byPaymentMode[exp.paymentMode] || 0) + amt;
    }

    return {
      totalCount: expenses.length,
      totalExpenseAmount: Number(totalExpenseAmount.toFixed(2)),
      postedExpenseAmount: Number(postedExpenseAmount.toFixed(2)),
      pendingApprovalCount,
      pendingApprovalAmount: Number(pendingApprovalAmount.toFixed(2)),
      byCategory,
      byType,
      byPaymentMode,
    };
  }
}

