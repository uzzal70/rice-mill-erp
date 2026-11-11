import { Test, TestingModule } from '@nestjs/testing';
import { PartnerType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockPrisma: any = {
    partner: { findMany: jest.fn().mockResolvedValue([]) },
    vehicle: { findMany: jest.fn().mockResolvedValue([]) },
    purchaseInvoice: { findMany: jest.fn().mockResolvedValue([]) },
    purchaseOrder: { findMany: jest.fn().mockResolvedValue([]) },
    salesOrder: { findMany: jest.fn().mockResolvedValue([]) },
    productionBatch: { findMany: jest.fn().mockResolvedValue([]) },
    item: { findMany: jest.fn().mockResolvedValue([]) },
    gateEntry: { findMany: jest.fn().mockResolvedValue([]) },
    weighbridgeTicket: { findMany: jest.fn().mockResolvedValue([]) },
    expense: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty result for blank query', async () => {
    const res = await service.globalSearch({ companyId: 'c1', query: '' });
    expect(res.totalMatches).toBe(0);
    expect(res.results).toEqual([]);
  });

  it('should search across all 12 entities: Supplier, Farmer, Customer, Vehicle, Invoice, Purchase, Sales, Batch, Stock, Gate Pass, Weighbridge Ticket, Payment', async () => {
    mockPrisma.partner.findMany
      .mockResolvedValueOnce([{ id: 'sup-1', name: 'Mokbul Traders', code: 'SUP-01', type: PartnerType.SUPPLIER, active: true }])
      .mockResolvedValueOnce([{ id: 'far-1', name: 'Rahim Farmer', code: 'FAR-01', type: PartnerType.FARMER, active: true }])
      .mockResolvedValueOnce([{ id: 'cus-1', name: 'Al Madina', code: 'CUS-01', type: PartnerType.CUSTOMER, active: true }]);

    mockPrisma.vehicle.findMany.mockResolvedValueOnce([
      { id: 'v-1', vehicleNumber: 'Dhaka Metro-Ta 11', vehicleType: 'Truck', driverName: 'Karim', active: true },
    ]);

    mockPrisma.purchaseInvoice.findMany.mockResolvedValueOnce([
      { id: 'inv-1', invoiceNumber: 'PINV-001', netSupplierPayable: 100000, physicalQuantityKg: 2500, status: 'POSTED' },
    ]);

    mockPrisma.purchaseOrder.findMany.mockResolvedValueOnce([
      { id: 'po-1', orderNumber: 'PO-2026', status: 'CONFIRMED' },
    ]);

    mockPrisma.salesOrder.findMany.mockResolvedValueOnce([
      { id: 'so-1', orderNumber: 'SO-101', status: 'DISPATCHED', totalAmount: 500000 },
    ]);

    mockPrisma.productionBatch.findMany.mockResolvedValueOnce([
      { id: 'b-1', batchNumber: 'BATCH-01', inputQuantityKg: 40000, totalOutputKg: 26000, totalRiceRecoveryPct: 65, status: 'COMPLETED' },
    ]);

    mockPrisma.item.findMany.mockResolvedValueOnce([
      { id: 'it-1', name: 'BR-28 Paddy', code: 'PAD-BR28', kind: 'PADDY', baseUnit: 'KG' },
    ]);

    mockPrisma.gateEntry.findMany.mockResolvedValueOnce([
      { id: 'g-1', gateNumber: 'GP-101', vehicleNumber: 'Bogura-11', driverName: 'Hasan', purpose: 'PROCUREMENT', status: 'ENTRY' },
    ]);

    mockPrisma.weighbridgeTicket.findMany.mockResolvedValueOnce([
      { id: 'wt-1', ticketNumber: 'WT-505', grossWeight: 35000, tareWeight: 10000, netWeight: 25000 },
    ]);

    mockPrisma.expense.findMany.mockResolvedValueOnce([
      { id: 'exp-1', voucherNumber: 'PV-909', title: 'Diesel Expense', category: 'FUEL', paymentMode: 'BANK', status: 'PAID' },
    ]);

    const res = await service.globalSearch({ companyId: 'c1', query: 'test' });

    expect(res.totalMatches).toBe(12);
    expect(res.categoryCounts['SUPPLIER']).toBe(1);
    expect(res.categoryCounts['FARMER']).toBe(1);
    expect(res.categoryCounts['CUSTOMER']).toBe(1);
    expect(res.categoryCounts['VEHICLE']).toBe(1);
    expect(res.categoryCounts['INVOICE']).toBe(1);
    expect(res.categoryCounts['PURCHASE']).toBe(1);
    expect(res.categoryCounts['SALES']).toBe(1);
    expect(res.categoryCounts['BATCH']).toBe(1);
    expect(res.categoryCounts['STOCK']).toBe(1);
    expect(res.categoryCounts['GATE_PASS']).toBe(1);
    expect(res.categoryCounts['WEIGHBRIDGE_TICKET']).toBe(1);
    expect(res.categoryCounts['PAYMENT']).toBe(1);
  });
});
