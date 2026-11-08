import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { SalesController } from './sales.controller';

describe('SalesController', () => {
  it('enforces RBAC permission metadata across quotation routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.listQuotations)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.createQuotation)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.approveQuotation)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.rejectQuotation)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.APPROVE }),
    );
  });

  it('enforces RBAC permission metadata across sales order routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.listOrders)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.createOrder)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.approveOrder)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, SalesController.prototype.cancelOrder)).toEqual(
      expect.objectContaining({ resource: 'sales', action: PermissionAction.UPDATE }),
    );
  });
});
