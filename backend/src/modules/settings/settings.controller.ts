import { BadRequestException, Body, Controller, Get, NotFoundException, Put, Query } from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';

class UpdateCompanySettingsDto {
  @IsString() companyId!: string;
  @IsObject() settings!: Record<string, unknown>;
}

@Controller('settings/company')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermission('settings', PermissionAction.READ) async get(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required.');
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }, select: { id: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
    const setting = await this.prisma.companySetting.findUnique({ where: { companyId } });
    return { companyId, settings: setting?.settings ?? {} };
  }

  @Put() @RequirePermission('settings', PermissionAction.UPDATE) async replace(@Body() dto: UpdateCompanySettingsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId }, select: { id: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
    const setting = await this.prisma.companySetting.upsert({
      where: { companyId: dto.companyId },
      create: { companyId: dto.companyId, settings: dto.settings as Prisma.InputJsonValue },
      update: { settings: dto.settings as Prisma.InputJsonValue },
    });
    return { companyId: setting.companyId, settings: setting.settings };
  }
}
