import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AccessGuard } from '../../common/access.guard';
import { RequirePermission } from '../../common/authz';
import {
  CompleteMaintenanceTicketDto,
  CreateMachineDto,
  CreateMaintenanceTicketDto,
  RecordMachineLogDto,
} from './machines.dto';
import { MachinesService } from './machines.service';

@Controller('machines')
@UseGuards(AccessGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  @RequirePermission('production', PermissionAction.CREATE)
  createMachine(@Body() dto: CreateMachineDto) {
    return this.machinesService.createMachine(dto);
  }

  @Get()
  @RequirePermission('production', PermissionAction.READ)
  listMachines(
    @Query('companyId') companyId: string,
    @Query('factoryId') factoryId?: string,
    @Query('machineType') machineType?: string,
    @Query('status') status?: string,
  ) {
    return this.machinesService.listMachines(companyId, factoryId, machineType, status);
  }

  @Get(':id')
  @RequirePermission('production', PermissionAction.READ)
  getMachine(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.machinesService.getMachine(id, companyId);
  }

  @Post('logs')
  @RequirePermission('production', PermissionAction.CREATE)
  recordMachineLog(@Body() dto: RecordMachineLogDto) {
    return this.machinesService.recordMachineLog(dto);
  }

  @Post('maintenance')
  @RequirePermission('production', PermissionAction.CREATE)
  createMaintenanceTicket(@Body() dto: CreateMaintenanceTicketDto) {
    return this.machinesService.createMaintenanceTicket(dto);
  }

  @Post('maintenance/:id/complete')
  @RequirePermission('production', PermissionAction.UPDATE)
  completeMaintenanceTicket(
    @Param('id') id: string,
    @Body('companyId') companyId: string,
    @Body() dto: CompleteMaintenanceTicketDto,
  ) {
    return this.machinesService.completeMaintenanceTicket(id, companyId, dto);
  }
}

