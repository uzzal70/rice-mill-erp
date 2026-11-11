import { Injectable } from '@nestjs/common';
import {
  AccountType,
  JournalStatus,
  Prisma,
  VoucherType,
} from '@prisma/client';

@Injectable()
export class AutoAccountingService {
  /**
   * Helper to resolve or ensure an account exists by code in the given company
   */
  async getOrCreateAccount(
    tx: Prisma.TransactionClient,
    companyId: string,
    code: string,
    fallbackName: string,
    type: AccountType,
  ) {
    let account = await tx.account.findFirst({
      where: { companyId, code },
    });
    if (!account) {
      account = await tx.account.create({
        data: {
          companyId,
          code,
          name: fallbackName,
          type,
          isSystem: true,
        },
      });
    }
    return account;
  }

  /**
   * Section 42: Automatic Accounting for Purchase Invoice Posting
   * Dr Inventory (Raw Paddy 1060)
   * Cr Supplier Payable (Accounts Payable 2010)
   */
  async postPurchaseInvoice(
    tx: Prisma.TransactionClient,
    invoice: {
      id: string;
      companyId: string;
      factoryId: string;
      invoiceNumber: string;
      supplierId: string;
      payableAmount: Prisma.Decimal;
    },
    userId: string,
  ) {
    const amount = Number(invoice.payableAmount);
    if (amount <= 0) return null;

    const existing = await tx.journal.findUnique({
      where: { sourceType_sourceId: { sourceType: 'PURCHASE', sourceId: invoice.id } },
    });
    if (existing) return existing;

    const rawInventoryAccount = await this.getOrCreateAccount(
      tx,
      invoice.companyId,
      '1060',
      'Raw Material Inventory (Paddy)',
      AccountType.ASSET,
    );

    const accountsPayableAccount = await this.getOrCreateAccount(
      tx,
      invoice.companyId,
      '2010',
      'Accounts Payable (Trade Creditors)',
      AccountType.LIABILITY,
    );

    const journalNumber = `PB-${invoice.invoiceNumber}`;
    const now = new Date();

    const journal = await tx.journal.create({
      data: {
        companyId: invoice.companyId,
        factoryId: invoice.factoryId,
        number: journalNumber,
        voucherType: VoucherType.PURCHASE,
        sourceType: 'PURCHASE',
        sourceId: invoice.id,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        voucherDate: now,
        postedAt: now,
        narration: `Automated Purchase Invoice Posting: ${invoice.invoiceNumber}`,
        totalAmount: invoice.payableAmount,
        partnerId: invoice.supplierId,
        createdById: userId,
        lines: {
          create: [
            {
              accountId: rawInventoryAccount.id,
              accountCode: rawInventoryAccount.code,
              partnerId: invoice.supplierId,
              description: `Paddy Inventory Receipt (${invoice.invoiceNumber})`,
              debit: invoice.payableAmount,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: accountsPayableAccount.id,
              accountCode: accountsPayableAccount.code,
              partnerId: invoice.supplierId,
              description: `Supplier Payable (${invoice.invoiceNumber})`,
              debit: new Prisma.Decimal(0),
              credit: invoice.payableAmount,
            },
          ],
        },
      },
    });

    // Update account balances
    await tx.account.update({
      where: { id: rawInventoryAccount.id },
      data: { currentBalance: { increment: invoice.payableAmount } },
    });
    await tx.account.update({
      where: { id: accountsPayableAccount.id },
      data: { currentBalance: { increment: invoice.payableAmount } },
    });

    return journal;
  }

