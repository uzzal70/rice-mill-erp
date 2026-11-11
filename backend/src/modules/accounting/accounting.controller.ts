import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AccountSubtype, AccountType, PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateAccountDto,
  CreateJournalDto,
  GeneralLedgerQueryDto,
  ListJournalDto,
  TrialBalanceQueryDto,
  UpdateAccountDto,
} from './accounting.dto';
import { AccountingService } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // Chart of Accounts
  @Get('coa')
  @RequirePermission('accounting', PermissionAction.READ)
  listAccounts(
    @Query('companyId') companyId: string,
    @Query('type') type?: AccountType,
    @Query('subtype') subtype?: AccountSubtype,
    @Query('active') active?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.accountingService.listAccounts(companyId, type, subtype, isActive);
  }

  @Post('coa')
  @RequirePermission('accounting', PermissionAction.CREATE)
  createAccount(
    @Body() dto: CreateAccountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.createAccount(dto.companyId, dto, req.user!.id);
  }

  @Put('coa/:id')
  @RequirePermission('accounting', PermissionAction.UPDATE)
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.updateAccount(id, dto.companyId, dto, req.user!.id);
  }

  @Post('coa/seed')
  @RequirePermission('accounting', PermissionAction.CREATE)
  seedStandardCOA(
    @Body('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.seedStandardCOA(companyId, req.user!.id);
  }

  // Journals & Vouchers
  @Get('journals')
  @RequirePermission('accounting', PermissionAction.READ)
  listJournals(@Query() q: ListJournalDto) {
    return this.accountingService.listJournals(q);
  }

  @Get('journals/:id')
  @RequirePermission('accounting', PermissionAction.READ)
  getJournal(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.accountingService.getJournal(id, companyId);
  }

  @Post('journals')
  @RequirePermission('accounting', PermissionAction.CREATE)
  createJournal(
    @Body() dto: CreateJournalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.createJournal(dto, req.user!.id);
  }

  @Post('journals/:id/post')
  @RequirePermission('accounting', PermissionAction.POST)
  postJournal(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.postJournal(id, companyId, req.user!.id);
  }

  @Post('journals/:id/reverse')
  @RequirePermission('accounting', PermissionAction.POST)
  reverseJournal(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accountingService.reverseJournal(id, companyId, req.user!.id, reason);
  }

  // Financial Reports & Ledgers
  @Get('reports/gl')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getGeneralLedger(@Query() q: GeneralLedgerQueryDto) {
    return this.accountingService.getGeneralLedger(q);
  }

  @Get('reports/cash-book')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getCashBook(
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getCashBook(companyId, fromDate, toDate);
  }

  @Get('reports/bank-book')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getBankBook(
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getBankBook(companyId, fromDate, toDate);
  }

  @Get('reports/trial-balance')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getTrialBalance(@Query() q: TrialBalanceQueryDto) {
    return this.accountingService.getTrialBalance(q.companyId, q.asOfDate);
  }

  @Get('reports/pnl')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getProfitAndLoss(
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getProfitAndLoss(companyId, fromDate, toDate);
  }

  @Get('reports/balance-sheet')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getBalanceSheet(
    @Query('companyId') companyId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getBalanceSheet(companyId, asOfDate);
  }

  @Get('reports/sub-ledger/:partnerId')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getSubLedger(
    @Param('partnerId') partnerId: string,
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getSubLedger(companyId, partnerId, fromDate, toDate);
  }

  @Get('reports/cash-flow')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getCashFlow(
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getCashFlow(companyId, fromDate, toDate);
  }

  @Get('reports/ar')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getAccountsReceivable(@Query('companyId') companyId: string) {
    return this.accountingService.getAccountsReceivableReport(companyId);
  }

  @Get('reports/ap')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getAccountsPayable(@Query('companyId') companyId: string) {
    return this.accountingService.getAccountsPayableReport(companyId);
  }

  @Get('reports/due-aging')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getDueAging(
    @Query('companyId') companyId: string,
    @Query('type') type?: 'RECEIVABLE' | 'PAYABLE',
  ) {
    return this.accountingService.getDueAgingReport(companyId, type);
  }

  @Get('reports/income-expense')
  @RequirePermission('accounting', PermissionAction.VIEW_FINANCIAL)
  getIncomeExpense(
    @Query('companyId') companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getIncomeExpenseReport(companyId, fromDate, toDate);
  }
}

