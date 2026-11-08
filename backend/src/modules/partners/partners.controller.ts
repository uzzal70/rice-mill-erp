import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequireAllPermissions, RequirePermission } from '../../common/authz';
import { CreateBrokerDto, CreatePartnerDto, ListPartnerLedgerDto, ListPartnersDto, PartnerFinancialDto, UpdatePartnerDto } from './partners.dto';
import { PartnersService } from './partners.service';
import { Req } from '@nestjs/common';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get() @RequirePermission('partners', PermissionAction.READ) list(@Query() query: ListPartnersDto) { return this.partners.list(query); }
  @Get(':id/ledger') @RequirePermission('partners', PermissionAction.VIEW_FINANCIAL)
  ledger(@Param('id') id: string, @Query() query: ListPartnerLedgerDto) { return this.partners.listLedger(id, query); }
  @Get(':id/customer-ledger') @RequirePermission('partners', PermissionAction.VIEW_FINANCIAL)
  customerLedger(@Param('id') id: string, @Query() query: ListPartnerLedgerDto) { return this.partners.listCustomerLedger(id, query); }
  @Get(':id/financial') @RequirePermission('partners', PermissionAction.VIEW_FINANCIAL) getFinancial(@Param('id') id: string, @Query('companyId') companyId: string) { return this.partners.getFinancial(id, companyId); }
  @Get(':id') @RequirePermission('partners', PermissionAction.READ) get(@Param('id') id: string, @Query('companyId') companyId: string) { return this.partners.get(id, companyId); }
  @Post('brokers') @RequireAllPermissions({ resource: 'partners', action: PermissionAction.CREATE }, { resource: 'partners', action: PermissionAction.VIEW_FINANCIAL })
  createBroker(@Body() dto: CreateBrokerDto, @Req() req: AuthenticatedRequest) { return this.partners.createBroker(dto, req.user!.id); }
  @Post() @RequirePermission('partners', PermissionAction.CREATE) create(@Body() dto: CreatePartnerDto, @Req() req: AuthenticatedRequest) { return this.partners.create(dto, req.user!.id); }
  @Patch(':id') @RequirePermission('partners', PermissionAction.UPDATE) update(@Param('id') id: string, @Body() dto: UpdatePartnerDto, @Req() req: AuthenticatedRequest) { return this.partners.update(id, dto, req.user!.id); }
  @Put(':id/financial') @RequireAllPermissions({ resource: 'partners', action: PermissionAction.UPDATE }, { resource: 'partners', action: PermissionAction.VIEW_FINANCIAL })
  updateFinancial(@Param('id') id: string, @Body() dto: PartnerFinancialDto, @Req() req: AuthenticatedRequest) { return this.partners.updateFinancial(id, dto, req.user!.id); }
}
