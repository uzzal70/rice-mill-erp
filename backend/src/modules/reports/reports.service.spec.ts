import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ExportFormat, ReportType } from './reports.dto';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    factory: { findMany: jest.fn() },
    godown: { findMany: jest.fn() },
    partner: { findMany: jest.fn() },
    item: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    gateEntry: { findMany: jest.fn() },
    productionBatch: { findMany: jest.fn() },
    salesOrder: { findMany: jest.fn() },
    stockMovement: { groupBy: jest.fn() },
    stack: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    journal: { findMany: jest.fn() },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma);
  });

  it('retrieves filter dropdown options across multi-tenant boundaries', async () => {
    (prisma.factory.findMany as jest.Mock).mockResolvedValue([{ id: 'f1', name: 'Factory 1', code: 'F1' }]);
    (prisma.godown.findMany as jest.Mock).mockResolvedValue([{ id: 'g1', name: 'Godown 1', code: 'G1' }]);
    (prisma.partner.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'Farmer Karim', type: 'SUPPLIER' },
      { id: 'p2', name: 'Customer Rahim', type: 'CUSTOMER' },
    ]);
    (prisma.item.findMany as jest.Mock).mockResolvedValue([
      { id: 'i1', name: 'Miniket Paddy', kind: 'PADDY' },
      { id: 'i2', name: 'Miniket Rice', kind: 'RICE' },
    ]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u1', fullName: 'Manager' }]);

    const res = await service.getFilterOptions('c1');
    expect(res.factories.length).toBe(1);
    expect(res.suppliers.length).toBe(1);
    expect(res.customers.length).toBe(1);
    expect(res.paddyItems.length).toBe(1);
    expect(res.riceItems.length).toBe(1);
  });

  it('generates procurement register with multi-filter query criteria', async () => {
    (prisma.purchaseOrder.findMany as jest.Mock).mockResolvedValue([
      {
        orderNumber: 'PO-101',
        orderedQuantity: new Prisma.Decimal(2500),
        unitRate: new Prisma.Decimal(42),
        supplier: { name: 'Karim Traders' },
        item: { name: 'Miniket Paddy' },
        destinationGodown: { name: 'Main Godown' },
        createdBy: { fullName: 'Uzzal' },
        createdAt: new Date('2026-11-01'),
      },
    ]);

    const res: any = await service.generateReport({
      companyId: 'c1',
      reportType: ReportType.PROCUREMENT_REGISTER,
      startDate: '2026-11-01',
      endDate: '2026-11-10',
      supplierId: 's1',
      paddyItemId: 'p1',
    });

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].documentNumber).toBe('PO-101');
    expect(res.rows[0].quantityKg).toBe(2500);
    expect(res.rows[0].totalAmount).toBe(105000);
    expect(res.summary.totalRecords).toBe(1);
    expect(res.summary.totalQuantityKg).toBe(2500);
    expect(res.summary.totalAmountBDT).toBe(105000);
  });

  it('exports sales register to RFC-compliant CSV with header and data lines', async () => {
    (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([
      {
        orderNumber: 'SO-201',
        totalAmount: new Prisma.Decimal(260000),
        status: 'POSTED',
        customer: { name: 'Bhuiyan Foods' },
        createdBy: { fullName: 'Admin' },
        createdAt: new Date('2026-11-02'),
        lines: [{ itemId: 'rice-1', quantityKg: new Prisma.Decimal(4000) }],
      },
    ]);

    const res: any = await service.generateReport({
      companyId: 'c1',
      reportType: ReportType.SALES_REGISTER,
      format: ExportFormat.CSV,
    });

    expect(res.format).toBe(ExportFormat.CSV);
    expect(res.fileName).toContain('sales_register');
    expect(res.content).toContain('Order Number');
    expect(res.content).toContain('SO-201');
    expect(res.content).toContain('Bhuiyan Foods');
  });

  it('generates stock register with godown and item breakdown', async () => {
    (prisma.stockMovement.groupBy as jest.Mock).mockResolvedValue([
      { itemId: 'item-1', stackId: 'stack-1', _sum: { quantity: new Prisma.Decimal(8500) } },
    ]);
    (prisma.item.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-1', name: 'Miniket Rice', kind: 'RICE', baseUnit: 'KG' },
    ]);
    (prisma.stack.findMany as jest.Mock).mockResolvedValue([
      { id: 'stack-1', code: 'ST-01', godown: { name: 'North Silo' } },
    ]);

    const res: any = await service.generateReport({
      companyId: 'c1',
      reportType: ReportType.STOCK_REGISTER,
    });

    expect(res.rows.length).toBe(1);
    expect(res.rows[0].itemName).toBe('Miniket Rice');
    expect(res.rows[0].quantityKg).toBe(8500);
    expect(res.summary.totalQuantityKg).toBe(8500);
  });
});

