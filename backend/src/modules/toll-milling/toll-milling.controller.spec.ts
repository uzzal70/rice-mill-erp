import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { TollMillingController } from './toll-milling.controller';
import { TollMillingService } from './toll-milling.service';

describe('TollMillingController', () => {
  it('enforces RBAC permission metadata across toll-milling routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.listOrders)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.getOrder)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.getCustomerCustody)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.createOrder)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.approveOrder)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.createBatch)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.createDelivery)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.POST }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, TollMillingController.prototype.cancelOrder)).toEqual(
      expect.objectContaining({ resource: 'toll-milling', action: PermissionAction.UPDATE }),
    );
  });

  it('delegates createOrder to service with authenticated user ID', async () => {
    const service: any = {
      createOrder: jest.fn().mockResolvedValue({ id: 'toll-1' }),
    };
    const controller = new TollMillingController(service as TollMillingService);
    const dto: any = { companyId: 'comp-1', factoryId: 'fact-1', orderNumber: 'TOLL-1' };
    const req: any = { user: { id: 'user-1' } };

    const res = await controller.createOrder(dto, req);
    expect(res).toEqual({ id: 'toll-1' });
    expect(service.createOrder).toHaveBeenCalledWith(dto, 'user-1');
  });
});

