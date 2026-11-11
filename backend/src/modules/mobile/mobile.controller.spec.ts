import { Test, TestingModule } from '@nestjs/testing';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { AuthenticatedRequest } from '../../common/authz';

describe('MobileController (#67 Mobile)', () => {
  let controller: MobileController;
  let service: MobileService;

  const mockReq = {
    user: {
      id: 'mgr-1',
      sessionId: 'sess-1',
      companyIds: ['comp-1'],
      memberships: [{ companyId: 'comp-1', factoryId: 'fact-1' }],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const mockMobileService = {
      getMobileOwnerSummary: jest.fn().mockResolvedValue({
        companyId: 'comp-1',
        sales: { todayRevenueBdt: 500000 },
        production: { todayOutputKg: 10000 },
        profit: { estimatedGrossProfitBdt: 80000 },
        stock: { paddyKg: 100000 },
        cash: { cashInHandBdt: 200000 },
        bank: { totalBankBalanceBdt: 2000000 },
        due: { customerReceivableBdt: 500000, supplierPayableBdt: 300000 },
        pendingApprovals: [],
      }),
      quickApprove: jest.fn().mockResolvedValue({
        success: true,
        message: 'Approved successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [
        { provide: MobileService, useValue: mockMobileService },
      ],
    }).compile();

    controller = module.get<MobileController>(MobileController);
    service = module.get<MobileService>(MobileService);
  });

  it('should fetch mobile owner summary', async () => {
    const res = await controller.getMobileOwnerSummary({ companyId: 'comp-1' }, mockReq);
    expect(res.sales.todayRevenueBdt).toBe(500000);
    expect(service.getMobileOwnerSummary).toHaveBeenCalled();
  });

  it('should process quick approval request from mobile', async () => {
    const dto = {
      companyId: 'comp-1',
      entityType: 'EXPENSE' as const,
      entityId: 'exp-1',
      action: 'APPROVE' as const,
    };
    const res = await controller.quickApprove(dto, mockReq);
    expect(res.success).toBe(true);
    expect(service.quickApprove).toHaveBeenCalledWith(dto, 'mgr-1');
  });
});

