import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { DispatchController } from './dispatch.controller';

describe('DispatchController', () => {
  it('enforces RBAC permission metadata across dispatch routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.list)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.get)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.create)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.approve)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.post)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.POST }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, DispatchController.prototype.cancel)).toEqual(
      expect.objectContaining({ resource: 'dispatch', action: PermissionAction.UPDATE }),
    );
  });
});

