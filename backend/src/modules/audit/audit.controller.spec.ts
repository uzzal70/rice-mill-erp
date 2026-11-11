import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  let service: any;

  beforeEach(() => {
    service = {
      listEvents: jest.fn(),
      getAuditSummary: jest.fn(),
      getEvent: jest.fn(),
      recordEvent: jest.fn(),
    };

    controller = new AuditController(service as AuditService);
  });

  it('delegates listEvents to service', async () => {
    const query = { resource: 'PURCHASE', page: 1, pageSize: 20 };
    await controller.listEvents('comp-1', query);
    expect(service.listEvents).toHaveBeenCalledWith('comp-1', query);
  });

  it('delegates getAuditSummary to service', async () => {
    await controller.getAuditSummary('comp-1');
    expect(service.getAuditSummary).toHaveBeenCalledWith('comp-1');
  });

  it('delegates getEvent to service', async () => {
    await controller.getEvent('comp-1', 'aud-1');
    expect(service.getEvent).toHaveBeenCalledWith('comp-1', 'aud-1');
  });
});

