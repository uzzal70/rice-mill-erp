import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityService } from './integrity.service';
import { PrismaService } from '../../common/prisma.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('IntegrityService (#62)', () => {
  let service: IntegrityService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      stockMovement: {
        findMany: jest.fn(),
      },
      purchaseInvoice: {
        findFirst: jest.fn(),
      },
      weighbridgeTicket: {
        findFirst: jest.fn(),
      },
      gateEntry: {
        findFirst: jest.fn(),
      },
      journal: {
        findMany: jest.fn(),
      },
      qualitySample: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IntegrityService>(IntegrityService);
  });

  it('should prevent negative stock when deduction exceeds available balance', async () => {
    mockPrisma.stockMovement.findMany.mockResolvedValue([
      { type: 'RECEIPT', quantity: '1000' },
      { type: 'ISSUE', quantity: '800' },
    ]);

    await expect(
      service.assertNonNegativeStock('comp-1', 'fact-1', 'item-1', 250),
    ).rejects.toThrow(BadRequestException);

    // Within available stock should pass
    await expect(
      service.assertNonNegativeStock('comp-1', 'fact-1', 'item-1', 150),
    ).resolves.not.toThrow();
  });

  it('should prevent duplicate invoice number within company tenant', async () => {
    mockPrisma.purchaseInvoice.findFirst.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-2026-001' });

    await expect(
      service.assertNoDuplicateInvoice('comp-1', 'INV-2026-001'),
    ).rejects.toThrow(ConflictException);

    mockPrisma.purchaseInvoice.findFirst.mockResolvedValue(null);
    await expect(
      service.assertNoDuplicateInvoice('comp-1', 'INV-2026-002'),
    ).resolves.not.toThrow();
  });

  it('should prevent duplicate weighbridge ticket number', async () => {
    mockPrisma.weighbridgeTicket.findFirst.mockResolvedValue({ id: 'wb-1', ticketNumber: 'WB-001' });

    await expect(
      service.assertNoDuplicateWeighbridgeTicket('comp-1', 'WB-001'),
    ).rejects.toThrow(ConflictException);

    mockPrisma.weighbridgeTicket.findFirst.mockResolvedValue(null);
    await expect(
      service.assertNoDuplicateWeighbridgeTicket('comp-1', 'WB-002'),
    ).resolves.not.toThrow();
  });

  it('should prevent duplicate gate entry and multiple inside passes for same vehicle', async () => {
    mockPrisma.gateEntry.findFirst.mockResolvedValueOnce({ id: 'gate-1' });

    await expect(
      service.assertNoDuplicateGateEntry('comp-1', 'GP-001'),
    ).rejects.toThrow(ConflictException);

    // Vehicle active inside
    mockPrisma.gateEntry.findFirst
      .mockResolvedValueOnce(null) // gateNumber unique
      .mockResolvedValueOnce({ id: 'gate-2', gateNumber: 'GP-OLD' }); // vehicle inside

    await expect(
      service.assertNoDuplicateGateEntry('comp-1', 'GP-002', 'DHK-METRO-1234'),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent unbalanced journal entries where Debit sum != Credit sum', () => {
    expect(() =>
      service.assertBalancedJournal([
        { debit: 1000, credit: 0 },
        { debit: 0, credit: 950 },
      ]),
    ).toThrow(BadRequestException);

    const balanced = service.assertBalancedJournal([
      { debit: 1000, credit: 0 },
      { debit: 0, credit: 1000 },
    ]);
    expect(balanced.totalDebit).toBe(1000);
    expect(balanced.totalCredit).toBe(1000);
  });

  it('should prevent unauthorized price changes without managerial role', () => {
    expect(() =>
      service.assertPriceChangeAuthorized(['OPERATOR', 'CLERK'], 50, 55),
    ).toThrow(ForbiddenException);

    expect(() =>
      service.assertPriceChangeAuthorized(['ADMIN'], 50, 55),
    ).not.toThrow();
  });

  it('should prevent unauthorized edits on posted financial transactions', () => {
    expect(() =>
      service.assertFinancialEditAuthorized('POSTED', ['ADMIN']),
    ).toThrow(ForbiddenException);

    expect(() =>
      service.assertFinancialEditAuthorized('DRAFT', ['USER']),
    ).not.toThrow();
  });

  it('should prevent invalid quantity (zero or negative)', () => {
    expect(() => service.validatePositiveQuantity(0)).toThrow(BadRequestException);
    expect(() => service.validatePositiveQuantity(-5)).toThrow(BadRequestException);
    expect(() => service.validatePositiveQuantity(100)).not.toThrow();
  });

  it('should prevent invalid weight where gross <= tare or tare <= 0 or gross <= 0', () => {
    expect(() => service.validateRealisticWeight(5000, 5000)).toThrow(BadRequestException);
    expect(() => service.validateRealisticWeight(4000, 5000)).toThrow(BadRequestException);
    expect(() => service.validateRealisticWeight(-100, 200)).toThrow(BadRequestException);

    const valid = service.validateRealisticWeight(12000, 4000);
    expect(valid.netWeightKg).toBe(8000);
  });

  it('should prevent invalid moisture outside 8.0% - 35.0% range', () => {
    expect(() => service.validateMoisturePercentage(5.0)).toThrow(BadRequestException);
    expect(() => service.validateMoisturePercentage(40.0)).toThrow(BadRequestException);
    expect(() => service.validateMoisturePercentage(14.5)).not.toThrow();
  });

  it('should prevent unauthorized deletion of posted records', () => {
    expect(() =>
      service.assertDeleteAuthorized('PurchaseInvoice', true, ['ADMIN']),
    ).toThrow(ForbiddenException);

    expect(() =>
      service.assertDeleteAuthorized('PurchaseInvoice', false, ['OPERATOR']),
    ).toThrow(ForbiddenException);

    expect(() =>
      service.assertDeleteAuthorized('PurchaseInvoice', false, ['ADMIN']),
    ).not.toThrow();
  });

  it('should execute comprehensive verifyTransaction payload and return healthy verdict', async () => {
    mockPrisma.purchaseInvoice.findFirst.mockResolvedValue(null);
    mockPrisma.weighbridgeTicket.findFirst.mockResolvedValue(null);
    mockPrisma.gateEntry.findFirst.mockResolvedValue(null);
    mockPrisma.stockMovement.findMany.mockResolvedValue([{ movementType: 'IN', quantityKg: '5000' }]);

    const res = await service.verifyTransaction(
      'comp-1',
      {
        quantity: 100,
        grossWeightKg: 15000,
        tareWeightKg: 5000,
        moisturePercent: 14.0,
        invoiceNumber: 'INV-001',
        ticketNumber: 'WB-001',
        gateNumber: 'GP-001',
        journalLines: [
          { debit: 5000, credit: 0 },
          { debit: 0, credit: 5000 },
        ],
      },
      ['ADMIN'],
    );

    expect(res.valid).toBe(true);
    expect(res.netWeightKg).toBe(10000);
    expect(res.balancedTotals.totalDebit).toBe(5000);
  });

  it('should run diagnostic audit and report violations correctly', async () => {
    mockPrisma.stockMovement.findMany.mockResolvedValue([
      { itemId: 'item-bad', factoryId: 'f-1', type: 'ISSUE', quantity: '200' },
    ]);
    mockPrisma.journal.findMany.mockResolvedValue([
      {
        id: 'j-1',
        number: 'JN-001',
        lines: [
          { debit: '100', credit: '0' },
          { debit: '0', credit: '80' },
        ],
      },
    ]);
    mockPrisma.qualitySample.findMany.mockResolvedValue([
      { id: 's-1', sampleNumber: 'QS-001', measurements: { moisture: 45.0 } },
    ]);

    const audit = await service.runIntegrityAudit('comp-1');
    expect(audit.status).toBe('VIOLATION_DETECTED');
    expect(audit.totalViolations).toBe(3);
    expect(audit.violations.some(v => v.rule.includes('Negative Stock'))).toBe(true);
    expect(audit.violations.some(v => v.rule.includes('Unbalanced Journal'))).toBe(true);
    expect(audit.violations.some(v => v.rule.includes('Invalid Moisture'))).toBe(true);
  });
});
