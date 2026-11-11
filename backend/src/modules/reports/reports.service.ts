import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ExportFormat, GenerateReportDto, ReportType } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilterOptions(companyId: string) {
    const [factories, godowns, partners, items, users] = await Promise.all([
      this.prisma.factory.findMany({
        where: { companyId },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.godown.findMany({
        where: { companyId },
        select: { id: true, name: true, code: true, factoryId: true },
      }),
      this.prisma.partner.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, type: true, phone: true },
      }),
      this.prisma.item.findMany({
        where: { companyId, active: true },
        select: { id: true, name: true, code: true, kind: true },
      }),
      this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, email: true },
      }),
    ]);

    return {
      factories,
      godowns,
      suppliers: partners.filter(p => p.type === 'SUPPLIER' || p.type === 'FARMER'),
      customers: partners.filter(p => p.type === 'CUSTOMER'),
      paddyItems: items.filter(i => i.kind === 'PADDY'),
      riceItems: items.filter(i => i.kind === 'RICE'),
      productItems: items.filter(i => i.kind === 'BY_PRODUCT' || i.kind === 'PACKAGING'),
      users,
    };
  }

  async generateReport(dto: GenerateReportDto) {
    const {
      companyId,
      reportType,
      startDate,
      endDate,
      factoryId,
      godownId,
      supplierId,
      customerId,
      paddyItemId,
      riceItemId,
      productItemId,
      batchNumber,
      userId,
      format = ExportFormat.JSON,
    } = dto;

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }
    const hasDateFilter = startDate || endDate;

    let headers: string[] = [];
    let rows: any[] = [];
    let totalQuantityKg = 0;
    let totalAmountBDT = 0;

    switch (reportType) {
      case ReportType.PROCUREMENT_REGISTER: {
        headers = ['Date', 'PO Number', 'Supplier', 'Item', 'Godown', 'Qty (KG)', 'Rate (BDT)', 'Net Amount (BDT)', 'Created By'];
        const where: Prisma.PurchaseOrderWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(supplierId ? { supplierId } : {}),
          ...(paddyItemId ? { itemId: paddyItemId } : {}),
          ...(godownId ? { destinationGodownId: godownId } : {}),
          ...(userId ? { createdById: userId } : {}),
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        };
        const purchases = await this.prisma.purchaseOrder.findMany({
          where,
          include: { supplier: true, item: true, destinationGodown: true, createdBy: true },
          orderBy: { createdAt: 'desc' },
        });
        rows = purchases.map(p => {
          const qty = Number(p.orderedQuantity);
          const rate = Number(p.unitRate);
          const amt = qty * rate;
          totalQuantityKg += qty;
          totalAmountBDT += amt;
          return {
            date: p.createdAt.toISOString().slice(0, 10),
            documentNumber: p.orderNumber,
            partyName: p.supplier?.name || '—',
            itemName: p.item?.name || 'Paddy',
            godownName: p.destinationGodown?.name || '—',
            quantityKg: qty,
            unitRate: rate,
            totalAmount: amt,
            userName: p.createdBy?.fullName || '—',
          };
        });
        break;
      }

      case ReportType.GATE_REGISTER: {
        headers = ['Date', 'Gate Number', 'Direction', 'Vehicle', 'Party', 'Gross (KG)', 'Tare (KG)', 'Net (KG)', 'Status'];
        const where: Prisma.GateEntryWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(supplierId || customerId ? { partnerId: supplierId || customerId } : {}),
          ...(paddyItemId || riceItemId || productItemId ? { itemId: paddyItemId || riceItemId || productItemId } : {}),
          ...(userId ? { createdById: userId } : {}),
          ...(hasDateFilter ? { enteredAt: dateFilter } : {}),
        };
        const gates = await this.prisma.gateEntry.findMany({
          where,
          include: { partner: true, weighbridgeTicket: true },
          orderBy: { enteredAt: 'desc' },
        });
        rows = gates.map(g => {
          const net = Number(g.weighbridgeTicket?.netWeight || 0);
          totalQuantityKg += net;
          return {
            date: g.enteredAt.toISOString().slice(0, 10),
            documentNumber: g.gateNumber,
            direction: g.direction,
            vehicleNumber: g.vehicleNumber,
            partyName: g.partner?.name || '—',
            grossKg: Number(g.weighbridgeTicket?.grossWeight || 0),
            tareKg: Number(g.weighbridgeTicket?.tareWeight || 0),
            quantityKg: net,
            status: g.status,
          };
        });
        break;
      }

      case ReportType.PRODUCTION_REGISTER: {
        headers = ['Date', 'Batch Number', 'Factory', 'Input Paddy (KG)', 'Rice Output (KG)', 'Recovery %', 'Status', 'Created By'];
        const where: Prisma.ProductionBatchWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(paddyItemId ? { inputItemId: paddyItemId } : {}),
          ...(batchNumber ? { batchNumber: { contains: batchNumber } } : {}),
          ...(userId ? { createdById: userId } : {}),
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        };
        const batches = await this.prisma.productionBatch.findMany({
          where,
          include: { outputs: { include: { item: true } }, createdBy: true, factory: true },
          orderBy: { createdAt: 'desc' },
        });
        rows = batches.map(b => {
          const inKg = Number(b.inputQuantityKg || 0);
          const riceKg = b.outputs
            .filter(o => o.item?.kind === 'RICE')
            .reduce((s, o) => s + Number(o.quantityKg), 0);
          const recovery = inKg > 0 ? (riceKg / inKg) * 100 : 0;
          totalQuantityKg += inKg;
          return {
            date: b.createdAt.toISOString().slice(0, 10),
            documentNumber: b.batchNumber,
            factoryName: b.factory?.name || '—',
            quantityKg: inKg,
            riceOutputKg: riceKg,
            recoveryPercentage: Number(recovery.toFixed(2)),
            status: b.status,
            userName: b.createdBy?.fullName || '—',
          };
        });
        break;
      }

      case ReportType.SALES_REGISTER: {
        headers = ['Date', 'Order Number', 'Customer', 'Items Count', 'Quantity (KG)', 'Total Amount (BDT)', 'Status', 'Created By'];
        const where: Prisma.SalesOrderWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(customerId ? { customerId } : {}),
          ...(userId ? { createdById: userId } : {}),
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        };
        const sales = await this.prisma.salesOrder.findMany({
          where,
          include: { customer: true, lines: true },
          orderBy: { createdAt: 'desc' },
        });
        rows = sales.map(s => {
          let sQty = 0;
          for (const l of s.lines) {
            if (!riceItemId || l.itemId === riceItemId) {
              sQty += Number(l.quantityKg);
            }
          }
          const amt = Number(s.totalAmount);
          totalQuantityKg += sQty;
          totalAmountBDT += amt;
          return {
            date: s.createdAt.toISOString().slice(0, 10),
            documentNumber: s.orderNumber,
            partyName: s.customer?.name || '—',
            linesCount: s.lines.length,
            quantityKg: sQty,
            totalAmount: amt,
            status: s.status,
            userName: s.createdById || '—',
          };
        });
        break;
      }

      case ReportType.STOCK_REGISTER: {
        headers = ['Item Name', 'Kind', 'Godown / Stack', 'Current Balance (KG)', 'Unit'];
        const where: Prisma.StockMovementWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(godownId ? { stack: { godownId } } : {}),
          ...(paddyItemId ? { itemId: paddyItemId } : {}),
          ...(riceItemId ? { itemId: riceItemId } : {}),
          ...(productItemId ? { itemId: productItemId } : {}),
        };
        const movements = await this.prisma.stockMovement.groupBy({
          by: ['itemId', 'stackId'],
          where,
          _sum: { quantity: true },
        });
        const [items, stacks] = await Promise.all([
          this.prisma.item.findMany({ where: { companyId } }),
          this.prisma.stack.findMany({ where: { companyId }, include: { godown: true } }),
        ]);
        const itemMap = new Map(items.map(i => [i.id, i]));
        const stackMap = new Map(stacks.map(s => [s.id, s]));

        rows = movements
          .map(sm => {
            const it = itemMap.get(sm.itemId);
            const st = sm.stackId ? stackMap.get(sm.stackId) : null;
            const bal = Number(sm._sum.quantity || 0);
            totalQuantityKg += bal;
            return {
              itemName: it?.name || 'Unknown',
              kind: it?.kind || '—',
              location: st ? `${st.godown?.name} / ${st.code}` : 'Unassigned',
              quantityKg: bal,
              unit: it?.baseUnit || 'KG',
            };
          })
          .filter(r => r.quantityKg !== 0);
        break;
      }

      case ReportType.EXPENSE_REGISTER: {
        headers = ['Date', 'Voucher Number', 'Category', 'Title', 'Payee', 'Payment Mode', 'Amount (BDT)', 'Status'];
        const where: Prisma.ExpenseWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(userId ? { createdById: userId } : {}),
          ...(hasDateFilter ? { expenseDate: dateFilter } : {}),
        };
        const expenses = await this.prisma.expense.findMany({
          where,
          orderBy: { expenseDate: 'desc' },
        });
        rows = expenses.map(e => {
          const amt = Number(e.totalAmount);
          totalAmountBDT += amt;
          return {
            date: e.expenseDate.toISOString().slice(0, 10),
            documentNumber: e.voucherNumber,
            category: e.category,
            title: e.title,
            payeeName: e.payeeName || '—',
            paymentMode: e.paymentMode,
            totalAmount: amt,
            status: e.status,
          };
        });
        break;
      }

      case ReportType.FINANCIAL_LEDGER: {
        headers = ['Date', 'Voucher #', 'Type', 'Account', 'Partner', 'Debit (BDT)', 'Credit (BDT)', 'Status'];
        const where: Prisma.JournalWhereInput = {
          companyId,
          ...(factoryId ? { factoryId } : {}),
          ...(supplierId || customerId ? { partnerId: supplierId || customerId } : {}),
          ...(hasDateFilter ? { voucherDate: dateFilter } : {}),
        };
        const journals = await this.prisma.journal.findMany({
          where,
          include: { partner: true, lines: true },
          orderBy: { voucherDate: 'desc' },
        });
        rows = journals.flatMap(j =>
          j.lines.map(line => {
            const dr = Number(line.debit);
            const cr = Number(line.credit);
            totalAmountBDT += Math.max(dr, cr);
            return {
              date: j.voucherDate.toISOString().slice(0, 10),
              documentNumber: j.number,
              voucherType: j.voucherType,
              accountCode: line.accountCode,
              partyName: j.partner?.name || '—',
              debit: dr,
              credit: cr,
              status: j.status,
            };
          })
        );
        break;
      }

      case ReportType.PARTY_STATEMENT: {
        headers = ['Date', 'Voucher #', 'Partner', 'Type', 'Debit (BDT)', 'Credit (BDT)', 'Narration'];
        const where: Prisma.JournalWhereInput = {
          companyId,
          partnerId: supplierId || customerId,
          ...(hasDateFilter ? { voucherDate: dateFilter } : {}),
        };
        const journals = await this.prisma.journal.findMany({
          where,
          include: { partner: true, lines: true },
          orderBy: { voucherDate: 'asc' },
        });
        rows = journals.flatMap(j =>
          j.lines.map(line => {
            const dr = Number(line.debit);
            const cr = Number(line.credit);
            totalAmountBDT += dr - cr;
            return {
              date: j.voucherDate.toISOString().slice(0, 10),
              documentNumber: j.number,
              partyName: j.partner?.name || '—',
              voucherType: j.voucherType,
              debit: dr,
              credit: cr,
              narration: line.description || j.narration || '—',
            };
          })
        );
        break;
      }
    }

    // Export formatting
    if (format === ExportFormat.CSV || format === ExportFormat.EXCEL) {
      const csvHeader = headers.join(',');
      const csvRows = rows.map(r =>
        Object.values(r)
          .map(val => (typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '')))
          .join(',')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');
      return {
        format,
        reportType,
        mimeType: format === ExportFormat.CSV ? 'text/csv' : 'application/vnd.ms-excel',
        fileName: `${reportType.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${format === ExportFormat.CSV ? 'csv' : 'csv'}`,
        content: csvContent,
      };
    }

    return {
      reportType,
      format,
      generatedAt: new Date().toISOString(),
      filtersApplied: {
        companyId,
        reportType,
        startDate: startDate || null,
        endDate: endDate || null,
        factoryId: factoryId || null,
        godownId: godownId || null,
        supplierId: supplierId || null,
        customerId: customerId || null,
        paddyItemId: paddyItemId || null,
        riceItemId: riceItemId || null,
        productItemId: productItemId || null,
        batchNumber: batchNumber || null,
        userId: userId || null,
      },
      headers,
      rows,
      summary: {
        totalRecords: rows.length,
        totalQuantityKg: Number(totalQuantityKg.toFixed(2)),
        totalAmountBDT: Number(totalAmountBDT.toFixed(2)),
      },
    };
  }
}
