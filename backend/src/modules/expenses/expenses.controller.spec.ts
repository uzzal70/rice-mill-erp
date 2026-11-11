import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

describe('ExpensesController', () => {
  it('enforces RBAC permission metadata across expenses routes', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.list)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.getSummary)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.get)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.create)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.update)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.UPDATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.submit)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.approve)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.reject)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.APPROVE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.post)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.POST }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.cancel)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.UPDATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, ExpensesController.prototype.delete)).toEqual(
      expect.objectContaining({ resource: 'expenses', action: PermissionAction.DELETE }),
    );
  });

  it('delegates create to service with authenticated user ID', async () => {
    const service: any = {
      create: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    };
    const controller = new ExpensesController(service as ExpensesService);
    const dto: any = { companyId: 'comp-1', factoryId: 'fact-1', title: 'Office Tea & Snacks' };
    const req: any = { user: { id: 'user-1' } };

    const res = await controller.create(dto, req);
    expect(res).toEqual({ id: 'exp-1' });
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });
});

