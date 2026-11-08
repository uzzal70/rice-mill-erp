import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import { IsEmail, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';

export class CreateCompanyDto {
  @IsString() @Length(2, 160) @Matches(/\S/) name!: string;
  @IsString() @Length(2, 24) @Matches(/\S/) code!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(255) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(40) tin?: string;
  @IsOptional() @IsString() @MaxLength(40) bin?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(80) district?: string;
  @IsOptional() @IsString() @MaxLength(80) division?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(255) website?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStart?: number;
  @IsOptional() @IsString() @Length(3, 3) @Matches(/^[a-zA-Z]{3}$/) currency?: string;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @Length(2, 160) @Matches(/\S/) name?: string;
  @IsOptional() @IsString() @Length(2, 24) @Matches(/\S/) code?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(255) logoUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(80) registrationNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(40) tin?: string | null;
  @IsOptional() @IsString() @MaxLength(40) bin?: string | null;
  @IsOptional() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @IsString() @MaxLength(80) district?: string | null;
  @IsOptional() @IsString() @MaxLength(80) division?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(255) website?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStart?: number;
  @IsOptional() @IsString() @Length(3, 3) @Matches(/^[a-zA-Z]{3}$/) currency?: string;
}

function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) { return code.trim().toUpperCase(); }

  private async translateUniqueConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A company with this code already exists.');
      }
      throw error;
    }
  }

  @Get() @RequirePermission('companies', PermissionAction.READ) async list(@Req() req: AuthenticatedRequest) {
    return this.prisma.company.findMany({
      where: { id: { in: req.user!.companyIds }, active: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('capabilities') @RequirePermission('companies', PermissionAction.CREATE, true) creationCapability() {
    return { canCreateCompany: true };
  }

  @Get(':companyId') @RequirePermission('companies', PermissionAction.READ) async get(@Param('companyId') companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found.');
    return company;
  }

  @Post() @RequirePermission('companies', PermissionAction.CREATE, true) async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCompanyDto) {
    const normalized = {
      ...dto,
      name: dto.name.trim(),
      code: this.normalizeCode(dto.code),
      email: dto.email?.trim().toLowerCase(),
      currency: dto.currency?.trim().toUpperCase() ?? 'BDT',
      fiscalYearStart: dto.fiscalYearStart ?? 1,
    };
    return this.translateUniqueConflict(() => this.prisma.$transaction(async tx => {
      const company = await tx.company.create({ data: normalized });
      const permissionRecords = await tx.permission.findMany({ select: { id: true, resource: true, action: true } });
      if (!permissionRecords.length) throw new NotFoundException('Permission catalog is not initialized. Run the application seed before creating a company.');
      const ownerPermissions = permissionRecords.filter(permission => permission.resource !== 'companies' || permission.action !== PermissionAction.CREATE);
      const ownerRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'Owner',
          code: 'OWNER',
          permissions: { create: ownerPermissions.map(permission => ({ permissionId: permission.id })) },
        },
      });
      const membership = await tx.membership.create({ data: { userId: req.user!.id, companyId: company.id } });
      await tx.userRole.create({ data: { membershipId: membership.id, roleId: ownerRole.id } });
      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          userId: req.user!.id,
          resource: 'companies',
          action: 'CREATE',
          resourceId: company.id,
          after: jsonSnapshot(company),
        },
      });
      return company;
    }));
  }

  @Patch(':companyId') @RequirePermission('companies', PermissionAction.UPDATE) async update(
    @Req() req: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    const before = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!before) throw new NotFoundException('Company not found.');
    if (!Object.keys(dto).length) throw new BadRequestException('Provide at least one company field to update.');
    const data = {
      ...dto,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.code !== undefined ? { code: this.normalizeCode(dto.code) } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() ?? null } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency.trim().toUpperCase() } : {}),
    };
    return this.translateUniqueConflict(() => this.prisma.$transaction(async tx => {
      const updated = await tx.company.update({ where: { id: companyId }, data });
      await tx.auditEvent.create({
        data: {
          companyId,
          userId: req.user!.id,
          resource: 'companies',
          action: 'UPDATE',
          resourceId: companyId,
          before: jsonSnapshot(before),
          after: jsonSnapshot(updated),
        },
      });
      return updated;
    }));
  }
}
