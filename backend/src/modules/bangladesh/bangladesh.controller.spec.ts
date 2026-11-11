import { Test, TestingModule } from '@nestjs/testing';
import { TaxType } from '@prisma/client';
import { BangladeshController } from './bangladesh.controller';
import { BangladeshService } from './bangladesh.service';

describe('BangladeshController', () => {
  let controller: BangladeshController;

  const mockService = {
    getDefaults: jest.fn().mockResolvedValue({
      currency: { code: 'BDT', symbol: '৳' },
    }),
    listTaxConfigs: jest.fn().mockResolvedValue([]),
    createTaxConfig: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    calculateTaxes: jest.fn().mockResolvedValue({
      baseAmount: 100000,
      netPayableAmount: 96000,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BangladeshController],
      providers: [{ provide: BangladeshService, useValue: mockService }],
    }).compile();

    controller = module.get<BangladeshController>(BangladeshController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get Bangladesh defaults', async () => {
    const res = await controller.getDefaults('c1');
    expect(res.currency.symbol).toBe('৳');
    expect(mockService.getDefaults).toHaveBeenCalledWith('c1');
  });

  it('should delegate tax calculation to service', async () => {
    const res = await controller.calculateTaxes({
      companyId: 'c1',
      baseAmount: 100000,
      taxTypes: [TaxType.VAT, TaxType.TDS],
    });
    expect(res.netPayableAmount).toBe(96000);
    expect(mockService.calculateTaxes).toHaveBeenCalled();
  });
});

