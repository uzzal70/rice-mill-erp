import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateTollBatchDto,
  CreateTollDeliveryDto,
  CreateTollOrderDto,
  ListTollOrderDto,
  TollOrderActionDto,
} from './toll-milling.dto';
import { TollMillingService } from './toll-milling.service';

@Controller('toll-milling')
export class TollMillingController {
  constructor(private readonly tollMilling: TollMillingService) {}

  @Get('orders')
  @RequirePermission('toll-milling', PermissionAction.READ)
  listOrders(@Query() q: ListTollOrderDto) {
    return this.tollMilling.listOrders(q);
  }

  @Get('orders/:id')
  @RequirePermission('toll-milling', PermissionAction.READ)
  getOrder(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.tollMilling.getOrder(id, companyId, factoryId);
  }

  @Get('custody/:customerId')
  @RequirePermission('toll-milling', PermissionAction.READ)
  getCustomerCustody(
    @Param('customerId') customerId: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
  ) {
    return this.tollMilling.getCustomerCustodyLedger(customerId, companyId, factoryId);
  }

  @Post('orders')
  @RequirePermission('toll-milling', PermissionAction.CREATE)
  createOrder(@Body() dto: CreateTollOrderDto, @Req() req: AuthenticatedRequest) {
    return this.tollMilling.createOrder(dto, req.user!.id);
  }

  @Post('orders/:id/approve')
  @RequirePermission('toll-milling', PermissionAction.APPROVE)
  approveOrder(
    @Param('id') id: string,
    @Body() dto: TollOrderActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tollMilling.approveOrder(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post('orders/:id/batches')
  @RequirePermission('toll-milling', PermissionAction.CREATE)
  createBatch(
    @Param('id') id: string,
    @Body() dto: CreateTollBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tollMilling.createBatch(id, dto, req.user!.id);
  }

  @Post('orders/:id/deliveries')
  @RequirePermission('toll-milling', PermissionAction.POST)
  createDelivery(
    @Param('id') id: string,
    @Body() dto: CreateTollDeliveryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tollMilling.createDelivery(id, dto, req.user!.id);
  }

  @Post('orders/:id/cancel')
  @RequirePermission('toll-milling', PermissionAction.UPDATE)
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: TollOrderActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tollMilling.cancelOrder(id, dto.companyId, dto.factoryId, req.user!.id);
  }
}

