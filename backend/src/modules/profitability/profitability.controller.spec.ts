import { Test, TestingModule } from '@nestjs/testing';
import { AccessGuard } from '../../common/access.guard';
import { ProfitabilityController } from './profitability.controller';
import { ProfitabilityDimension } from './profitability.dto';
import { ProfitabilityService } from './profitability.service';

describe('ProfitabilityController', () => {
  let controller: ProfitabilityController;
  let service: any;

  beforeEach(async () => {
    service = {
      calculateAndSaveBatchProfitability: jest.fn().mockResolvedValue({ id: 'bp-1' }),
      getBatchProfitability: jest.fn().mockResolvedValue({ id: 'bp-1' }),
      listBatchProfitability: jest.fn().mockResolvedValue([{ id: 'bp-1' }]),
      getMultiDimensionalSummary: jest.fn().mockResolvedValue({ dimension: 'BATCH', records: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfitabilityController],
      providers: [{ provide: ProfitabilityService, useValue: service }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfitabilityController>(ProfitabilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates calculateBatchProfitability to service', async () => {
    const dto = {
      companyId: 'comp-1',
      factoryId: 'fact-1',
      batchId: 'batch-1',
      labourCost: 1000,
    };
    const req: any = { user: { id: 'user-1' } };

    const res = await controller.calculateBatchProfitability(dto, req);
    expect(service.calculateAndSaveBatchProfitability).toHaveBeenCalledWith(dto, 'user-1');
    expect(res).toEqual({ id: 'bp-1' });
  });

  it('delegates getMultiDimensionalSummary to service', async () => {
    const q = { companyId: 'comp-1', dimension: ProfitabilityDimension.BATCH };
    const res = await controller.getMultiDimensionalSummary(q);
    expect(service.getMultiDimensionalSummary).toHaveBeenCalledWith(q);
    expect(res.dimension).toBe('BATCH');
  });
});

