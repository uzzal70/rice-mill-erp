import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AccessGuard } from '../../common/access.guard';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  CreateEmployeeDto,
  CreateLoanAdvanceDto,
  GeneratePayrollDto,
  RecordAttendanceDto,
  UpdateEmployeeDto,
} from './hr.dto';
import { HrService } from './hr.service';

@Controller('hr')
@UseGuards(AccessGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Post('employees')
  @RequirePermission('hr', PermissionAction.CREATE)
  createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Put('employees/:id')
  @RequirePermission('hr', PermissionAction.UPDATE)
  updateEmployee(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrService.updateEmployee(id, companyId, dto);
  }

  @Get('employees')
  @RequirePermission('hr', PermissionAction.READ)
  listEmployees(
    @Query('companyId') companyId: string,
    @Query('department') department?: string,
    @Query('active') active?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.hrService.listEmployees(companyId, department, isActive);
  }

  @Get('employees/:id')
  @RequirePermission('hr', PermissionAction.READ)
  getEmployee(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.hrService.getEmployee(id, companyId);
  }

  @Post('attendance')
  @RequirePermission('hr', PermissionAction.CREATE)
  recordAttendance(@Body() dto: RecordAttendanceDto) {
    return this.hrService.recordAttendance(dto);
  }

  @Post('loans')
  @RequirePermission('hr', PermissionAction.CREATE)
  createLoanAdvance(@Body() dto: CreateLoanAdvanceDto) {
    return this.hrService.createLoanAdvance(dto);
  }

  @Post('payroll/generate')
  @RequirePermission('hr', PermissionAction.CREATE)
  generatePayroll(
    @Body() dto: GeneratePayrollDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.hrService.generatePayroll(dto, req.user!.id);
  }

  @Post('payroll/:id/post')
  @RequirePermission('hr', PermissionAction.POST)
  postPayroll(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.hrService.postPayroll(id, companyId, req.user!.id);
  }

  @Get('payroll')
  @RequirePermission('hr', PermissionAction.READ)
  listPayrolls(
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId?: string,
  ) {
    return this.hrService.listPayrolls(companyId, factoryId);
  }
}

