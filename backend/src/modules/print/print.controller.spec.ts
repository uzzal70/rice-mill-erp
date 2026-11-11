import { Test, TestingModule } from '@nestjs/testing';
import { PrintController } from './print.controller';
import { PrintDocumentType } from './print.dto';
import { PrintService } from './print.service';

describe('PrintController', () => {
  let controller: PrintController;

  const mockPrintService = {
    getTemplates: jest.fn().mockReturnValue([
      { type: PrintDocumentType.PURCHASE_INVOICE, title: 'Purchase Invoice' },
    ]),
    getDocumentData: jest.fn().mockResolvedValue({
      documentType: PrintDocumentType.PURCHASE_INVOICE,
      documentTitle: 'PURCHASE INVOICE',
      documentNumber: 'PINV-001',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrintController],
      providers: [{ provide: PrintService, useValue: mockPrintService }],
    }).compile();

    controller = module.get<PrintController>(PrintController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return templates', () => {
    const res = controller.getTemplates();
    expect(res).toBeInstanceOf(Array);
    expect(mockPrintService.getTemplates).toHaveBeenCalled();
  });

  it('should delegate getDocumentData to service', async () => {
    const res = await controller.getDocumentData(
      PrintDocumentType.PURCHASE_INVOICE,
      'sample-1',
      { companyId: 'c1' },
    );
    expect(res.documentTitle).toBe('PURCHASE INVOICE');
    expect(mockPrintService.getDocumentData).toHaveBeenCalledWith(
      'c1',
      PrintDocumentType.PURCHASE_INVOICE,
      'sample-1',
      { companyId: 'c1' },
    );
  });
});

