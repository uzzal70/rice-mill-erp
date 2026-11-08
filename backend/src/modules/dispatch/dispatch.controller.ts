import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateDispatchDto, DispatchActionDto, ListDispatchDto } from './dispatch.dto';
import { DispatchService } from './dispatch.service';

@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Get()
  @RequirePermission('dispatch', PermissionAction.READ)
  list(@Query() q: ListDispatchDto) {
    return this.dispatch.list(q);
  }

  @Get(':id')
  @RequirePermission('dispatch', PermissionAction.READ)
  get(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.dispatch.get(id, companyId, factoryId);
  }

  @Post()
  @RequirePermission('dispatch', PermissionAction.CREATE)
  create(@Body() dto: CreateDispatchDto, @Req() req: AuthenticatedRequest) {
    return this.dispatch.create(dto, req.user!.id);
  }

  @Post(':id/approve')
  @RequirePermission('dispatch', PermissionAction.APPROVE)
  approve(
    @Param('id') id: string,
    @Body() dto: DispatchActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dispatch.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/post')
  @RequirePermission('dispatch', PermissionAction.POST)
  post(
    @Param('id') id: string,
    @Body() dto: DispatchActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dispatch.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/cancel')
  @RequirePermission('dispatch', PermissionAction.UPDATE)
  cancel(
    @Param('id') id: string,
    @Body() dto: DispatchActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dispatch.cancel(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}

