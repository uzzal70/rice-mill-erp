import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequireAllPermissions, RequirePermission } from '../../common/authz';
import { CreateByProductDto, CreateItemDto, CreatePackagingDto, ItemFinancialDto, ListItemsDto, UpdateItemDto, UpdatePackagingSpecDto } from './items.dto';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get() @RequirePermission('items', PermissionAction.READ) list(@Query() query: ListItemsDto) { return this.items.list(query); }
  @Post('by-products') @RequireAllPermissions({ resource: 'items', action: PermissionAction.CREATE }, { resource: 'items', action: PermissionAction.VIEW_FINANCIAL })
  createByProduct(@Body() dto: CreateByProductDto, @Req() req: AuthenticatedRequest) { return this.items.createByProduct(dto, req.user!.id); }
  @Post('packaging') @RequireAllPermissions({ resource: 'items', action: PermissionAction.CREATE }, { resource: 'items', action: PermissionAction.VIEW_FINANCIAL })
  createPackaging(@Body() dto: CreatePackagingDto, @Req() req: AuthenticatedRequest) { return this.items.createPackaging(dto, req.user!.id); }
  @Get(':id/reference-prices') @RequirePermission('items', PermissionAction.VIEW_FINANCIAL) getFinancial(@Param('id') id: string, @Query('companyId') companyId: string) { return this.items.getFinancial(id, companyId); }
  @Get(':id') @RequirePermission('items', PermissionAction.READ) get(@Param('id') id: string, @Query('companyId') companyId: string) { return this.items.get(id, companyId); }
  @Post() @RequirePermission('items', PermissionAction.CREATE) create(@Body() dto: CreateItemDto, @Req() req: AuthenticatedRequest) { return this.items.create(dto, req.user!.id); }
  @Patch(':id') @RequirePermission('items', PermissionAction.UPDATE) update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Req() req: AuthenticatedRequest) { return this.items.update(id, dto, req.user!.id); }
  @Put(':id/reference-prices') @RequireAllPermissions({ resource: 'items', action: PermissionAction.UPDATE }, { resource: 'items', action: PermissionAction.VIEW_FINANCIAL })
  updateFinancial(@Param('id') id: string, @Body() dto: ItemFinancialDto, @Req() req: AuthenticatedRequest) { return this.items.updateFinancial(id, dto, req.user!.id); }
  @Put(':id/packaging') @RequirePermission('items', PermissionAction.UPDATE)
  updatePackaging(@Param('id') id: string, @Body() dto: UpdatePackagingSpecDto, @Req() req: AuthenticatedRequest) { return this.items.updatePackaging(id, dto, req.user!.id); }
}
