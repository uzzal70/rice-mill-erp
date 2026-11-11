import { AiDomain } from '@prisma/client';
import { AiReadyController } from './ai-ready.controller';
import { AiReadyService } from './ai-ready.service';

describe('AiReadyController', () => {
  let controller: AiReadyController;
  let service: jest.Mocked<AiReadyService>;

  beforeEach(() => {
    service = {
      getDomainOverview: jest.fn(),
      extractFeatureDataset: jest.fn(),
      registerModel: jest.fn(),
      listModels: jest.fn(),
      predict: jest.fn(),
      recordFeedback: jest.fn(),
    } as unknown as jest.Mocked<AiReadyService>;
    controller = new AiReadyController(service);
  });

  it('delegates getDomainOverview to service', async () => {
    service.getDomainOverview.mockResolvedValue({ domains: [] } as any);
    const res = await controller.getDomainOverview('c1');
    expect(service.getDomainOverview).toHaveBeenCalledWith('c1');
    expect(res).toBeDefined();
  });

  it('delegates extractFeatureDataset to service', async () => {
    service.extractFeatureDataset.mockResolvedValue({ recordCount: 10 } as any);
    const res = await controller.extractFeatureDataset({ companyId: 'c1', domain: AiDomain.DEMAND_FORECASTING }, { id: 'u1' });
    expect(service.extractFeatureDataset).toHaveBeenCalledWith({ companyId: 'c1', domain: AiDomain.DEMAND_FORECASTING }, 'u1');
    expect(res).toBeDefined();
  });

  it('delegates predict to service', async () => {
    service.predict.mockResolvedValue({ status: 'NO_ACTIVE_MODEL' } as any);
    const res = await controller.predict({ companyId: 'c1', domain: AiDomain.DEMAND_FORECASTING, inputFeatures: {} });
    expect(service.predict).toHaveBeenCalledWith({ companyId: 'c1', domain: AiDomain.DEMAND_FORECASTING, inputFeatures: {} });
    expect(res.status).toBe('NO_ACTIVE_MODEL');
  });
});

