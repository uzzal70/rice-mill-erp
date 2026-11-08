import { BadRequestException } from '@nestjs/common';
import { ItemKind } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ItemsService } from './items.service';
import { PrismaService } from '../../common/prisma.service';
import { CreateByProductDto, CreateItemDto, CreatePackagingDto, ListItemsDto } from './items.dto';

describe('ItemsService', () => {
  const prisma: any = { item: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() }, $transaction: jest.fn() };
  const service = new ItemsService(prisma as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('requires paddy standard moisture and recovery data', async () => {
    await expect(service.create({ companyId: 'company-1', kind: ItemKind.PADDY, name: 'BRRI Dhan 28', code: 'BR28', variety: 'BRRI Dhan 28' } as any, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects rice composition targets whose combined percentage exceeds 100', async () => {
    await expect(service.create({ companyId: 'company-1', kind: ItemKind.RICE, name: 'Miniket', code: 'MINI', riceType: 'MINIKET', headRicePercentage: 80, brokenPercentage: 30 } as any, 'user-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates rice products with custom packaging labels and bounded composition', async () => {
    const record = {
      id: 'rice-1', companyId: 'company-1', kind: ItemKind.RICE, name: 'Premium Atap',
      code: 'PREM-ATAP', riceType: 'CUSTOM ATAP', brand: 'Mill Select',
      headRicePercentage: '72.00', brokenPercentage: '23.00', packagingSpec: null,
    };
    const tx = {
      item: { create: jest.fn().mockResolvedValue(record) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.create({
      companyId: 'company-1',
      kind: ItemKind.RICE,
      name: 'Premium Atap',
      code: 'prem-atap',
      riceType: ' CUSTOM ATAP ',
      brand: ' Mill Select ',
      headRicePercentage: 72,
      brokenPercentage: 23,
      defaultPackagingLabel: ' 25 KG BAG ',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'rice-1' }));
    expect(tx.item.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        riceType: 'CUSTOM ATAP',
        brand: 'Mill Select',
        defaultPackagingLabel: '25 KG BAG',
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('creates by-products with a type and protected purchase and sales reference prices', async () => {
    const record = {
      id: 'bran-1',
      companyId: 'company-1',
      kind: ItemKind.BY_PRODUCT,
      name: 'Rice Bran',
      code: 'BRAN',
      byProductType: 'BRAN',
      purchasePrice: '22.0000',
      salesPrice: '28.0000',
      packagingSpec: null,
    };
    const tx = {
      item: { create: jest.fn().mockResolvedValue(record) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.createByProduct({
      companyId: 'company-1',
      kind: ItemKind.BY_PRODUCT,
      name: 'Rice Bran',
      code: 'bran',
      byProductType: ' BRAN ',
      purchasePrice: '22.0000',
      salesPrice: '28',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'bran-1', hasReferencePrices: true }));
    expect(tx.item.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        byProductType: 'BRAN',
        purchasePrice: expect.anything(),
        salesPrice: expect.anything(),
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('requires by-products to use the protected create route so prices cannot be omitted', async () => {
    await expect(service.create({
      companyId: 'company-1',
      kind: ItemKind.BY_PRODUCT,
      name: 'Bran',
      code: 'BRAN',
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates packaging items with custom bag details, cost, supplier, and audit', async () => {
    const record = {
      id: 'bag-1',
      companyId: 'company-1',
      kind: ItemKind.PACKAGING,
      name: '25 KG Woven Sack',
      code: 'BAG-25',
      baseUnit: 'PIECE',
      packagingSpec: { bagType: 'Woven', sizeKg: '25', material: 'PP', unitCost: '8.50', supplierPartnerId: 'supplier-1' },
    };
    const tx = {
      item: { create: jest.fn().mockResolvedValue(record) },
      partner: { findFirst: jest.fn().mockResolvedValue({ id: 'supplier-1' }) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.createPackaging({
      companyId: 'company-1',
      name: ' 25 KG Woven Sack ',
      code: ' bag-25 ',
      bagType: ' Woven ',
      sizeKg: '25',
      material: ' PP ',
      unitCost: '8.50',
      supplierPartnerId: 'supplier-1',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({
      id: 'bag-1',
      code: 'BAG-25',
      packagingSpec: expect.objectContaining({ sizeKg: '25', supplierPartnerId: 'supplier-1' }),
    }));
    expect(tx.partner.findFirst).toHaveBeenCalledWith({
      where: { id: 'supplier-1', companyId: 'company-1', type: 'SUPPLIER', active: true },
      select: { id: true },
    });
    expect(tx.item.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        baseUnit: 'PIECE',
        packagingSpec: { create: expect.objectContaining({
          bagType: 'Woven',
          sizeKg: expect.anything(),
          material: 'PP',
          unitCost: expect.anything(),
          supplierPartnerId: 'supplier-1',
        }) },
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects packaging from generic item creation and rejects an invalid packaging supplier', async () => {
    await expect(service.create({
      companyId: 'company-1',
      kind: ItemKind.PACKAGING,
      name: 'Bag',
      code: 'BAG',
    } as any, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    const tx = {
      item: { create: jest.fn() },
      partner: { findFirst: jest.fn().mockResolvedValue(null) },
      auditEvent: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));
    await expect(service.createPackaging({
      companyId: 'company-1',
      name: 'Bag',
      code: 'BAG',
      sizeKg: '5',
      material: 'PP',
      unitCost: '3',
      supplierPartnerId: 'inactive-or-other-company',
    }, 'user-1')).rejects.toThrow('Packaging supplier must be an active supplier in the same company.');
    expect(tx.item.create).not.toHaveBeenCalled();
  });

  it('updates packaging metadata and status transactionally with an audit event', async () => {
    const existing = {
      id: 'bag-1',
      companyId: 'company-1',
      kind: ItemKind.PACKAGING,
      name: 'Old Bag',
      code: 'OLD',
      active: true,
      packagingSpec: { itemId: 'bag-1', bagType: null, sizeKg: '25', material: 'PP', unitCost: '8', supplierPartnerId: null },
    };
    const updatedSpec = { ...existing.packagingSpec, bagType: 'Woven', sizeKg: '10', material: 'HDPE', supplierPartnerId: 'supplier-1' };
    const updatedItem = { ...existing, name: '10 KG Bag', code: 'BAG-10', active: false, packagingSpec: updatedSpec };
    const tx = {
      item: { findFirst: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updatedItem) },
      partner: { findFirst: jest.fn().mockResolvedValue({ id: 'supplier-1' }) },
      packagingSpec: { update: jest.fn().mockResolvedValue(updatedSpec) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.updatePackaging('bag-1', {
      companyId: 'company-1',
      name: '10 KG Bag',
      code: 'bag-10',
      active: false,
      bagType: 'Woven',
      sizeKg: 10,
      material: 'HDPE',
      supplierPartnerId: 'supplier-1',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ itemId: 'bag-1', sizeKg: '10', supplierPartnerId: 'supplier-1' }));
    expect(tx.packagingSpec.update).toHaveBeenCalled();
    expect(tx.item.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bag-1' },
      data: { name: '10 KG Bag', code: 'BAG-10', active: false },
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('updates packaging cost without issuing an empty item update and exposes it only on financial reads', async () => {
    const existing = {
      id: 'bag-1',
      companyId: 'company-1',
      kind: ItemKind.PACKAGING,
      purchasePrice: null,
      salesPrice: null,
      packagingSpec: { itemId: 'bag-1', unitCost: '8.00' },
    };
    prisma.item.findFirst.mockResolvedValue(existing);
    const tx = {
      item: { update: jest.fn() },
      packagingSpec: { update: jest.fn().mockResolvedValue({ unitCost: '9.25' }) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.updateFinancial('bag-1', {
      companyId: 'company-1',
      packagingUnitCost: '9.25',
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ id: 'bag-1', hasReferencePrices: false }));
    expect(tx.item.update).not.toHaveBeenCalled();
    expect(tx.packagingSpec.update).toHaveBeenCalledWith({
      where: { itemId: 'bag-1' },
      data: { unitCost: expect.anything() },
    });
    expect(tx.auditEvent.create).toHaveBeenCalled();

    prisma.item.findFirst.mockResolvedValue({
      id: 'bag-1',
      kind: ItemKind.PACKAGING,
      purchasePrice: null,
      salesPrice: null,
      packagingSpec: { unitCost: '9.25' },
    });
    await expect(service.getFinancial('bag-1', 'company-1')).resolves.toEqual(expect.objectContaining({
      packagingSpec: { unitCost: '9.25' },
    }));
  });

  it('validates by-product reference prices and type at the API boundary', async () => {
    const invalidDto = plainToInstance(CreateByProductDto, {
      companyId: 'company-1',
      kind: 'BY_PRODUCT',
      name: 'Rice Bran',
      code: 'BRAN',
      byProductType: 'B',
      purchasePrice: '-1',
      salesPrice: 'invalid',
    });
    const errors = await validate(invalidDto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining([
      'byProductType',
      'purchasePrice',
      'salesPrice',
    ]));
  });

  it('validates positive custom packaging sizes and costs at the API boundary', async () => {
    const dto = plainToInstance(CreatePackagingDto, {
      companyId: 'company-1',
      name: 'Bag',
      code: 'BAG',
      sizeKg: '0',
      material: 'PP',
      unitCost: '-1',
    });
    const errors = await validate(dto);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['sizeKg', 'unitCost']));
  });

  it('redacts reference prices from ordinary item reads and scopes the lookup by company', async () => {
    prisma.item.findFirst.mockResolvedValue({
      id: 'item-1', companyId: 'company-1', kind: ItemKind.BY_PRODUCT, name: 'Bran', code: 'BRAN',
      purchasePrice: '25.0000', salesPrice: '32.0000', packagingSpec: null,
    });
    const result = await service.get('item-1', 'company-1');
    expect(prisma.item.findFirst).toHaveBeenCalledWith({ where: { id: 'item-1', companyId: 'company-1' }, include: { packagingSpec: true } });
    expect(result).not.toHaveProperty('purchasePrice');
    expect(result).not.toHaveProperty('salesPrice');
    expect(result.hasReferencePrices).toBe(true);
  });

  it('filters paddy varieties by active status for the catalog', async () => {
    prisma.item.findMany.mockResolvedValue([]);
    prisma.item.count.mockResolvedValue(0);
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.list({ companyId: 'company-1', kind: ItemKind.PADDY, active: false, page: 1, pageSize: 100 });

    expect(prisma.item.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: 'company-1', kind: ItemKind.PADDY, active: false }),
    }));
  });

  it('updates a paddy profile and status while retaining its required quality baselines', async () => {
    const existing = {
      id: 'paddy-1',
      companyId: 'company-1',
      kind: ItemKind.PADDY,
      name: 'BRRI Dhan 29',
      code: 'BR-29',
      variety: 'BRRI Dhan 29',
      standardMoisture: '14.00',
      standardRecovery: '70.00',
      headRicePercentage: null,
      brokenPercentage: null,
      riceType: null,
      brand: null,
      defaultPackagingLabel: null,
      packagingSpec: null,
      active: true,
    };
    const updated = { ...existing, localName: 'Boro 29', active: false };
    prisma.item.findFirst.mockResolvedValue(existing);
    const tx = {
      item: { update: jest.fn().mockResolvedValue(updated) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.update('paddy-1', {
      companyId: 'company-1',
      localName: ' Boro 29 ',
      active: false,
    }, 'user-1')).resolves.toEqual(expect.objectContaining({ localName: 'Boro 29', active: false }));
    expect(tx.item.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { localName: 'Boro 29', active: false },
    }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('allows rice product status updates using its stored composition targets', async () => {
    const existing = {
      id: 'rice-1',
      companyId: 'company-1',
      kind: ItemKind.RICE,
      name: 'Miniket Rice',
      code: 'MINIKET',
      riceType: 'MINIKET',
      headRicePercentage: '75.00',
      brokenPercentage: '20.00',
      packagingSpec: null,
      active: true,
    };
    const updated = { ...existing, active: false };
    prisma.item.findFirst.mockResolvedValue(existing);
    const tx = {
      item: { update: jest.fn().mockResolvedValue(updated) },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    await expect(service.update('rice-1', { companyId: 'company-1', active: false }, 'user-1'))
      .resolves.toEqual(expect.objectContaining({ active: false }));
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('transforms active query filters and allows optional paddy profile fields to be cleared', async () => {
    const listDto = plainToInstance(ListItemsDto, { companyId: 'company-1', kind: 'PADDY', active: 'false' });
    const createDto = plainToInstance(CreateItemDto, {
      companyId: 'company-1',
      kind: 'PADDY',
      name: 'BRRI Dhan 29',
      code: 'BR-29',
      variety: 'BRRI Dhan 29',
      standardMoisture: 14,
      standardRecovery: 70,
      localName: null,
      cropYear: null,
      grade: null,
      description: null,
    });

    expect(listDto.active).toBe(false);
    await expect(validate(listDto)).resolves.toHaveLength(0);
    await expect(validate(createDto)).resolves.toHaveLength(0);
  });
});
