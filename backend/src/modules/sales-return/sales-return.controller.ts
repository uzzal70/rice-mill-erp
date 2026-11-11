import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateSalesReturnDto, ListSalesReturnDto, SalesReturnActionDto } from './sales-return.dto';
import { SalesReturnService } from './sales-return.service';

@Controller('sales-returns')
export class SalesReturnController {
  constructor(private readonly salesReturn: SalesReturnService) {}

  @Get()
  @RequirePermission('sales-returns', PermissionAction.READ)
  list(@Query() q: ListSalesReturnDto) {
    return this.salesReturn.list(q);
  }

  @Get(':id')
  @RequirePermission('sales-returns', PermissionAction.READ)
  get(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.salesReturn.getReturn(id, companyId, factoryId);
  }

  @Post()
  @RequirePermission('sales-returns', PermissionAction.CREATE)
  create(@Body() dto: CreateSalesReturnDto, @Req() req: AuthenticatedRequest) {
    return this.salesReturn.create(dto, req.user!.id);
  }

  @Post(':id/approve')
  @RequirePermission('sales-returns', PermissionAction.APPROVE)
  approve(
    @Param('id') id: string,
    @Body() dto: SalesReturnActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.salesReturn.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/post')
  @RequirePermission('sales-returns', PermissionAction.POST)
  post(
    @Param('id') id: string,
    @Body() dto: SalesReturnActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.salesReturn.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/cancel')
  @RequirePermission('sales-returns', PermissionAction.UPDATE)
  cancel(
    @Param('id') id: string,
    @Body() dto: SalesReturnActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.salesReturn.cancel(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}

