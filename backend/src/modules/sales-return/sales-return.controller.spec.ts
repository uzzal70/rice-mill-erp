import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { SalesReturnController } from './sales-return.controller';
import { SalesReturnService } from './sales-return.service';

describe('SalesReturnController', () => {
  it('enforces RBAC permission metadata across sales return routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.list)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.get)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.create)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.approve)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.post)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.POST }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesReturnController.prototype.cancel)).toEqual(
      expect.objectContaining({ resource: 'sales-returns', action: PermissionAction.UPDATE }),
    );
  });

  it('delegates create to service with authenticated user ID', async () => {
    const service: any = {
      create: jest.fn().mockResolvedValue({ id: 'ret-1' }),
    };
    const controller = new SalesReturnController(service as SalesReturnService);
    const dto: any = { companyId: 'comp-1', factoryId: 'fact-1', reason: 'Damaged' };
    const req: any = { user: { id: 'user-1' } };

    const res = await controller.create(dto, req);
    expect(res).toEqual({ id: 'ret-1' });
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });
});