  /**
   * Section 42: Automatic Accounting for Sales Dispatch Posting
   * Dr Customer (Accounts Receivable 1050)
   * Cr Sales Revenue (4010)
   */
  async postSalesDispatch(
    tx: Prisma.TransactionClient,
    dispatch: {
      id: string;
      companyId: string;
      factoryId: string;
      deliveryNumber: string;
      customerId: string;
      totalBags?: number;
      lines: Array<{ dispatchedKg: Prisma.Decimal | number; salesOrderLine?: { unitRate?: Prisma.Decimal | number } | null }>;
    },
    userId: string,
  ) {
    let totalRevenue = 0;
    for (const l of dispatch.lines) {
      const kg = Number(l.dispatchedKg || 0);
      const rate = Number(l.salesOrderLine?.unitRate || 65); // standard default if not provided
      totalRevenue += kg * rate;
    }
    if (totalRevenue <= 0) return null;

    const existing = await tx.journal.findUnique({
      where: { sourceType_sourceId: { sourceType: 'SALES', sourceId: dispatch.id } },
    });
    if (existing) return existing;

    const arAccount = await this.getOrCreateAccount(
      tx,
      dispatch.companyId,
      '1050',
      'Accounts Receivable (Trade Debtors)',
      AccountType.ASSET,
    );

    const salesRevenueAccount = await this.getOrCreateAccount(
      tx,
      dispatch.companyId,
      '4010',
      'Finished Rice Sales Revenue',
      AccountType.REVENUE,
    );

    const revenueDecimal = new Prisma.Decimal(totalRevenue.toFixed(2));
    const journalNumber = `SV-${dispatch.deliveryNumber}`;
    const now = new Date();

    const journal = await tx.journal.create({
      data: {
        companyId: dispatch.companyId,
        factoryId: dispatch.factoryId,
        number: journalNumber,
        voucherType: VoucherType.SALES,
        sourceType: 'SALES',
        sourceId: dispatch.id,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        voucherDate: now,
        postedAt: now,
        narration: `Automated Sales Dispatch Delivery: ${dispatch.deliveryNumber}`,
        totalAmount: revenueDecimal,
        partnerId: dispatch.customerId,
        createdById: userId,
        lines: {
          create: [
            {
              accountId: arAccount.id,
              accountCode: arAccount.code,
              partnerId: dispatch.customerId,
              description: `Trade Customer Receivable (${dispatch.deliveryNumber})`,
              debit: revenueDecimal,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: salesRevenueAccount.id,
              accountCode: salesRevenueAccount.code,
              partnerId: dispatch.customerId,
              description: `Sales Revenue Recognized (${dispatch.deliveryNumber})`,
              debit: new Prisma.Decimal(0),
              credit: revenueDecimal,
            },
          ],
        },
      },
    });

    // Update account balances
    await tx.account.update({
      where: { id: arAccount.id },
      data: { currentBalance: { increment: revenueDecimal } },
    });
    await tx.account.update({
      where: { id: salesRevenueAccount.id },
      data: { currentBalance: { increment: revenueDecimal } },
    });

    return journal;
  }

  /**
   * Section 42: Automatic Accounting for Production Batch Posting
   * Dr Finished Goods (1070)
   * Dr By-products (1080)
   * Cr Raw Material Consumed (5010)
   */
  async postProductionBatch(
    tx: Prisma.TransactionClient,
    batch: {
      id: string;
      companyId: string;
      factoryId: string;
      batchNumber: string;
      inputQuantityKg: Prisma.Decimal | number;
      outputs?: Array<{ outputKg: Prisma.Decimal | number; itemKind?: string }>;
    },
    userId: string,
  ) {
    const inputKg = Number(batch.inputQuantityKg || 0);
    if (inputKg <= 0) return null;

    const existing = await tx.journal.findUnique({
      where: { sourceType_sourceId: { sourceType: 'PRODUCTION', sourceId: batch.id } },
    });
    if (existing) return existing;

    const estimatedPaddyRate = 35; // standard BDT / KG
    const totalPaddyCost = Number((inputKg * estimatedPaddyRate).toFixed(2));

    const finishedGoodsAccount = await this.getOrCreateAccount(
      tx,
      batch.companyId,
      '1070',
      'Finished Goods Inventory (Rice)',
      AccountType.ASSET,
    );

    const byProductAccount = await this.getOrCreateAccount(
      tx,
      batch.companyId,
      '1080',
      'By-Product Inventory (Husk, Bran, Broken)',
      AccountType.ASSET,
    );

    const rawMaterialCostAccount = await this.getOrCreateAccount(
      tx,
      batch.companyId,
      '5010',
      'Cost of Raw Paddy Consumed',
      AccountType.EXPENSE,
    );

    // 85% to finished goods, 15% to by-products
    const finishedGoodsValue = Number((totalPaddyCost * 0.85).toFixed(2));
    const byProductValue = Number((totalPaddyCost - finishedGoodsValue).toFixed(2));

    const totalCostDecimal = new Prisma.Decimal(totalPaddyCost.toFixed(2));
    const finishedDecimal = new Prisma.Decimal(finishedGoodsValue.toFixed(2));
    const byProductDecimal = new Prisma.Decimal(byProductValue.toFixed(2));

    const journalNumber = `PRD-${batch.batchNumber}`;
    const now = new Date();

    const journal = await tx.journal.create({
      data: {
        companyId: batch.companyId,
        factoryId: batch.factoryId,
        number: journalNumber,
        voucherType: VoucherType.JOURNAL,
        sourceType: 'PRODUCTION',
        sourceId: batch.id,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        voucherDate: now,
        postedAt: now,
        narration: `Automated Milling Production Batch Conversion: ${batch.batchNumber}`,
        totalAmount: totalCostDecimal,
        createdById: userId,
        lines: {
          create: [
            {
              accountId: finishedGoodsAccount.id,
              accountCode: finishedGoodsAccount.code,
              description: `Milled Finished Rice Yield (${batch.batchNumber})`,
              debit: finishedDecimal,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: byProductAccount.id,
              accountCode: byProductAccount.code,
              description: `By-Product Yield Recovery (${batch.batchNumber})`,
              debit: byProductDecimal,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: rawMaterialCostAccount.id,
              accountCode: rawMaterialCostAccount.code,
              description: `Raw Paddy Consumed in Milling (${batch.batchNumber})`,
              debit: new Prisma.Decimal(0),
              credit: totalCostDecimal,
            },
          ],
        },
      },
    });

    // Update account balances
    await tx.account.update({
      where: { id: finishedGoodsAccount.id },
      data: { currentBalance: { increment: finishedDecimal } },
    });
    await tx.account.update({
      where: { id: byProductAccount.id },
      data: { currentBalance: { increment: byProductDecimal } },
    });
    await tx.account.update({
      where: { id: rawMaterialCostAccount.id },
      data: { currentBalance: { increment: totalCostDecimal } },
    });

    return journal;
  }

