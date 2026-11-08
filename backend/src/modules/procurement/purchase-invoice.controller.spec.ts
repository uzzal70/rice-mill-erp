import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { PurchaseInvoiceController } from './purchase-invoice.controller';

describe('PurchaseInvoiceController', () => {
  it('requires financial-view permission for invoice reads and writes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PurchaseInvoiceController.prototype.list)).toEqual([
      { resource: 'procurement', action: PermissionAction.READ },
      { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PurchaseInvoiceController.prototype.create)).toEqual([
      { resource: 'procurement', action: PermissionAction.CREATE },
      { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PurchaseInvoiceController.prototype.approve)).toEqual([
      { resource: 'procurement', action: PermissionAction.APPROVE },
      { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PurchaseInvoiceController.prototype.post)).toEqual([
      { resource: 'procurement', action: PermissionAction.POST },
      { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
    ]);
  });
});
