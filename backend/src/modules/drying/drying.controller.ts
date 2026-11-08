import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateDryingBatchDto, DryingBatchActionDto, ListDryingBatchesDto } from './drying.dto';
import { DryingService } from './drying.service';

@Controller('drying/batches')
export class DryingController {
  constructor(private readonly drying: DryingService) {}

  @Get() @RequirePermission('drying', PermissionAction.READ)
  list(@Query() query: ListDryingBatchesDto) { return this.drying.list(query); }

  @Post() @RequirePermission('drying', PermissionAction.CREATE)
  create(@Body() dto: CreateDryingBatchDto, @Req() req: AuthenticatedRequest) {
    return this.drying.create(dto, req.user!.id);
  }

  @Post(':id/approve') @RequirePermission('drying', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: DryingBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.drying.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/post') @RequirePermission('drying', PermissionAction.POST)
  post(@Param('id') id: string, @Body() dto: DryingBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.drying.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}