  /**
   * Section 42: Automatic Accounting for Customer Payment/Receipt
   * Dr Cash (1010) or Bank (1020)
   * Cr Customer Receivable (1050)
   */
  async postCustomerReceipt(
    tx: Prisma.TransactionClient,
    receipt: {
      id: string;
      companyId: string;
      factoryId: string;
      receiptNumber: string;
      customerId: string;
      amount: Prisma.Decimal | number;
      paymentMode?: 'CASH' | 'BANK';
    },
    userId: string,
  ) {
    const amountNum = Number(receipt.amount || 0);
    if (amountNum <= 0) return null;

    const existing = await tx.journal.findUnique({
      where: { sourceType_sourceId: { sourceType: 'CUSTOMER_RECEIPT', sourceId: receipt.id } },
    });
    if (existing) return existing;

    const cashOrBankCode = receipt.paymentMode === 'BANK' ? '1020' : '1010';
    const cashOrBankName = receipt.paymentMode === 'BANK' ? 'Bank Account' : 'Cash in Hand';

    const cashAccount = await this.getOrCreateAccount(
      tx,
      receipt.companyId,
      cashOrBankCode,
      cashOrBankName,
      AccountType.ASSET,
    );

    const arAccount = await this.getOrCreateAccount(
      tx,
      receipt.companyId,
      '1050',
      'Accounts Receivable (Trade Debtors)',
      AccountType.ASSET,
    );

    const amountDecimal = new Prisma.Decimal(amountNum.toFixed(2));
    const journalNumber = `CR-${receipt.receiptNumber}`;
    const now = new Date();

    const journal = await tx.journal.create({
      data: {
        companyId: receipt.companyId,
        factoryId: receipt.factoryId,
        number: journalNumber,
        voucherType: VoucherType.RECEIPT,
        sourceType: 'CUSTOMER_RECEIPT',
        sourceId: receipt.id,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        voucherDate: now,
        postedAt: now,
        narration: `Automated Customer Payment Receipt: ${receipt.receiptNumber}`,
        totalAmount: amountDecimal,
        partnerId: receipt.customerId,
        createdById: userId,
        lines: {
          create: [
            {
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              partnerId: receipt.customerId,
              description: `Cash/Bank Collections from Customer (${receipt.receiptNumber})`,
              debit: amountDecimal,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: arAccount.id,
              accountCode: arAccount.code,
              partnerId: receipt.customerId,
              description: `Customer Receivable Settlement (${receipt.receiptNumber})`,
              debit: new Prisma.Decimal(0),
              credit: amountDecimal,
            },
          ],
        },
      },
    });

    await tx.account.update({
      where: { id: cashAccount.id },
      data: { currentBalance: { increment: amountDecimal } },
    });
    await tx.account.update({
      where: { id: arAccount.id },
      data: { currentBalance: { decrement: amountDecimal } },
    });

    return journal;
  }

