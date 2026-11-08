import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateGodownDto,
  CreateStackDto,
  CreateStockAdjustmentDto,
  CreateStockCountDto,
  CreateStockTransferDto,
  ListByProductActivityDto,
  ListInventoryDto,
  ListPackagingStockDto,
  ListStacksDto,
  ListStockCountsDto,
  StockCountActionDto,
  ListWarehouseDto,
  UpdateStackDto,
} from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('godowns')
export class GodownsController {
  constructor(private readonly inventory: InventoryService) {}

  @Get() @RequirePermission('godowns', PermissionAction.READ)
  list(@Query() query: ListWarehouseDto) { return this.inventory.listGodowns(query); }

  @Post() @RequirePermission('godowns', PermissionAction.CREATE)
  create(@Body() dto: CreateGodownDto, @Req() req: AuthenticatedRequest) { return this.inventory.createGodown(dto, req.user!.id); }
}

@Controller('stacks')
export class StacksController {
  constructor(private readonly inventory: InventoryService) {}

  @Get() @RequirePermission('stacks', PermissionAction.READ)
  list(@Query() query: ListStacksDto) { return this.inventory.listStacks(query); }

  @Post() @RequirePermission('stacks', PermissionAction.CREATE)
  create(@Body() dto: CreateStackDto, @Req() req: AuthenticatedRequest) { return this.inventory.createStack(dto, req.user!.id); }

  @Patch(':stackId') @RequirePermission('stacks', PermissionAction.UPDATE)
  update(@Param('stackId') stackId: string, @Body() dto: UpdateStackDto, @Req() req: AuthenticatedRequest) {
    return this.inventory.updateStack(stackId, dto, req.user!.id);
  }
}

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('stock') @RequirePermission('inventory', PermissionAction.READ)
  list(@Query() query: ListInventoryDto) { return this.inventory.listInventory(query); }

  @Get('by-products') @RequirePermission('inventory', PermissionAction.READ)
  byProductActivity(@Query() query: ListByProductActivityDto) { return this.inventory.listByProductActivity(query); }

  @Get('packaging-stock') @RequirePermission('inventory', PermissionAction.READ)
  packagingStock(@Query() query: ListPackagingStockDto) { return this.inventory.listPackagingStock(query); }

  @Get('transactions') @RequirePermission('inventory', PermissionAction.READ)
  transactions(@Query() query: ListInventoryDto) { return this.inventory.listTransactions(query); }

  @Get('stock-counts') @RequirePermission('inventory', PermissionAction.READ)
  stockCounts(@Query() query: ListStockCountsDto) { return this.inventory.listStockCounts(query); }

  @Post('stock-counts') @RequirePermission('inventory', PermissionAction.CREATE)
  createStockCount(@Body() dto: CreateStockCountDto, @Req() req: AuthenticatedRequest) { return this.inventory.createStockCount(dto, req.user!.id); }

  @Post('stock-counts/:id/post') @RequirePermission('inventory', PermissionAction.POST)
  postStockCount(@Param('id') id: string, @Body() dto: StockCountActionDto, @Req() req: AuthenticatedRequest) { return this.inventory.postStockCount(id, dto, req.user!.id); }

  @Post('transfers') @RequirePermission('inventory', PermissionAction.POST)
  transfer(@Body() dto: CreateStockTransferDto, @Req() req: AuthenticatedRequest) { return this.inventory.createTransfer(dto, req.user!.id); }

  @Post('adjustments') @RequirePermission('inventory', PermissionAction.POST)
  adjust(@Body() dto: CreateStockAdjustmentDto, @Req() req: AuthenticatedRequest) { return this.inventory.createAdjustment(dto, req.user!.id); }
}
