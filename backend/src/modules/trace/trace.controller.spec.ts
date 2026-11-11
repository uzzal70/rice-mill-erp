import { Test, TestingModule } from '@nestjs/testing';
import { TraceController } from './trace.controller';
import { TraceService } from './trace.service';
import { AuthenticatedRequest } from '../../common/authz';

describe('TraceController (#79)', () => {
  let controller: TraceController;
  let service: TraceService;

  const mockReq = {
    user: {
      id: 'owner-1',
      sessionId: 'sess-1',
      companyIds: ['comp-1'],
      memberships: [{ companyId: 'comp-1', factoryId: 'fact-1' }],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const mockTraceService = {
      traceTransaction: jest.fn().mockResolvedValue({
        query: 'GT-001',
        found: true,
        rootStage: 'GATE_ENTRY',
        nodes: [],
        links: [],
        summary: { overallIntegrity: 'VERIFIED' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TraceController],
      providers: [
        { provide: TraceService, useValue: mockTraceService },
      ],
    }).compile();

    controller = module.get<TraceController>(TraceController);
    service = module.get<TraceService>(TraceService);
  });

  it('should call traceService.traceTransaction with companyId from request', async () => {
    const result = await controller.getTransactionTrace({ query: 'GT-001' }, mockReq);
    expect(result).toBeDefined();
    expect(result.found).toBe(true);
    expect(service.traceTransaction).toHaveBeenCalledWith('comp-1', { query: 'GT-001' });
  });
});

