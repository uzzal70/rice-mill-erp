import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AccessGuard } from '../../common/access.guard';
import { RequirePermission } from '../../common/authz';
import {
  CreateFuelLogDto,
  CreateVehicleDto,
  CreateVehicleMaintenanceDto,
  CreateVehicleTripDto,
} from './fleet.dto';
import { FleetService } from './fleet.service';

@Controller('fleet')
@UseGuards(AccessGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post('vehicles')
  @RequirePermission('inventory', PermissionAction.CREATE)
  createVehicle(
    @Query('companyId') companyId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.fleetService.createVehicle(companyId, dto);
  }

  @Get('vehicles')
  @RequirePermission('inventory', PermissionAction.READ)
  listVehicles(@Query('companyId') companyId: string) {
    return this.fleetService.listVehicles(companyId);
  }

  @Post('trips')
  @RequirePermission('inventory', PermissionAction.CREATE)
  createTrip(
    @Query('companyId') companyId: string,
    @Body() dto: CreateVehicleTripDto,
  ) {
    return this.fleetService.createTrip(companyId, dto);
  }

  @Get('trips')
  @RequirePermission('inventory', PermissionAction.READ)
  listTrips(
    @Query('companyId') companyId: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fleetService.listTrips(companyId, vehicleId);
  }

  @Post('fuel-logs')
  @RequirePermission('inventory', PermissionAction.CREATE)
  createFuelLog(
    @Query('companyId') companyId: string,
    @Body() dto: CreateFuelLogDto,
  ) {
    return this.fleetService.createFuelLog(companyId, dto);
  }

  @Get('fuel-logs')
  @RequirePermission('inventory', PermissionAction.READ)
  listFuelLogs(
    @Query('companyId') companyId: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fleetService.listFuelLogs(companyId, vehicleId);
  }

  @Post('maintenance')
  @RequirePermission('inventory', PermissionAction.CREATE)
  createMaintenance(
    @Query('companyId') companyId: string,
    @Body() dto: CreateVehicleMaintenanceDto,
  ) {
    return this.fleetService.createMaintenance(companyId, dto);
  }

  @Get('maintenance')
  @RequirePermission('inventory', PermissionAction.READ)
  listMaintenance(
    @Query('companyId') companyId: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fleetService.listMaintenance(companyId, vehicleId);
  }

  @Get('analytics')
  @RequirePermission('inventory', PermissionAction.READ)
  getFleetAnalytics(@Query('companyId') companyId: string) {
    return this.fleetService.getFleetAnalytics(companyId);
  }
}

