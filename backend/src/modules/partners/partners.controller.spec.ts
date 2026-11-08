import { PermissionAction } from '@prisma/client';
import { REQUIRED_PERMISSION } from '../../common/authz';
import { PartnersController } from './partners.controller';

describe('PartnersController', () => {
  const partners = {
    listLedger: jest.fn(),
    getFinancial: jest.fn(),
    updateFinancial: jest.fn(),
    createBroker: jest.fn(),
  };
  const controller = new PartnersController(partners as never);

  beforeEach(() => jest.clearAllMocks());

  it('protects supplier and customer ledger and financial reads with VIEW_FINANCIAL', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PartnersController.prototype.ledger)).toEqual({
      resource: 'partners',
      action: PermissionAction.VIEW_FINANCIAL,
      platformOnly: false,
    });
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PartnersController.prototype.customerLedger)).toEqual({
      resource: 'partners',
      action: PermissionAction.VIEW_FINANCIAL,
      platformOnly: false,
    });
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PartnersController.prototype.getFinancial)).toEqual({
      resource: 'partners',
      action: PermissionAction.VIEW_FINANCIAL,
      platformOnly: false,
    });
  });

  it('requires both update and financial-view permissions to edit partner financial details', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PartnersController.prototype.updateFinancial)).toEqual([
      { resource: 'partners', action: PermissionAction.UPDATE },
      { resource: 'partners', action: PermissionAction.VIEW_FINANCIAL },
    ]);
  });

  it('protects broker creation with create and financial-view permissions', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, PartnersController.prototype.createBroker)).toEqual([
      { resource: 'partners', action: PermissionAction.CREATE },
      { resource: 'partners', action: PermissionAction.VIEW_FINANCIAL },
    ]);
  });

  it('passes the requested partner and company-scoped ledger query to the service', async () => {
    const result = { purchases: { postedReceiptCount: 0 }, data: [], meta: { page: 1, pageSize: 25, total: 0, pageCount: 0 } };
    partners.listLedger.mockResolvedValue(result);
    const query = { companyId: 'company-1', page: 1, pageSize: 25 };

    await expect(controller.ledger('supplier-1', query)).resolves.toBe(result);
    expect(partners.listLedger).toHaveBeenCalledWith('supplier-1', query);
  });
});
