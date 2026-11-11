import { NotFoundException } from '@nestjs/common';
import { AlertCategory, AlertSeverity, AlertType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  const prisma = {
    smartAlert: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    alertRule: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    stockMovement: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
    },
    gateEntry: {
      findMany: jest.fn(),
    },
    qualitySample: {
      findMany: jest.fn(),
    },
    weighbridgeTicket: {
      findMany: jest.fn(),
    },
    productionBatch: {
      findMany: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    companyDocument: {
      findMany: jest.fn(),
    },
    machine: {
      findMany: jest.fn(),
    },
    salesOrderLine: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService(prisma);
  });

  it('lists active alerts with severity breakdown summary', async () => {
    (prisma.smartAlert.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', severity: AlertSeverity.CRITICAL, title: 'Low Stock' },
      { id: 'a2', severity: AlertSeverity.WARNING, title: 'High Moisture' },
    ]);
    (prisma.smartAlert.groupBy as jest.Mock).mockResolvedValue([
      { severity: AlertSeverity.CRITICAL, _count: { _all: 1 } },
      { severity: AlertSeverity.WARNING, _count: { _all: 1 } },
    ]);

    const res = await service.listAlerts({ companyId: 'c1' });
    expect(res.alerts.length).toBe(2);
    expect(res.summary.criticalCount).toBe(1);
    expect(res.summary.warningCount).toBe(1);
    expect(res.summary.totalUnresolved).toBe(2);
  });

  it('dismisses an existing alert with user audit timestamp', async () => {
    (prisma.smartAlert.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', companyId: 'c1' });
    (prisma.smartAlert.update as jest.Mock).mockResolvedValue({ id: 'a1', isDismissed: true });

    const res = await service.dismissAlert('a1', { companyId: 'c1', reason: 'Reviewed' }, 'user-1');
    expect(prisma.smartAlert.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a1' },
      data: expect.objectContaining({ isDismissed: true, dismissedById: 'user-1' }),
    }));
    expect(res.isDismissed).toBe(true);
  });

  it('throws NotFoundException when dismissing non-existent alert', async () => {
    (prisma.smartAlert.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.dismissAlert('a99', { companyId: 'c1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('acknowledges an alert timestamp', async () => {
    (prisma.smartAlert.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', companyId: 'c1' });
    (prisma.smartAlert.update as jest.Mock).mockResolvedValue({ id: 'a1', acknowledgedAt: new Date() });

    const res = await service.acknowledgeAlert('a1', 'c1', 'user-1');
    expect(prisma.smartAlert.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a1' },
      data: expect.objectContaining({ acknowledgedById: 'user-1' }),
    }));
  });

  it('upserts alert rule thresholds', async () => {
    (prisma.alertRule.upsert as jest.Mock).mockResolvedValue({
      id: 'r1',
      type: AlertType.LOW_STOCK,
      thresholdValue: new Prisma.Decimal(5000),
    });

    const res = await service.updateRule({
      companyId: 'c1',
      type: AlertType.LOW_STOCK,
      thresholdValue: 5000,
      isEnabled: true,
      severity: AlertSeverity.CRITICAL,
    });

    expect(prisma.alertRule.upsert).toHaveBeenCalled();
    expect(res.type).toBe(AlertType.LOW_STOCK);
  });

  it('runs diagnostic scan detecting operational anomalies across rule categories', async () => {
    // 1. Low stock: item with 800 KG
    (prisma.stockMovement.groupBy as jest.Mock).mockResolvedValue([
      { itemId: 'item-1', _sum: { quantity: new Prisma.Decimal(800) } },
    ]);
    (prisma.item.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-1', name: 'Miniket Paddy', code: 'P01' },
    ]);
    // 2. High moisture: sample with 16.5%
    (prisma.qualitySample.findMany as jest.Mock).mockResolvedValue([
      { id: 'qs-1', sampleNumber: 'QS-101', measurements: { moisture: 16.5 } },
    ]);
    // 8. Unusual weight: ticket with 65,000 KG
    (prisma.weighbridgeTicket.findMany as jest.Mock).mockResolvedValue([
      { id: 'wt-1', ticketNumber: 'WT-101', grossWeight: new Prisma.Decimal(65000) },
    ]);
    // 3. Low recovery: batch with 55% recovery
    (prisma.productionBatch.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'b1',
        batchNumber: 'PB-01',
        inputQuantityKg: new Prisma.Decimal(10000),
        outputs: [{ item: { kind: 'RICE' }, quantityKg: new Prisma.Decimal(5500) }],
      },
    ]);
    // 4. Overdue receivables
    (prisma.journalLine.findMany as jest.Mock).mockResolvedValue([
      { debit: new Prisma.Decimal(50000), journal: { id: 'j1', number: 'J-01' } },
    ]);
    // 5. Supplier payables
    (prisma.account.findMany as jest.Mock).mockResolvedValue([
      { id: 'acc-1', journalLines: [{ debit: 0, credit: new Prisma.Decimal(200000) }] },
    ]);
    // 6. Expiring docs
    (prisma.companyDocument.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', title: 'Factory Trade License', expiryDate: new Date() },
    ]);
    // 7. Machines due
    (prisma.machine.findMany as jest.Mock).mockResolvedValue([
      { id: 'm1', name: 'Boiler 01', code: 'BL-01', status: 'UNDER_MAINTENANCE' },
    ]);
    // 10. Negative margin
    (prisma.salesOrderLine.findMany as jest.Mock).mockResolvedValue([
      { id: 'sol-1', unitRate: new Prisma.Decimal(36.0), salesOrder: { orderNumber: 'SO-01' }, item: { name: 'Rice A' } },
    ]);
    // 11. Slow moving stock
    (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue([
      { id: 'sm-1', itemId: 'item-2', quantity: new Prisma.Decimal(1000) },
    ]);

    // findFirst for existing alerts returns null (all new)
    (prisma.smartAlert.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.smartAlert.create as jest.Mock).mockResolvedValue({ id: 'new-a1' });

    const scanResult = await service.runDiagnosticScan({ companyId: 'c1' });

    expect(scanResult.detectedIssues).toBeGreaterThan(5);
    expect(scanResult.newAlertsCreated).toBe(scanResult.detectedIssues);
    expect(prisma.smartAlert.create).toHaveBeenCalled();
  });
});
