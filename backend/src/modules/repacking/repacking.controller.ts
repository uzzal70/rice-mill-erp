import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateRepackingBatchDto, ListRepackingBatchesDto, RepackingBatchActionDto } from './repacking.dto';
import { RepackingService } from './repacking.service';

@Controller('repacking/batches')
export class RepackingController {
  constructor(private readonly repacking: RepackingService) {}

  @Get() @RequirePermission('repacking', PermissionAction.READ)
  list(@Query() query: ListRepackingBatchesDto) { return this.repacking.list(query); }

  @Post() @RequirePermission('repacking', PermissionAction.CREATE)
  create(@Body() dto: CreateRepackingBatchDto, @Req() req: AuthenticatedRequest) { return this.repacking.create(dto, req.user!.id); }

  @Post(':id/approve') @RequirePermission('repacking', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: RepackingBatchActionDto, @Req() req: AuthenticatedRequest) { return this.repacking.approve(id, dto.companyId, dto.factoryId, req.user!.id); }

  @Post(':id/post') @RequirePermission('repacking', PermissionAction.POST)
  post(@Param('id') id: string, @Body() dto: RepackingBatchActionDto, @Req() req: AuthenticatedRequest) { return this.repacking.post(id, dto.companyId, dto.factoryId, req.user!.id); }
}
