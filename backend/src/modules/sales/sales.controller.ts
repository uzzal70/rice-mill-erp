import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateSalesOrderDto,
  CreateSalesQuotationDto,
  ListSalesOrdersDto,
  ListSalesQuotationsDto,
  SalesOrderActionDto,
  SalesQuotationActionDto,
} from './sales.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // --- QUOTATIONS ---

  @Get('quotations')
  @RequirePermission('sales', PermissionAction.READ)
  listQuotations(@Query() q: ListSalesQuotationsDto) {
    return this.sales.listQuotations(q);
  }

  @Get('quotations/:id')
  @RequirePermission('sales', PermissionAction.READ)
  getQuotation(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.sales.getQuotation(id, companyId, factoryId);
  }

  @Post('quotations')
  @RequirePermission('sales', PermissionAction.CREATE)
  createQuotation(@Body() dto: CreateSalesQuotationDto, @Req() req: AuthenticatedRequest) {
    return this.sales.createQuotation(dto, req.user!.id);
  }

  @Post('quotations/:id/approve')
  @RequirePermission('sales', PermissionAction.APPROVE)
  approveQuotation(
    @Param('id') id: string,
    @Body() dto: SalesQuotationActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.approveQuotation(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post('quotations/:id/reject')
  @RequirePermission('sales', PermissionAction.APPROVE)
  rejectQuotation(
    @Param('id') id: string,
    @Body() dto: SalesQuotationActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.rejectQuotation(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  // --- ORDERS ---

  @Get('orders')
  @RequirePermission('sales', PermissionAction.READ)
  listOrders(@Query() q: ListSalesOrdersDto) {
    return this.sales.list(q);
  }

  @Get('orders/:id')
  @RequirePermission('sales', PermissionAction.READ)
  getOrder(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.sales.getOrder(id, companyId, factoryId);
  }

  @Post('orders')
  @RequirePermission('sales', PermissionAction.CREATE)
  createOrder(@Body() dto: CreateSalesOrderDto, @Req() req: AuthenticatedRequest) {
    return this.sales.create(dto, req.user!.id);
  }

  @Post('orders/:id/approve')
  @RequirePermission('sales', PermissionAction.APPROVE)
  approveOrder(
    @Param('id') id: string,
    @Body() dto: SalesOrderActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post('orders/:id/cancel')
  @RequirePermission('sales', PermissionAction.UPDATE)
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: SalesOrderActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sales.cancel(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}
