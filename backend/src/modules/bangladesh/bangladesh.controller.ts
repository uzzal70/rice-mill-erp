import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CalculateTaxDto,
  CreateTaxConfigDto,
  ListTaxConfigsDto,
} from './bangladesh.dto';
import { BangladeshService } from './bangladesh.service';

@Controller('bangladesh')
export class BangladeshController {
  constructor(private readonly bangladeshService: BangladeshService) {}

  @Get('defaults')
  @RequirePermission('settings', PermissionAction.READ)
  getDefaults(@Query('companyId') companyId: string) {
    return this.bangladeshService.getDefaults(companyId);
  }

  @Get('tax-configs')
  @RequirePermission('settings', PermissionAction.READ)
  listTaxConfigs(@Query() query: ListTaxConfigsDto) {
    return this.bangladeshService.listTaxConfigs(query);
  }

  @Post('tax-configs')
  @RequirePermission('settings', PermissionAction.UPDATE)
  createTaxConfig(
    @Body() dto: CreateTaxConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bangladeshService.createTaxConfig(dto, req.user?.id || 'system-admin');
  }

  @Post('calculate-taxes')
  @RequirePermission('settings', PermissionAction.READ)
  calculateTaxes(@Body() dto: CalculateTaxDto) {
    return this.bangladeshService.calculateTaxes(dto);
  }
}

