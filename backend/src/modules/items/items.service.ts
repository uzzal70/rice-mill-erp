import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateByProductDto, CreateItemDto, CreatePackagingDto, ItemFinancialDto, ListItemsDto, UpdateItemDto, UpdatePackagingSpecDto } from './items.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private publicRecord<T extends { purchasePrice?: unknown; salesPrice?: unknown; packagingSpec?: { unitCost?: unknown; bagType: string | null; sizeKg: unknown; material: string; supplierPartnerId?: string | null } | null }>(record: T) {
    const { purchasePrice, salesPrice, packagingSpec, ...safe } = record;
    return {
      ...safe,
      hasReferencePrices: purchasePrice != null || salesPrice != null,
      packagingSpec: packagingSpec ? {
        bagType: packagingSpec.bagType,
        sizeKg: packagingSpec.sizeKg,
        material: packagingSpec.material,
        supplierPartnerId: packagingSpec.supplierPartnerId ?? null,
      } : null,
    };
  }

  async createByProduct(dto: CreateByProductDto, userId: string) {
    if (dto.kind !== ItemKind.BY_PRODUCT) throw new BadRequestException('By-product records must use the BY_PRODUCT item kind.');
    this.validateProfile(dto.kind, dto);
    const data: Prisma.ItemCreateInput = {
      company: { connect: { id: dto.companyId } },
      kind: ItemKind.BY_PRODUCT,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      byProductType: dto.byProductType.trim(),
      purchasePrice: new Prisma.Decimal(dto.purchasePrice),
      salesPrice: new Prisma.Decimal(dto.salesPrice),
      baseUnit: 'KG',
      ...(dto.grade !== undefined ? { grade: dto.grade?.trim() || null } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.item.create({ data, include: { packagingSpec: true } });
        await this.audit(tx, dto.companyId, userId, 'CREATE', record.id, undefined, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An item with this code already exists in the company.');
      }
      throw error;
    }
  }

  private validateProfile(
    kind: ItemKind,
    data: CreateItemDto | UpdateItemDto,
    existingPackaging = false,
    changedFields: CreateItemDto | UpdateItemDto = data,
  ) {
    const has = (key: keyof CreateItemDto & keyof UpdateItemDto) => changedFields[key] !== undefined && changedFields[key] !== null;
    if ((kind === ItemKind.PADDY || kind === ItemKind.RICE || kind === ItemKind.BY_PRODUCT) && 'baseUnit' in data && data.baseUnit === 'PIECE') {
      throw new BadRequestException('Grain and by-product items must use a weight unit.');
    }
    if (kind === ItemKind.PADDY) {
      if (!('variety' in data) || typeof data.variety !== 'string' || !data.variety.trim()) throw new BadRequestException('Paddy items require a variety.');
      if (data.standardMoisture == null || data.standardRecovery == null) throw new BadRequestException('Paddy items require standard moisture and recovery percentages.');
      if (has('headRicePercentage') || has('brokenPercentage') || has('riceType')) throw new BadRequestException('Rice composition fields are not valid on paddy items.');
    } else if (has('standardMoisture') || has('standardRecovery')) {
      throw new BadRequestException('Standard moisture and recovery are only valid on paddy items.');
    }
    if (kind === ItemKind.RICE) {
      if (!('riceType' in data) || typeof data.riceType !== 'string' || !data.riceType.trim()) throw new BadRequestException('Rice items require a rice type.');
      if (data.headRicePercentage == null || data.brokenPercentage == null) throw new BadRequestException('Rice items require head-rice and broken-rice target percentages.');
      const head = new Prisma.Decimal(String(data.headRicePercentage));
      const broken = new Prisma.Decimal(String(data.brokenPercentage));
      if (head.add(broken).gt(100)) throw new BadRequestException('Head-rice and broken-rice target percentages cannot exceed 100% combined.');
    } else if (has('headRicePercentage') || has('brokenPercentage') || has('riceType') || has('brand') || has('defaultPackagingLabel')) {
      throw new BadRequestException('Rice product fields are only valid on rice items.');
    }
    if (kind === ItemKind.BY_PRODUCT) {
      const byProductTypeProvided = Object.prototype.hasOwnProperty.call(changedFields, 'byProductType');
      if (byProductTypeProvided && (typeof data.byProductType !== 'string' || !data.byProductType.trim())) {
        throw new BadRequestException('By-products require a type.');
      }
    } else if (has('byProductType')) {
      throw new BadRequestException('By-product type is only valid on by-product items.');
    }
    if (kind === ItemKind.PACKAGING && !existingPackaging && !('packagingSpec' in data)) {
      throw new BadRequestException('Packaging items require size and material details.');
    }
    if (kind !== ItemKind.PACKAGING && 'packagingSpec' in changedFields && changedFields.packagingSpec != null) {
      throw new BadRequestException('Packaging specifications are only valid on packaging items.');
    }
  }

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({ data: { companyId, userId, action, resource: 'items', resourceId: id, before: snapshot(before), after: snapshot(after) } });
  }

  async list(query: ListItemsDto) {
    const where: Prisma.ItemWhereInput = {
      companyId: query.companyId,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { variety: { contains: query.search, mode: 'insensitive' } },
        { localName: { contains: query.search, mode: 'insensitive' } },
        { byProductType: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({ where, include: { packagingSpec: true }, orderBy: [{ kind: 'asc' }, { name: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.item.count({ where }),
    ]);
    return { success: true, data: records.map(record => this.publicRecord(record)), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(id: string, companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required.');
    const record = await this.prisma.item.findFirst({ where: { id, companyId }, include: { packagingSpec: true } });
    if (!record) throw new NotFoundException('Item not found.');
    return this.publicRecord(record);
  }

  async getFinancial(id: string, companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required.');
    const record = await this.prisma.item.findFirst({
      where: { id, companyId },
      select: { id: true, kind: true, purchasePrice: true, salesPrice: true, packagingSpec: { select: { unitCost: true } } },
    });
    if (!record) throw new NotFoundException('Item not found.');
    return record;
  }

  async create(dto: CreateItemDto, userId: string) {
    if (dto.kind === ItemKind.PACKAGING) {
      throw new BadRequestException('Create packaging through the packaging master with a configured unit cost.');
    }
    if (dto.kind === ItemKind.BY_PRODUCT) {
      throw new BadRequestException('Create by-products with purchase and sales reference prices using the by-product master.');
    }
    this.validateProfile(dto.kind, dto);
    const data: Prisma.ItemCreateInput = {
      company: { connect: { id: dto.companyId } },
      kind: dto.kind, name: dto.name.trim(), code: dto.code.trim().toUpperCase(),
      ...(dto.variety !== undefined ? { variety: dto.variety?.trim() || null } : {}),
      ...(dto.cropYear !== undefined ? { cropYear: dto.cropYear } : {}),
      ...(dto.grade !== undefined ? { grade: dto.grade?.trim() || null } : {}),
      ...(dto.localName !== undefined ? { localName: dto.localName?.trim() || null } : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
      ...(dto.riceType !== undefined ? { riceType: dto.riceType?.trim() || null } : {}),
      ...(dto.byProductType !== undefined ? { byProductType: dto.byProductType?.trim() || null } : {}),
      ...(dto.defaultPackagingLabel !== undefined ? { defaultPackagingLabel: dto.defaultPackagingLabel?.trim() || null } : {}),
      ...(dto.standardMoisture !== undefined ? { standardMoisture: new Prisma.Decimal(dto.standardMoisture) } : {}),
      ...(dto.standardRecovery !== undefined ? { standardRecovery: new Prisma.Decimal(dto.standardRecovery) } : {}),
      ...(dto.headRicePercentage !== undefined ? { headRicePercentage: new Prisma.Decimal(dto.headRicePercentage) } : {}),
      ...(dto.brokenPercentage !== undefined ? { brokenPercentage: new Prisma.Decimal(dto.brokenPercentage) } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      baseUnit: dto.baseUnit ?? 'KG',
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.item.create({ data, include: { packagingSpec: true } });
        await this.audit(tx, dto.companyId, userId, 'CREATE', record.id, undefined, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('An item with this code already exists in the company.');
      throw error;
    }
  }

  async createPackaging(dto: CreatePackagingDto, userId: string) {
    const data: Prisma.ItemCreateInput = {
      company: { connect: { id: dto.companyId } },
      kind: ItemKind.PACKAGING,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      baseUnit: 'PIECE',
      packagingSpec: {
        create: {
          bagType: dto.bagType?.trim() || null,
          sizeKg: new Prisma.Decimal(dto.sizeKg),
          material: dto.material.trim(),
          unitCost: new Prisma.Decimal(dto.unitCost),
          supplierPartnerId: dto.supplierPartnerId ?? null,
        },
      },
    };
    try {
      return await this.prisma.$transaction(async tx => {
        if (dto.supplierPartnerId && !await tx.partner.findFirst({
          where: { id: dto.supplierPartnerId, companyId: dto.companyId, type: 'SUPPLIER', active: true },
          select: { id: true },
        })) {
          throw new BadRequestException('Packaging supplier must be an active supplier in the same company.');
        }
        const record = await tx.item.create({ data, include: { packagingSpec: true } });
        await this.audit(tx, dto.companyId, userId, 'CREATE', record.id, undefined, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An item with this code already exists in the company.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateItemDto, userId: string) {
    const existing = await this.prisma.item.findFirst({ where: { id, companyId: dto.companyId }, include: { packagingSpec: true } });
    if (!existing) throw new NotFoundException('Item not found.');
    const merged = { ...existing, ...dto } as UpdateItemDto;
    this.validateProfile(existing.kind, merged, Boolean(existing.packagingSpec), dto);
    const data: Prisma.ItemUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.variety !== undefined ? { variety: dto.variety?.trim() || null } : {}),
      ...(dto.cropYear !== undefined ? { cropYear: dto.cropYear } : {}),
      ...(dto.grade !== undefined ? { grade: dto.grade?.trim() || null } : {}),
      ...(dto.localName !== undefined ? { localName: dto.localName?.trim() || null } : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
      ...(dto.riceType !== undefined ? { riceType: dto.riceType?.trim() || null } : {}),
      ...(dto.byProductType !== undefined ? { byProductType: dto.byProductType?.trim() || null } : {}),
      ...(dto.defaultPackagingLabel !== undefined ? { defaultPackagingLabel: dto.defaultPackagingLabel?.trim() || null } : {}),
      ...(dto.standardMoisture !== undefined ? { standardMoisture: new Prisma.Decimal(dto.standardMoisture) } : {}),
      ...(dto.standardRecovery !== undefined ? { standardRecovery: new Prisma.Decimal(dto.standardRecovery) } : {}),
      ...(dto.headRicePercentage !== undefined ? { headRicePercentage: new Prisma.Decimal(dto.headRicePercentage) } : {}),
      ...(dto.brokenPercentage !== undefined ? { brokenPercentage: new Prisma.Decimal(dto.brokenPercentage) } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const record = await tx.item.update({ where: { id }, data, include: { packagingSpec: true } });
        await this.audit(tx, dto.companyId, userId, 'UPDATE', id, existing, record);
        return this.publicRecord(record);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('An item with this code already exists in the company.');
      throw error;
    }
  }

  async updateFinancial(id: string, dto: ItemFinancialDto, userId: string) {
    const existing = await this.prisma.item.findFirst({ where: { id, companyId: dto.companyId }, include: { packagingSpec: true } });
    if (!existing) throw new NotFoundException('Item not found.');
    const hasPrice = dto.purchasePrice !== undefined || dto.salesPrice !== undefined;
    if (existing.kind === ItemKind.BY_PRODUCT && hasPrice && (dto.purchasePrice === undefined && existing.purchasePrice == null || dto.salesPrice === undefined && existing.salesPrice == null)) {
      throw new BadRequestException('Set both purchase and sales reference prices for a by-product.');
    }
    if (dto.packagingUnitCost !== undefined && (!existing.packagingSpec || existing.kind !== ItemKind.PACKAGING)) {
      throw new BadRequestException('Packaging unit cost is only valid for packaging items.');
    }
    if (dto.purchasePrice === undefined && dto.salesPrice === undefined && dto.packagingUnitCost === undefined) throw new BadRequestException('Provide at least one reference price to update.');
    const data = {
      ...(dto.purchasePrice !== undefined ? { purchasePrice: new Prisma.Decimal(dto.purchasePrice) } : {}),
      ...(dto.salesPrice !== undefined ? { salesPrice: new Prisma.Decimal(dto.salesPrice) } : {}),
    };
    return this.prisma.$transaction(async tx => {
      const record = hasPrice
        ? await tx.item.update({ where: { id }, data, include: { packagingSpec: true } })
        : existing;
      if (dto.packagingUnitCost !== undefined) {
        await tx.packagingSpec.update({ where: { itemId: id }, data: { unitCost: new Prisma.Decimal(dto.packagingUnitCost) } });
        record.packagingSpec!.unitCost = new Prisma.Decimal(dto.packagingUnitCost);
      }
      await this.audit(tx, dto.companyId, userId, 'UPDATE_REFERENCE_PRICES', id, existing, record);
      return { id: record.id, updatedAt: record.updatedAt, hasReferencePrices: record.purchasePrice != null || record.salesPrice != null };
    });
  }

  async updatePackaging(id: string, dto: UpdatePackagingSpecDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
      const existing = await tx.item.findFirst({ where: { id, companyId: dto.companyId }, include: { packagingSpec: true } });
      if (!existing || existing.kind !== ItemKind.PACKAGING || !existing.packagingSpec) throw new NotFoundException('Packaging item not found.');
      if (dto.supplierPartnerId && !await tx.partner.findFirst({
        where: { id: dto.supplierPartnerId, companyId: dto.companyId, type: 'SUPPLIER', active: true },
        select: { id: true },
      })) {
        throw new BadRequestException('Packaging supplier must be an active supplier in the same company.');
      }
      const spec = await tx.packagingSpec.update({
        where: { itemId: id },
        data: {
          ...(dto.bagType !== undefined ? { bagType: dto.bagType?.trim() || null } : {}),
          sizeKg: new Prisma.Decimal(dto.sizeKg),
          material: dto.material.trim(),
          ...(Object.prototype.hasOwnProperty.call(dto, 'supplierPartnerId') ? { supplierPartnerId: dto.supplierPartnerId ?? null } : {}),
        },
      });
      const updatedItem = dto.name !== undefined || dto.code !== undefined || dto.active !== undefined
        ? await tx.item.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
          },
          include: { packagingSpec: true },
        })
        : { ...existing, packagingSpec: spec };
      await this.audit(tx, dto.companyId, userId, 'UPDATE_PACKAGING_SPEC', id, existing, updatedItem);
      return { itemId: id, bagType: spec.bagType, sizeKg: spec.sizeKg, material: spec.material, supplierPartnerId: spec.supplierPartnerId };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An item with this code already exists in the company.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Packaging details changed while saving. Refresh and retry.');
      }
      throw error;
    }
  }
}
