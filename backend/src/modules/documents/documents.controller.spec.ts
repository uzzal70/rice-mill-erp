import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: any;

  beforeEach(() => {
    service = {
      createDocument: jest.fn(),
      listDocuments: jest.fn(),
      getExpiryNotifications: jest.fn(),
      getDocument: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
    };

    controller = new DocumentsController(service as DocumentsService);
  });

  it('delegates createDocument to service', async () => {
    const dto = {
      category: 'TIN',
      title: 'Company TIN Certificate',
      documentNumber: '1234567890',
    };
    const req: any = { user: { id: 'user-1' } };
    await controller.createDocument('comp-1', dto, req);
    expect(service.createDocument).toHaveBeenCalledWith('comp-1', dto, 'user-1');
  });

  it('delegates getExpiryNotifications to service', async () => {
    await controller.getExpiryNotifications('comp-1');
    expect(service.getExpiryNotifications).toHaveBeenCalledWith('comp-1');
  });

  it('delegates deleteDocument to service', async () => {
    await controller.deleteDocument('comp-1', 'doc-1');
    expect(service.deleteDocument).toHaveBeenCalledWith('comp-1', 'doc-1');
  });
});

