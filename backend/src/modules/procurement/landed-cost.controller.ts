import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequireAllPermissions } from '../../common/authz';
import { PurchaseActionDto } from './procurement.dto';
import { CreateLandedCostConfigDto, CreateLandedCostDto, ListLandedCostComponentsDto, ListLandedCostsDto } from './landed-cost.dto';
import { LandedCostService } from './landed-cost.service';

@Controller('landed-cost')
export class LandedCostController {
  constructor(private readonly service: LandedCostService) {}

  @Get('components')
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.READ }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  components(@Query() query: ListLandedCostComponentsDto) { return this.service.listConfigs(query.companyId, query.factoryId); }

  @Post('components')
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.CREATE }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  createComponent(@Body() dto: CreateLandedCostConfigDto, @Req() req: AuthenticatedRequest) { return this.service.createConfig(dto, req.user!.id); }

  @Get()
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.READ }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  list(@Query() query: ListLandedCostsDto) { return this.service.list(query); }

  @Post()
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.CREATE }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  create(@Body() dto: CreateLandedCostDto, @Req() req: AuthenticatedRequest) { return this.service.create(dto, req.user!.id); }

  @Post(':id/approve')
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.APPROVE }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  approve(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) { return this.service.transition(id, dto, req.user!.id, 'approve'); }

  @Post(':id/post')
  @RequireAllPermissions({ resource: 'procurement', action: PermissionAction.POST }, { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL })
  post(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) { return this.service.transition(id, dto, req.user!.id, 'post'); }
}
