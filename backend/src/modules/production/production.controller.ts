import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateProductionBatchDto, ListProductionBatchesDto, ProductionBatchActionDto } from './production.dto';
import { ProductionService } from './production.service';

@Controller('production/batches')
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get() @RequirePermission('production', PermissionAction.READ)
  list(@Query() query: ListProductionBatchesDto) { return this.production.list(query); }

  @Post() @RequirePermission('production', PermissionAction.CREATE)
  create(@Body() dto: CreateProductionBatchDto, @Req() req: AuthenticatedRequest) {
    return this.production.create(dto, req.user!.id);
  }

  @Post(':id/approve') @RequirePermission('production', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: ProductionBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.production.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/post') @RequirePermission('production', PermissionAction.POST)
  post(@Param('id') id: string, @Body() dto: ProductionBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.production.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}
