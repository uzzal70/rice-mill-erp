import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { CreateGoodsReceiptDto, CreatePurchaseOrderDto, ListGoodsReceiptsDto, ListPurchasesDto, PurchaseActionDto } from './procurement.dto';
import { ProcurementService } from './procurement.service';

@Controller('procurement/purchases')
export class PurchasesController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get() @RequirePermission('procurement', PermissionAction.READ)
  list(@Query() query: ListPurchasesDto) { return this.procurement.listPurchases(query); }

  @Post() @RequirePermission('procurement', PermissionAction.CREATE)
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req: AuthenticatedRequest) { return this.procurement.createPurchaseOrder(dto, req.user!.id); }

  @Post(':id/approve') @RequirePermission('procurement', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) {
    return this.procurement.approvePurchaseOrder(id, dto, req.user!.id);
  }
}

@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get() @RequirePermission('procurement', PermissionAction.READ)
  list(@Query() query: ListGoodsReceiptsDto) { return this.procurement.listGoodsReceipts(query); }

  @Post() @RequirePermission('procurement', PermissionAction.CREATE)
  create(@Body() dto: CreateGoodsReceiptDto, @Req() req: AuthenticatedRequest) { return this.procurement.createGoodsReceipt(dto, req.user!.id); }

  @Post(':id/approve') @RequirePermission('procurement', PermissionAction.APPROVE)
  approve(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) {
    return this.procurement.approveGoodsReceipt(id, dto, req.user!.id);
  }

  @Post(':id/post') @RequirePermission('procurement', PermissionAction.POST)
  post(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) {
    return this.procurement.postGoodsReceipt(id, dto, req.user!.id);
  }
}
