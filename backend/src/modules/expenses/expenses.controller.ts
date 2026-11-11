import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateExpenseDto,
  ExpenseActionDto,
  ListExpenseDto,
  UpdateExpenseDto,
} from './expenses.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @RequirePermission('expenses', PermissionAction.READ)
  list(@Query() q: ListExpenseDto) {
    return this.expensesService.list(q);
  }

  @Get('summary')
  @RequirePermission('expenses', PermissionAction.READ)
  getSummary(
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.expensesService.getSummary(companyId, factoryId, fromDate, toDate);
  }

  @Get(':id')
  @RequirePermission('expenses', PermissionAction.READ)
  get(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId?: string,
  ) {
    return this.expensesService.getExpense(id, companyId, factoryId);
  }

  @Post()
  @RequirePermission('expenses', PermissionAction.CREATE)
  create(@Body() dto: CreateExpenseDto, @Req() req: AuthenticatedRequest) {
    return this.expensesService.create(dto, req.user!.id);
  }

  @Put(':id')
  @RequirePermission('expenses', PermissionAction.UPDATE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.update(id, dto, req.user!.id);
  }

  @Post(':id/submit')
  @RequirePermission('expenses', PermissionAction.CREATE)
  submit(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.submit(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/approve')
  @RequirePermission('expenses', PermissionAction.APPROVE)
  approve(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.approve(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/reject')
  @RequirePermission('expenses', PermissionAction.APPROVE)
  reject(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.reject(
      id,
      dto.companyId,
      dto.factoryId,
      req.user!.id,
      dto.reason || '',
    );
  }

  @Post(':id/post')
  @RequirePermission('expenses', PermissionAction.POST)
  post(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.post(id, dto.companyId, dto.factoryId, req.user!.id);
  }

  @Post(':id/cancel')
  @RequirePermission('expenses', PermissionAction.UPDATE)
  cancel(
    @Param('id') id: string,
    @Body() dto: ExpenseActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.cancel(
      id,
      dto.companyId,
      dto.factoryId,
      req.user!.id,
      dto.reason,
    );
  }

  @Delete(':id')
  @RequirePermission('expenses', PermissionAction.DELETE)
  delete(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.expensesService.delete(id, companyId, factoryId, req.user!.id);
  }
}

