import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

describe('AccountingController', () => {
  it('enforces RBAC permission metadata across accounting routes', () => {
    // Chart of Accounts
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.listAccounts)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.createAccount)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.updateAccount)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.UPDATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.seedStandardCOA)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.CREATE }),
    );

    // Journals
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.listJournals)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getJournal)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.READ }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.createJournal)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.CREATE }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.postJournal)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.POST }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.reverseJournal)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.POST }),
    );

    // Financial Reports
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getGeneralLedger)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getCashBook)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getBankBook)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getTrialBalance)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getProfitAndLoss)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getBalanceSheet)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, AccountingController.prototype.getSubLedger)).toEqual(
      expect.objectContaining({ resource: 'accounting', action: PermissionAction.VIEW_FINANCIAL }),
    );
  });

  it('delegates createJournal to service with authenticated user ID', async () => {
    const service: any = {
      createJournal: jest.fn().mockResolvedValue({ id: 'jv-1' }),
    };
    const controller = new AccountingController(service as AccountingService);
    const dto: any = { companyId: 'comp-1', lines: [] };
    const req: any = { user: { id: 'user-1' } };

    const res = await controller.createJournal(dto, req);
    expect(res).toEqual({ id: 'jv-1' });
    expect(service.createJournal).toHaveBeenCalledWith(dto, 'user-1');
  });
});

