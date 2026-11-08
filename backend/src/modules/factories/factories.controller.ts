import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumberString, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { BusinessMode, PermissionAction, Prisma, ProductionType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';

export class ListFactoriesDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() includeInactive = false;
}

export class CreateFactoryDto {
  @IsString() companyId!: string;
  @IsString() @Length(2, 160) @Matches(/\S/) name!: string;
  @IsString() @Length(1, 24) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) code!: string;
  @IsEnum(ProductionType) productionType!: ProductionType;
  @IsOptional() @IsArray() @IsEnum(BusinessMode, { each: true }) businessModes?: BusinessMode[];
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(160) managerName?: string;
  @IsOptional() @IsNumberString({ no_symbols: false }) @Matches(/^\d{1,11}(\.\d{1,3})?$/) capacityPerDay?: string | null;
}

export class UpdateFactoryDto {
  @IsOptional() @IsString() @Length(2, 160) @Matches(/\S/) name?: string;
  @IsOptional() @IsString() @Length(1, 24) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) code?: string;
  @IsOptional() @IsEnum(ProductionType) productionType?: ProductionType;
  @IsOptional() @IsArray() @IsEnum(BusinessMode, { each: true }) businessModes?: BusinessMode[];
  @IsOptional() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @IsString() @MaxLength(160) managerName?: string | null;
  @IsOptional() @IsNumberString({ no_symbols: false }) @Matches(/^\d{1,11}(\.\d{1,3})?$/) capacityPerDay?: string | null;
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
}

function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Controller('factories')
export class FactoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('capabilities') @RequirePermission('factories', PermissionAction.CREATE) creationCapability(@Query('companyId') _companyId: string) {
    return { canCreateFactory: true };
  }

  @Get() @RequirePermission('factories', PermissionAction.READ) list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListFactoriesDto,
  ) {
    return this.prisma.factory.findMany({
      where: {
        companyId: query.companyId ?? { in: req.user!.companyIds },
        ...(query.includeInactive ? {} : { active: true }),
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':factoryId') @RequirePermission('factories', PermissionAction.READ) async get(@Param('factoryId') factoryId: string) {
    const factory = await this.prisma.factory.findUnique({ where: { id: factoryId } });
    if (!factory) throw new NotFoundException('Factory not found.');
    return factory;
  }

  @Post() @RequirePermission('factories', PermissionAction.CREATE) async create(
    @Body() dto: CreateFactoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Company not found.');
    const { capacityPerDay, ...fields } = dto;
    try {
      return await this.prisma.$transaction(async tx => {
        const factory = await tx.factory.create({
          data: {
            ...fields,
            name: dto.name.trim(),
            code: dto.code.trim().toUpperCase(),
            managerName: dto.managerName?.trim() || null,
            address: dto.address?.trim() || null,
            capacityPerDay: capacityPerDay == null ? null : new Prisma.Decimal(capacityPerDay),
            businessModes: dto.businessModes ?? [],
          },
        });
        await tx.auditEvent.create({
          data: {
            companyId: dto.companyId,
            userId: req.user!.id,
            resource: 'factories',
            action: 'CREATE',
            resourceId: factory.id,
            after: jsonSnapshot(factory),
          },
        });
        return factory;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A factory with this code already exists in the company.');
      }
      throw error;
    }
  }

  @Patch(':factoryId') @RequirePermission('factories', PermissionAction.UPDATE) async update(
    @Req() req: AuthenticatedRequest,
    @Param('factoryId') factoryId: string,
    @Body() dto: UpdateFactoryDto,
  ) {
    const before = await this.prisma.factory.findUnique({ where: { id: factoryId } });
    if (!before) throw new NotFoundException('Factory not found.');
    if (!Object.keys(dto).length) throw new BadRequestException('Provide at least one factory field to update.');
    const { capacityPerDay, ...fields } = dto;
    const data = {
      ...fields,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.managerName !== undefined ? { managerName: dto.managerName?.trim() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
      ...(capacityPerDay !== undefined ? { capacityPerDay: capacityPerDay === null ? null : new Prisma.Decimal(capacityPerDay) } : {}),
    };
    try {
      return await this.prisma.$transaction(async tx => {
        const updated = await tx.factory.update({ where: { id: factoryId }, data });
        await tx.auditEvent.create({
          data: {
            companyId: before.companyId,
            userId: req.user!.id,
            resource: 'factories',
            action: 'UPDATE',
            resourceId: factoryId,
            before: jsonSnapshot(before),
            after: jsonSnapshot(updated),
          },
        });
        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A factory with this code already exists in the company.');
      }
      throw error;
    }
  }
}
