import { Test, TestingModule } from '@nestjs/testing';
import { TraceService } from './trace.service';
import { PrismaService } from '../../common/prisma.service';

describe('TraceService (#79 Owner Auditability - Transaction Trace)', () => {
  let service: TraceService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      gateEntry: { findFirst: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      goodsReceipt: { findFirst: jest.fn() },
      productionBatch: { findFirst: jest.fn() },
      salesOrder: { findFirst: jest.fn() },
      journal: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TraceService>(TraceService);
  });

  it('should return empty trace graph when query is empty', async () => {
    const result = await service.traceTransaction('comp-1', { query: '' });
    expect(result.found).toBe(false);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('should trace complete upstream and downstream lineage starting from Gate Entry', async () => {
    const mockGateEntry = {
      id: 'gate-1',
      gateNumber: 'GT-2026-001',
      vehicleNumber: 'BOGURA-METRO-T-11-0101',
      driverName: 'Driver Rahim',
      direction: 'INWARD',
      purpose: 'PROCUREMENT',
      status: 'COMPLETED',
      enteredAt: new Date('2026-02-01T08:00:00Z'),
      partner: {
        id: 'supp-1',
        name: 'Bogura Agro Traders',
        code: 'SUP-001',
        type: 'SUPPLIER',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      weighbridgeTicket: {
        id: 'ticket-1',
        ticketNumber: 'WB-001',
        grossWeight: 15400,
        tareWeight: 5400,
        netWeight: 10000,
      },
      qualitySamples: [
        {
          id: 'sample-1',
          sampleNumber: 'QS-001',
          status: 'APPROVED',
          decision: 'ACCEPT',
          sampledAt: new Date('2026-02-01T08:30:00Z'),
          measurements: { moisturePct: 14.5 },
        },
      ],
      purchaseOrder: {
        id: 'po-1',
        orderNumber: 'PO-2026-001',
        status: 'APPROVED',
        orderedQuantity: 10000,
        payableQuantityKg: 9950,
        unitRate: 35.0,
        createdAt: new Date('2026-02-01T09:00:00Z'),
        supplier: {
          id: 'supp-1',
          name: 'Bogura Agro Traders',
          code: 'SUP-001',
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        goodsReceipts: [
          {
            id: 'grn-1',
            receiptNumber: 'GRN-2026-001',
            status: 'POSTED',
            quantity: 10000,
            receivedAt: new Date('2026-02-01T10:00:00Z'),
          },
        ],
      },
    };

    mockPrisma.gateEntry.findFirst.mockResolvedValue(mockGateEntry);
    mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
    mockPrisma.goodsReceipt.findFirst.mockResolvedValue(null);
    mockPrisma.productionBatch.findFirst.mockResolvedValue(null);
    mockPrisma.salesOrder.findFirst.mockResolvedValue(null);
    mockPrisma.journal.findFirst.mockResolvedValue(null);

    const result = await service.traceTransaction('comp-1', { query: 'GT-2026-001' });

    expect(result.found).toBe(true);
    expect(result.rootStage).toBe('GATE_ENTRY');
    expect(result.nodes.length).toBeGreaterThanOrEqual(5);

    const stages = result.nodes.map(n => n.stage);
    expect(stages).toContain('SUPPLIER');
    expect(stages).toContain('GATE_ENTRY');
    expect(stages).toContain('WEIGHBRIDGE');
    expect(stages).toContain('QUALITY');
    expect(stages).toContain('PURCHASE');
    expect(stages).toContain('GRN');

    expect(result.summary.totalPhysicalKg).toBe(10000);
    expect(result.summary.overallIntegrity).toBe('VERIFIED');
  });

  it('should trace production batch and output lineage', async () => {
    const mockBatch = {
      id: 'batch-1',
      batchNumber: 'BAT-2026-001',
      status: 'POSTED',
      startedAt: new Date('2026-02-01T08:00:00Z'),
      completedAt: new Date('2026-02-01T16:00:00Z'),
      inputQuantityKg: 4000,
      totalOutputKg: 3900,
      headRiceRecoveryPct: 65.0,
      processLossKg: 100,
      inputItem: { name: 'BRRI Dhan 28', code: 'BR-28' },
      outputs: [
        {
          id: 'out-1',
          quantityKg: 2600,
          item: { name: 'Miniket Rice', code: 'MINIKIT-RICE' },
          stack: { code: 'PAD-01', godown: { name: 'Godown A' } },
        },
        {
          id: 'out-2',
          quantityKg: 500,
          item: { name: 'Rice Bran', code: 'BRAN' },
          stack: { code: 'PAD-01', godown: { name: 'Godown A' } },
        },
      ],
    };

    mockPrisma.gateEntry.findFirst.mockResolvedValue(null);
    mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
    mockPrisma.goodsReceipt.findFirst.mockResolvedValue(null);
    mockPrisma.productionBatch.findFirst.mockResolvedValue(mockBatch);
    mockPrisma.salesOrder.findFirst.mockResolvedValue(null);
    mockPrisma.journal.findFirst.mockResolvedValue(null);

    const result = await service.traceTransaction('comp-1', { query: 'BAT-2026-001' });

    expect(result.found).toBe(true);
    expect(result.rootStage).toBe('PRODUCTION');
    const stages = result.nodes.map(n => n.stage);
    expect(stages).toContain('PRODUCTION');
    expect(stages).toContain('FINISHED_GOODS');
    expect(result.summary.recoveryPct).toBe(65.0);
  });
});
