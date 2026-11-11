import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;

  const mockService = {
    globalSearch: jest.fn().mockResolvedValue({
      query: 'test',
      totalMatches: 2,
      results: [
        { id: '1', title: 'Result 1', category: 'SUPPLIER' },
        { id: '2', title: 'Result 2', category: 'CUSTOMER' },
      ],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate search query to service', async () => {
    const res = await controller.globalSearch({ companyId: 'c1', query: 'test' });
    expect(res.totalMatches).toBe(2);
    expect(mockService.globalSearch).toHaveBeenCalledWith({ companyId: 'c1', query: 'test' });
  });
});

