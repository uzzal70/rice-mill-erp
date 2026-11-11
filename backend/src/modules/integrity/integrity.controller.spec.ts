import { Test, TestingModule } from '@nestjs/testing';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';
import { AuthenticatedRequest } from '../../common/authz';

describe('IntegrityController (#62)', () => {
  let controller: IntegrityController;
  let service: IntegrityService;

  const mockReq = {
    user: {
      id: 'user-1',
      sessionId: 'sess-1',
      companyIds: ['comp-1'],
      memberships: [{ companyId: 'comp-1', factoryId: 'fact-1' }],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const mockIntegrityService = {
      runIntegrityAudit: jest.fn().mockResolvedValue({
        status: 'HEALTHY',
        totalRulesEnforced: 11,
        totalViolations: 0,
        violations: [],
        scannedAt: new Date().toISOString(),
      }),
      verifyTransaction: jest.fn().mockResolvedValue({
        valid: true,
        message: 'All 11 critical data integrity rules verified successfully.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrityController],
      providers: [
        { provide: IntegrityService, useValue: mockIntegrityService },
      ],
    }).compile();

    controller = module.get<IntegrityController>(IntegrityController);
    service = module.get<IntegrityService>(IntegrityService);
  });

  it('should list all 11 integrity rules', () => {
    const res = controller.getRules();
    expect(res.totalRules).toBe(11);
    expect(res.rules.length).toBe(11);
    expect(res.rules.some(r => r.name.includes('Negative Stock'))).toBe(true);
  });

  it('should run diagnostic integrity audit', async () => {
    const res = await controller.runAudit(mockReq, 'comp-1');
    expect(res.status).toBe('HEALTHY');
    expect(service.runIntegrityAudit).toHaveBeenCalledWith('comp-1');
  });

  it('should verify transaction payload', async () => {
    const dto = { companyId: 'comp-1', quantity: 50 };
    const res = await controller.verifyTransaction(mockReq, dto);
    expect(res.valid).toBe(true);
    expect(service.verifyTransaction).toHaveBeenCalledWith('comp-1', dto, ['ADMIN']);
  });
});
