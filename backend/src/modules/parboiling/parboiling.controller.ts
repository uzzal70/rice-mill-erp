import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateParboilingBatchDto, ListParboilingBatchesDto, ParboilingBatchActionDto } from './parboiling.dto';
import { ParboilingService } from './parboiling.service';

@Controller('parboiling/batches')
export class ParboilingController {
  constructor(private readonly parboiling: ParboilingService) {}

  @Get() @RequirePermission('parboiling', PermissionAction.READ)
  list(@Query() query: ListParboilingBatchesDto) { return this.parboiling.list(query); }

  @Post() @RequirePermission('parboiling', PermissionAction.CREATE)
  create(@Body() dto: CreateParboilingBatchDto, @Req() req: AuthenticatedRequest) {
    return this.parboiling.create(dto, req.user!.id);
  }

  @Post(':id/approve') @RequirePermission('parboiling', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: ParboilingBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.parboiling.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/post') @RequirePermission('parboiling', PermissionAction.POST)
  post(@Param('id') id: string, @Body() dto: ParboilingBatchActionDto, @Req() req: AuthenticatedRequest) {
    return this.parboiling.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}
