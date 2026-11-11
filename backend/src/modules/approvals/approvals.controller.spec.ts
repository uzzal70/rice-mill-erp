import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalActionType } from './approvals.dto';

describe('ApprovalsController', () => {
  let controller: ApprovalsController;
  let service: any;

  beforeEach(() => {
    service = {
      createOrGetRequest: jest.fn(),
      listRequests: jest.fn(),
      getApprovalInbox: jest.fn(),
      getRequest: jest.fn(),
      transition: jest.fn(),
    };

    controller = new ApprovalsController(service as ApprovalsService);
  });

  it('delegates transition to service', async () => {
    const dto = {
      action: ApprovalActionType.SUBMIT,
      comments: 'Submitting PO',
    };
    const req: any = { user: { id: 'usr-1' } };
    await controller.transition('comp-1', 'req-1', dto, req);
    expect(service.transition).toHaveBeenCalledWith('comp-1', 'req-1', dto, 'usr-1');
  });

  it('delegates getApprovalInbox to service', async () => {
    await controller.getApprovalInbox('comp-1');
    expect(service.getApprovalInbox).toHaveBeenCalledWith('comp-1');
  });
});