  /**
   * Section 42: Automatic Accounting for Supplier Payment
   * Dr Supplier Payable (2010)
   * Cr Cash (1010) or Bank (1020)
   */
  async postSupplierPayment(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      companyId: string;
      factoryId: string;
      paymentNumber: string;
      supplierId: string;
      amount: Prisma.Decimal | number;
      paymentMode?: 'CASH' | 'BANK';
    },
    userId: string,
  ) {
    const amountNum = Number(payment.amount || 0);
    if (amountNum <= 0) return null;

    const existing = await tx.journal.findUnique({
      where: { sourceType_sourceId: { sourceType: 'SUPPLIER_PAYMENT', sourceId: payment.id } },
    });
    if (existing) return existing;

    const cashOrBankCode = payment.paymentMode === 'BANK' ? '1020' : '1010';
    const cashOrBankName = payment.paymentMode === 'BANK' ? 'Bank Account' : 'Cash in Hand';

    const apAccount = await this.getOrCreateAccount(
      tx,
      payment.companyId,
      '2010',
      'Accounts Payable (Trade Creditors)',
      AccountType.LIABILITY,
    );

    const cashAccount = await this.getOrCreateAccount(
      tx,
      payment.companyId,
      cashOrBankCode,
      cashOrBankName,
      AccountType.ASSET,
    );

    const amountDecimal = new Prisma.Decimal(amountNum.toFixed(2));
    const journalNumber = `PV-${payment.paymentNumber}`;
    const now = new Date();

    const journal = await tx.journal.create({
      data: {
        companyId: payment.companyId,
        factoryId: payment.factoryId,
        number: journalNumber,
        voucherType: VoucherType.PAYMENT,
        sourceType: 'SUPPLIER_PAYMENT',
        sourceId: payment.id,
        status: JournalStatus.POSTED,
        currency: 'BDT',
        voucherDate: now,
        postedAt: now,
        narration: `Automated Supplier Disbursement Payment: ${payment.paymentNumber}`,
        totalAmount: amountDecimal,
        partnerId: payment.supplierId,
        createdById: userId,
        lines: {
          create: [
            {
              accountId: apAccount.id,
              accountCode: apAccount.code,
              partnerId: payment.supplierId,
              description: `Supplier Payable Cleared (${payment.paymentNumber})`,
              debit: amountDecimal,
              credit: new Prisma.Decimal(0),
            },
            {
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              partnerId: payment.supplierId,
              description: `Cash/Bank Disbursement to Supplier (${payment.paymentNumber})`,
              debit: new Prisma.Decimal(0),
              credit: amountDecimal,
            },
          ],
        },
      },
    });

    await tx.account.update({
      where: { id: apAccount.id },
      data: { currentBalance: { decrement: amountDecimal } },
    });
    await tx.account.update({
      where: { id: cashAccount.id },
      data: { currentBalance: { decrement: amountDecimal } },
    });

    return journal;
  }

  /**
   * Section 77 & 78: Accounting Reversal for Cancelled or Corrected Transactions
   * Inverts debits and credits, marks original journal as REVERSED, and links reversalOfId.
   */
  async createReversalJournal(
    tx: Prisma.TransactionClient,
    originalJournalId: string,
    reason: string,
    userId: string,
  ) {
    const original = await tx.journal.findUnique({
      where: { id: originalJournalId },
      include: { lines: true },
    });

    if (!original) {
      throw new Error(`Original journal ${originalJournalId} not found.`);
    }

    if (original.status === JournalStatus.REVERSED) {
      throw new Error(`Journal ${original.number} has already been reversed.`);
    }

    // Mark original journal as REVERSED
    await tx.journal.update({
      where: { id: original.id },
      data: { status: JournalStatus.REVERSED },
    });

    const reversalNumber = `REV-${original.number}-${Date.now().toString().slice(-4)}`;
    const now = new Date();

    // Create contra journal with inverted debits and credits
    const reversalJournal = await tx.journal.create({
      data: {
        companyId: original.companyId,
        factoryId: original.factoryId,
        number: reversalNumber,
        voucherType: original.voucherType,
        sourceType: 'REVERSAL',
        sourceId: original.id,
        reversalOfId: original.id,
        status: JournalStatus.POSTED,
        currency: original.currency,
        voucherDate: now,
        postedAt: now,
        narration: `Reversal of ${original.number}. Reason: ${reason}`,
        totalAmount: original.totalAmount,
        partnerId: original.partnerId,
        createdById: userId,
        lines: {
          create: original.lines.map((line) => ({
            accountId: line.accountId,
            accountCode: line.accountCode,
            partnerId: line.partnerId,
            description: `Contra Reversal: ${line.description || original.number}`,
            debit: line.credit, // Inverted!
            credit: line.debit, // Inverted!
          })),
        },
      },
    });

    // Invert account current balances
    for (const line of original.lines) {
      if (line.accountId) {
        const netChange = Number(line.debit) - Number(line.credit);
        await tx.account.update({
          where: { id: line.accountId },
          data: { currentBalance: { decrement: netChange } },
        });
      }
    }

    return reversalJournal;
  }
}
