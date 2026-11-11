import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from './import.controller';
import { ImportEntityType } from './import.dto';
import { ImportService } from './import.service';

describe('ImportController', () => {
  let controller: ImportController;

  const mockService = {
    getTemplates: jest.fn().mockReturnValue([
      { entityType: ImportEntityType.SUPPLIERS, title: 'Suppliers' },
    ]),
    getTemplateCsv: jest.fn().mockReturnValue('code,name\n'),
    validateRows: jest.fn().mockResolvedValue({
      totalRecords: 1,
      validCount: 1,
      invalidCount: 0,
      records: [],
    }),
    commitRecords: jest.fn().mockResolvedValue({
      success: true,
      importedCount: 1,
      message: 'Done',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [{ provide: ImportService, useValue: mockService }],
    }).compile();

    controller = module.get<ImportController>(ImportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return templates', () => {
    const res = controller.getTemplates();
    expect(res).toBeInstanceOf(Array);
    expect(mockService.getTemplates).toHaveBeenCalled();
  });

  it('should delegate validateRows to service', async () => {
    const res = await controller.validateRows({
      companyId: 'c1',
      entityType: ImportEntityType.SUPPLIERS,
      rows: [{ code: 'S1', name: 'Sup 1' }],
    });
    expect(res.validCount).toBe(1);
    expect(mockService.validateRows).toHaveBeenCalled();
  });
});

