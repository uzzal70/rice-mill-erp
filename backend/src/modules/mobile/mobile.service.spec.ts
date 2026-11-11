import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { PrismaService } from '../../common/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('MobileService (#67 Mobile Owner View & Approvals)', () => {
  let service: MobileService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      salesOrder: { findMany: jest.fn().mockResolvedValue([]) },
      productionBatch: { findMany: jest.fn().mockResolvedValue([]) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  it('should return mobile owner summary with all 7 required core domains', async () => {
    const summary = await service.getMobileOwnerSummary({ companyId: 'comp-1' });

    // 1. Sales
    expect(summary.sales).toBeDefined();
    expect(summary.sales.todayRevenueBdt).toBeGreaterThan(0);

    // 2. Production
    expect(summary.production).toBeDefined();
    expect(summary.production.todayOutputKg).toBeGreaterThan(0);
    expect(summary.production.recoveryPercent).toBeGreaterThan(0);

    // 3. Profit
    expect(summary.profit).toBeDefined();
    expect(summary.profit.estimatedGrossProfitBdt).toBeGreaterThan(0);

    // 4. Stock
    expect(summary.stock).toBeDefined();
    expect(summary.stock.paddyKg).toBeGreaterThan(0);
    expect(summary.stock.riceKg).toBeGreaterThan(0);

    // 5. Cash
    expect(summary.cash).toBeDefined();
    expect(summary.cash.cashInHandBdt).toBeGreaterThan(0);

    // 6. Bank
    expect(summary.bank).toBeDefined();
    expect(summary.bank.totalBankBalanceBdt).toBeGreaterThan(0);

    // 7. Due
    expect(summary.due).toBeDefined();
    expect(summary.due.customerReceivableBdt).toBeGreaterThan(0);
    expect(summary.due.supplierPayableBdt).toBeGreaterThan(0);

    // Manager Pending Approvals
    expect(summary.pendingApprovals.length).toBeGreaterThan(0);
  });

  it('should allow managers to 1-tap approve or reject transactions from mobile', async () => {
    const approveRes = await service.quickApprove(
      {
        companyId: 'comp-1',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-01',
        action: 'APPROVE',
      },
      'mgr-1',
    );
    expect(approveRes.success).toBe(true);
    expect(approveRes.action).toBe('APPROVE');

    const rejectRes = await service.quickApprove(
      {
        companyId: 'comp-1',
        entityType: 'EXPENSE',
        entityId: 'exp-02',
        action: 'REJECT',
        note: 'Requires revised quote',
      },
      'mgr-1',
    );
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.action).toBe('REJECT');
  });

  it('should reject invalid mobile quick approval actions', async () => {
    await expect(
      service.quickApprove(
        {
          companyId: 'comp-1',
          entityType: 'EXPENSE',
          entityId: 'exp-02',
          action: 'INVALID' as any,
        },
        'mgr-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

