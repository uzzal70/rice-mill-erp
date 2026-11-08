import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { MoisturePolicyController } from './moisture-policy.controller';

describe('MoisturePolicyController', () => {
  it('requires financial-view access for policy reads', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, MoisturePolicyController.prototype.list)).toEqual([
      { resource: 'moisture-policies', action: PermissionAction.READ },
      { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
    ]);
  });

  it('requires both write and financial-view permissions to configure policies', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, MoisturePolicyController.prototype.create)).toEqual([
      { resource: 'moisture-policies', action: PermissionAction.CREATE },
      { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, MoisturePolicyController.prototype.update)).toEqual([
      { resource: 'moisture-policies', action: PermissionAction.UPDATE },
      { resource: 'moisture-policies', action: PermissionAction.VIEW_FINANCIAL },
    ]);
  });
});
