import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequireAllPermissions } from '../../common/authz';
import { PurchaseActionDto } from './procurement.dto';
import { CreatePurchaseInvoiceDto, ListPurchaseInvoicesDto } from './purchase-invoice.dto';
import { PurchaseInvoiceService } from './purchase-invoice.service';

@Controller('purchase-invoices')
export class PurchaseInvoiceController {
  constructor(private readonly invoices: PurchaseInvoiceService) {}

  @Get()
  @RequireAllPermissions(
    { resource: 'procurement', action: PermissionAction.READ },
    { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
  )
  list(@Query() query: ListPurchaseInvoicesDto) { return this.invoices.list(query); }

  @Post()
  @RequireAllPermissions(
    { resource: 'procurement', action: PermissionAction.CREATE },
    { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
  )
  create(@Body() dto: CreatePurchaseInvoiceDto, @Req() req: AuthenticatedRequest) {
    return this.invoices.create(dto, req.user!.id);
  }

  @Post(':id/approve')
  @RequireAllPermissions(
    { resource: 'procurement', action: PermissionAction.APPROVE },
    { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
  )
  approve(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) {
    return this.invoices.approve(id, dto, req.user!.id);
  }

  @Post(':id/post')
  @RequireAllPermissions(
    { resource: 'procurement', action: PermissionAction.POST },
    { resource: 'procurement', action: PermissionAction.VIEW_FINANCIAL },
  )
  post(@Param('id') id: string, @Body() dto: PurchaseActionDto, @Req() req: AuthenticatedRequest) {
    return this.invoices.post(id, dto, req.user!.id);
  }
}
