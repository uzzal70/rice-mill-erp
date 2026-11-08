import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { ConvertQuantityDto, CreateUnitConversionDto, ListUnitConversionsDto } from './unit-conversions.dto';
import { UnitConversionsService } from './unit-conversions.service';

@Controller('unit-conversions')
export class UnitConversionsController {
  constructor(private readonly conversions: UnitConversionsService) {}

  @Get() @RequirePermission('unit-conversions', PermissionAction.READ) list(@Query() query: ListUnitConversionsDto) { return this.conversions.list(query); }
  @Post() @RequirePermission('unit-conversions', PermissionAction.CREATE) create(@Body() dto: CreateUnitConversionDto, @Req() req: AuthenticatedRequest) { return this.conversions.create(dto, req.user!.id); }
  @Post('convert') @RequirePermission('unit-conversions', PermissionAction.READ) convert(@Body() dto: ConvertQuantityDto) { return this.conversions.convert(dto); }
}
