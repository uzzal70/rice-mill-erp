import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertCategory, AlertSeverity, AlertType, DocumentStatus, GateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AlertsQueryDto, DismissAlertDto, RunScanDto, UpdateAlertRuleDto } from './alerts.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAlerts(query: AlertsQueryDto) {
    const { companyId, factoryId, category, severity, isDismissed } = query;
    const where: Prisma.SmartAlertWhereInput = { companyId };

    if (factoryId) where.factoryId = factoryId;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (isDismissed !== undefined) {
      where.isDismissed = isDismissed === 'true';
    } else {
      where.isDismissed = false; // default only active alerts
    }

    const [alerts, counts] = await Promise.all([
      this.prisma.smartAlert.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.smartAlert.groupBy({
        by: ['severity'],
        where: { companyId, isDismissed: false },
        _count: { _all: true },
      }),
    ]);

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const c of counts) {
      if (c.severity === AlertSeverity.CRITICAL) criticalCount = c._count._all;
      else if (c.severity === AlertSeverity.WARNING) warningCount = c._count._all;
      else if (c.severity === AlertSeverity.INFO) infoCount = c._count._all;
    }

    return {
      alerts,
      summary: {
        criticalCount,
        warningCount,
        infoCount,
        totalUnresolved: criticalCount + warningCount + infoCount,
      },
    };
  }

  async dismissAlert(id: string, dto: DismissAlertDto, userId?: string) {
    const alert = await this.prisma.smartAlert.findFirst({
      where: { id, companyId: dto.companyId },
    });
    if (!alert) throw new NotFoundException('Alert not found.');

    return this.prisma.smartAlert.update({
      where: { id },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
        dismissedById: userId || null,
      },
    });
  }

  async acknowledgeAlert(id: string, companyId: string, userId?: string) {
    const alert = await this.prisma.smartAlert.findFirst({
      where: { id, companyId },
    });
    if (!alert) throw new NotFoundException('Alert not found.');

    return this.prisma.smartAlert.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedById: userId || null,
      },
    });
  }

  async listRules(companyId: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    return rules;
  }

  async updateRule(dto: UpdateAlertRuleDto) {
    const { companyId, type, thresholdValue, isEnabled, severity, description } = dto;
    return this.prisma.alertRule.upsert({
      where: {
        companyId_type: { companyId, type },
      },
      create: {
        companyId,
        type,
        thresholdValue: new Prisma.Decimal(thresholdValue),
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        severity: severity || AlertSeverity.WARNING,
        description,
      },
      update: {
        thresholdValue: new Prisma.Decimal(thresholdValue),
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        ...(severity ? { severity } : {}),
        ...(description ? { description } : {}),
      },
    });
  }

  async runDiagnosticScan(dto: RunScanDto) {
    const { companyId, factoryId } = dto;
    const now = new Date();
    const createdAlerts: any[] = [];
    const factoryFilter = factoryId ? { factoryId } : {};

    // 1. Low Stock Check (< 5,000 KG)
    const stockMovements = await this.prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { companyId, ...factoryFilter },
      _sum: { quantity: true },
    });
    const lowStockMovements = stockMovements.filter(sm => Number(sm._sum.quantity || 0) < 5000);
    if (lowStockMovements.length > 0) {
      const items = await this.prisma.item.findMany({
        where: { id: { in: lowStockMovements.map(s => s.itemId) } },
      });
      for (const sm of lowStockMovements) {
        const item = items.find(i => i.id === sm.itemId);
        if (!item) continue;
        const qty = Number(sm._sum.quantity || 0);
        createdAlerts.push({
          companyId,
          factoryId,
          type: AlertType.LOW_STOCK,
          category: AlertCategory.INVENTORY,
          severity: qty <= 1000 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `Low Stock: ${item.name}`,
          message: `Stock level for ${item.name} (${item.code}) is down to ${qty.toLocaleString('en-IN')} KG (safety threshold: 5,000 KG).`,
          referenceType: 'Item',
          referenceId: item.id,
          metricValue: new Prisma.Decimal(qty),
          thresholdValue: new Prisma.Decimal(5000),
        });
      }
    }

    // 2. High Moisture Check (> 14.5%)
    const recentSamples = await this.prisma.qualitySample.findMany({
      where: {
        companyId,
        ...factoryFilter,
      },
      include: { gateEntry: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    for (const qs of recentSamples) {
      const mJson = qs.measurements as any;
      const moisture = Number(mJson?.moisture || mJson?.moistureContent || 0);
      if (moisture > 14.5) {
        createdAlerts.push({
          companyId,
          factoryId: qs.factoryId,
          type: AlertType.HIGH_MOISTURE,
          category: AlertCategory.QUALITY,
          severity: moisture > 16.0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `High Moisture Content: Sample #${qs.sampleNumber}`,
          message: `Quality sample ${qs.sampleNumber} tested at ${moisture}% moisture, exceeding standard 14.0% safe threshold.`,
          referenceType: 'QualitySample',
          referenceId: qs.id,
          metricValue: new Prisma.Decimal(moisture),
          thresholdValue: new Prisma.Decimal(14.5),
        });
      }
    }

    // 3. Low Recovery Check (< 62.0%)
    const recentBatches = await this.prisma.productionBatch.findMany({
      where: { companyId, ...factoryFilter },
      include: { outputs: { include: { item: true } } },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    for (const b of recentBatches) {
      const inKg = Number(b.inputQuantityKg || 0);
      if (inKg <= 0) continue;
      const riceOutputs = b.outputs.filter(o => o.item?.kind === 'RICE');
      const outKg = riceOutputs.reduce((s, o) => s + Number(o.quantityKg), 0);
      const recoveryPct = (outKg / inKg) * 100;
      if (recoveryPct < 62.0 && recoveryPct > 0) {
        createdAlerts.push({
          companyId,
          factoryId: b.factoryId,
          type: AlertType.LOW_RECOVERY,
          category: AlertCategory.OPERATIONS,
          severity: recoveryPct < 58.0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `Low Milling Recovery: Batch #${b.batchNumber}`,
          message: `Batch ${b.batchNumber} yielded only ${recoveryPct.toFixed(1)}% rice output (expected target: >= 65.0%).`,
          referenceType: 'ProductionBatch',
          referenceId: b.id,
          metricValue: new Prisma.Decimal(recoveryPct),
          thresholdValue: new Prisma.Decimal(62.0),
        });
      }
    }

    // 4. Customer Overdue Check (> 30 days)
    const overdueJournals = await this.prisma.journalLine.findMany({
      where: {
        journal: {
          companyId,
          voucherDate: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: 'POSTED',
        },
        accountCode: { in: ['1050', '1030'] },
        debit: { gt: 0 },
      },
      include: { journal: true },
      take: 5,
    });
    for (const j of overdueJournals) {
      const amt = Number(j.debit);
      createdAlerts.push({
        companyId,
        type: AlertType.CUSTOMER_OVERDUE,
        category: AlertCategory.FINANCE,
        severity: AlertSeverity.WARNING,
        title: `Overdue Customer Receivable: Voucher #${j.journal.number}`,
        message: `Outstanding receivable of ৳ ${amt.toLocaleString('en-IN')} remains unpaid past standard 30-day credit period.`,
        referenceType: 'Journal',
        referenceId: j.journal.id,
        metricValue: new Prisma.Decimal(amt),
        thresholdValue: new Prisma.Decimal(0),
      });
    }

    // 5. Supplier Payment Due
    const dueAccounts = await this.prisma.account.findMany({
      where: { companyId, code: '2010' },
      include: {
        journalLines: {
          where: { journal: { status: 'POSTED' } },
          select: { debit: true, credit: true },
        },
      },
    });
    for (const acc of dueAccounts) {
      const netPayable = acc.journalLines.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
      if (netPayable > 100000) {
        createdAlerts.push({
          companyId,
          type: AlertType.SUPPLIER_PAYMENT_DUE,
          category: AlertCategory.FINANCE,
          severity: netPayable > 500000 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `Supplier Accounts Payable Exceeding Threshold`,
          message: `Current outstanding supplier payables amount to ৳ ${netPayable.toLocaleString('en-IN')}.`,
          referenceType: 'Account',
          referenceId: acc.id,
          metricValue: new Prisma.Decimal(netPayable),
          thresholdValue: new Prisma.Decimal(100000),
        });
      }
    }

    // 6. Document Expiring Check (< 30 days)
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringDocs = await this.prisma.companyDocument.findMany({
      where: {
        companyId,
        expiryDate: { lte: thirtyDaysAhead, gte: now },
      },
    });
    for (const doc of expiringDocs) {
      createdAlerts.push({
        companyId,
        type: AlertType.DOCUMENT_EXPIRING,
        category: AlertCategory.COMPLIANCE,
        severity: AlertSeverity.WARNING,
        title: `Document Expiring Soon: ${doc.title}`,
        message: `Document "${doc.title}" expires on ${doc.expiryDate?.toLocaleDateString()}. Action required for renewal.`,
        referenceType: 'CompanyDocument',
        referenceId: doc.id,
      });
    }

    // 7. Machine Maintenance Due
    const dueMachines = await this.prisma.machine.findMany({
      where: {
        companyId,
        ...factoryFilter,
        OR: [
          { status: 'UNDER_MAINTENANCE' },
          { nextServiceDate: { lte: thirtyDaysAhead } },
        ],
      },
    });
    for (const m of dueMachines) {
      createdAlerts.push({
        companyId,
        factoryId: m.factoryId,
        type: AlertType.MACHINE_MAINTENANCE_DUE,
        category: AlertCategory.MAINTENANCE,
        severity: m.status === 'UNDER_MAINTENANCE' ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: `Maintenance Required: ${m.name}`,
        message: `Equipment ${m.name} (${m.code}) requires scheduled preventive servicing.`,
        referenceType: 'Machine',
        referenceId: m.id,
      });
    }

    // 8. Unusual Weight Check (> 60,000 KG or Tare >= Gross)
    const anomalyTickets = await this.prisma.weighbridgeTicket.findMany({
      where: {
        companyId,
        ...factoryFilter,
        grossWeight: { gt: 60000 },
      },
      take: 5,
    });
    for (const wt of anomalyTickets) {
      const gross = Number(wt.grossWeight);
      createdAlerts.push({
        companyId,
        factoryId: wt.factoryId,
        type: AlertType.UNUSUAL_WEIGHT,
        category: AlertCategory.OPERATIONS,
        severity: AlertSeverity.CRITICAL,
        title: `Weighbridge Weight Anomaly: Ticket #${wt.ticketNumber}`,
        message: `Gross weight recorded at ${gross.toLocaleString('en-IN')} KG exceeds maximum safe truck weight (60,000 KG).`,
        referenceType: 'WeighbridgeTicket',
        referenceId: wt.id,
        metricValue: wt.grossWeight,
        thresholdValue: new Prisma.Decimal(60000),
      });
    }

    // 9. Unusual Production Loss (> 3.5% dust/husk discrepancy)
    for (const b of recentBatches) {
      const inKg = Number(b.inputQuantityKg || 0);
      if (inKg <= 0) continue;
      const totalOutKg = b.outputs.reduce((s, o) => s + Number(o.quantityKg), 0);
      const lossKg = inKg - totalOutKg;
      const lossPct = (lossKg / inKg) * 100;
      if (lossPct > 3.5) {
        createdAlerts.push({
          companyId,
          factoryId: b.factoryId,
          type: AlertType.UNUSUAL_PRODUCTION_LOSS,
          category: AlertCategory.OPERATIONS,
          severity: lossPct > 5.0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `Excessive Milling Loss: Batch #${b.batchNumber}`,
          message: `Unaccounted production loss of ${lossPct.toFixed(1)}% (${lossKg.toLocaleString('en-IN')} KG) exceeds standard 3.5% tolerance.`,
          referenceType: 'ProductionBatch',
          referenceId: b.id,
          metricValue: new Prisma.Decimal(lossPct),
          thresholdValue: new Prisma.Decimal(3.5),
        });
      }
    }

    // 10. Negative Margin Check
    const lowMarginSales = await this.prisma.salesOrderLine.findMany({
      where: {
        companyId,
        ...factoryFilter,
        unitRate: { lt: 40.0 }, // selling below minimum cost threshold
      },
      include: { salesOrder: true, item: true },
      take: 5,
    });
    for (const sol of lowMarginSales) {
      const rate = Number(sol.unitRate);
      createdAlerts.push({
        companyId,
        factoryId: sol.factoryId,
        type: AlertType.NEGATIVE_MARGIN,
        category: AlertCategory.FINANCE,
        severity: AlertSeverity.CRITICAL,
        title: `Negative Margin Alert: Order #${sol.salesOrder?.orderNumber || ''}`,
        message: `Item ${sol.item?.name || ''} booked at ৳ ${rate}/KG, below estimated production break-even cost (৳ 40.00/KG).`,
        referenceType: 'SalesOrder',
        referenceId: sol.salesOrderId,
        metricValue: sol.unitRate,
        thresholdValue: new Prisma.Decimal(40.0),
      });
    }

    // 11. Slow Moving Stock (> 60 days idle)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const oldMovements = await this.prisma.stockMovement.findMany({
      where: {
        companyId,
        ...factoryFilter,
        occurredAt: { lte: sixtyDaysAgo },
        quantity: { gt: 0 },
      },
      take: 5,
    });
    for (const sm of oldMovements) {
      createdAlerts.push({
        companyId,
        factoryId: sm.factoryId,
        type: AlertType.SLOW_MOVING_STOCK,
        category: AlertCategory.INVENTORY,
        severity: AlertSeverity.WARNING,
        title: `Slow-Moving Inventory Detected`,
        message: `Stock lot ${sm.itemId} has remained unconsumed in godown for more than 60 days. Risk of grain moisture reabsorption.`,
        referenceType: 'StockMovement',
        referenceId: sm.id,
      });
    }

    // Save detected alerts (create if not already active for same reference)
    let newCreatedCount = 0;
    for (const alertData of createdAlerts) {
      const existing = await this.prisma.smartAlert.findFirst({
        where: {
          companyId: alertData.companyId,
          type: alertData.type,
          referenceId: alertData.referenceId,
          isDismissed: false,
        },
      });
      if (!existing) {
        await this.prisma.smartAlert.create({ data: alertData });
        newCreatedCount++;
      }
    }

    return {
      message: `Diagnostic scan completed. Checked 11 rule categories across mill operations.`,
      detectedIssues: createdAlerts.length,
      newAlertsCreated: newCreatedCount,
    };
  }
}
