import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateVehicleDto, CreateVehicleTripDto, CreateFuelLogDto, CreateVehicleMaintenanceDto } from './fleet.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async createVehicle(companyId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        companyId,
        vehicleNumber: dto.vehicleNumber,
      },
    });

    if (existing) {
      throw new BadRequestException(`Vehicle with number ${dto.vehicleNumber} already exists.`);
    }

    return this.prisma.vehicle.create({
      data: {
        companyId,
        vehicleNumber: dto.vehicleNumber,
        registrationNumber: dto.registrationNumber,
        vehicleType: dto.vehicleType,
        ownerName: dto.ownerName,
        driverName: dto.driverName,
        driverMobile: dto.driverMobile,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : null,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        taxTokenExpiry: dto.taxTokenExpiry ? new Date(dto.taxTokenExpiry) : null,
      },
    });
  }

  async listVehicles(companyId: string) {
    return this.prisma.vehicle.findMany({
      where: { companyId },
      include: {
        trips: {
          take: 5,
          orderBy: { tripDate: 'desc' },
        },
        fuelLogs: {
          take: 5,
          orderBy: { logDate: 'desc' },
        },
        maintenances: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTrip(companyId: string, dto: CreateVehicleTripDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { companyId, id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id ${dto.vehicleId} not found.`);
    }

    if (dto.endOdometer < dto.startOdometer) {
      throw new BadRequestException('End odometer reading must be greater than or equal to start odometer.');
    }

    const distanceKm = Number((dto.endOdometer - dto.startOdometer).toFixed(2));
    const fuelCost = dto.fuelCost ? Number(dto.fuelCost) : 0;
    const tollOtherCost = dto.tollOtherCost ? Number(dto.tollOtherCost) : 0;
    const totalTransportCost = Number((fuelCost + tollOtherCost).toFixed(2));

    const fuelCostPerKm = distanceKm > 0 ? Number((fuelCost / distanceKm).toFixed(4)) : 0;
    const transportCostPerKm = distanceKm > 0 ? Number((totalTransportCost / distanceKm).toFixed(4)) : 0;

    return this.prisma.vehicleTrip.create({
      data: {
        companyId,
        factoryId: dto.factoryId || null,
        vehicleId: dto.vehicleId,
        tripNumber: dto.tripNumber,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone || null,
        tripDate: new Date(dto.tripDate),
        origin: dto.origin,
        destination: dto.destination,
        startOdometer: new Prisma.Decimal(dto.startOdometer),
        endOdometer: new Prisma.Decimal(dto.endOdometer),
        distanceKm: new Prisma.Decimal(distanceKm),
        cargoDescription: dto.cargoDescription || null,
        cargoWeightKg: dto.cargoWeightKg ? new Prisma.Decimal(dto.cargoWeightKg) : null,
        freightAmount: new Prisma.Decimal(dto.freightAmount || 0),
        fuelCost: new Prisma.Decimal(fuelCost),
        tollOtherCost: new Prisma.Decimal(tollOtherCost),
        totalTransportCost: new Prisma.Decimal(totalTransportCost),
        fuelCostPerKm: new Prisma.Decimal(fuelCostPerKm),
        transportCostPerKm: new Prisma.Decimal(transportCostPerKm),
        status: dto.status || 'COMPLETED',
        remarks: dto.remarks || null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async listTrips(companyId: string, vehicleId?: string) {
    const where: Prisma.VehicleTripWhereInput = { companyId };
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    return this.prisma.vehicleTrip.findMany({
      where,
      include: { vehicle: true },
      orderBy: { tripDate: 'desc' },
    });
  }

  async createFuelLog(companyId: string, dto: CreateFuelLogDto) {
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { companyId, id: dto.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with id ${dto.vehicleId} not found.`);
      }
    }

    const totalCost = Number((dto.quantityLiters * dto.ratePerLiter).toFixed(2));

    return this.prisma.fuelLog.create({
      data: {
        companyId,
        factoryId: dto.factoryId || null,
        vehicleId: dto.vehicleId || null,
        machineId: dto.machineId || null,
        logDate: new Date(dto.logDate),
        fuelType: dto.fuelType || 'DIESEL',
        quantityLiters: new Prisma.Decimal(dto.quantityLiters),
        ratePerLiter: new Prisma.Decimal(dto.ratePerLiter),
        totalCost: new Prisma.Decimal(totalCost),
        odometerReading: dto.odometerReading ? new Prisma.Decimal(dto.odometerReading) : null,
        fillingStation: dto.fillingStation || null,
        invoiceOrSlipNumber: dto.invoiceOrSlipNumber || null,
        driverOrOperator: dto.driverOrOperator || null,
        remarks: dto.remarks || null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async listFuelLogs(companyId: string, vehicleId?: string) {
    const where: Prisma.FuelLogWhereInput = { companyId };
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    return this.prisma.fuelLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { logDate: 'desc' },
    });
  }

  async createMaintenance(companyId: string, dto: CreateVehicleMaintenanceDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { companyId, id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id ${dto.vehicleId} not found.`);
    }

    return this.prisma.vehicleMaintenance.create({
      data: {
        companyId,
        vehicleId: dto.vehicleId,
        maintenanceType: dto.maintenanceType || 'SERVICING',
        serviceDate: new Date(dto.serviceDate),
        odometerReading: dto.odometerReading ? new Prisma.Decimal(dto.odometerReading) : null,
        cost: new Prisma.Decimal(dto.cost),
        serviceCenter: dto.serviceCenter || null,
        description: dto.description || null,
        nextServiceDueKm: dto.nextServiceDueKm ? new Prisma.Decimal(dto.nextServiceDueKm) : null,
      },
      include: {
        vehicle: true,
      },
    });
  }

  async listMaintenance(companyId: string, vehicleId?: string) {
    const where: Prisma.VehicleMaintenanceWhereInput = { companyId };
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    return this.prisma.vehicleMaintenance.findMany({
      where,
      include: { vehicle: true },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async getFleetAnalytics(companyId: string) {
    const [trips, fuelLogs, maintenances, vehicles] = await Promise.all([
      this.prisma.vehicleTrip.findMany({ where: { companyId } }),
      this.prisma.fuelLog.findMany({ where: { companyId } }),
      this.prisma.vehicleMaintenance.findMany({ where: { companyId } }),
      this.prisma.vehicle.findMany({ where: { companyId, active: true } }),
    ]);

    const totalDistanceKm = trips.reduce((sum, t) => sum + Number(t.distanceKm), 0);
    const totalFreightRevenue = trips.reduce((sum, t) => sum + Number(t.freightAmount), 0);
    const totalTripFuelCost = trips.reduce((sum, t) => sum + Number(t.fuelCost), 0);
    const totalTransportCost = trips.reduce((sum, t) => sum + Number(t.totalTransportCost), 0);

    const totalFuelLiters = fuelLogs.reduce((sum, f) => sum + Number(f.quantityLiters), 0);
    const totalFuelExpense = fuelLogs.reduce((sum, f) => sum + Number(f.totalCost), 0);
    const totalMaintenanceExpense = maintenances.reduce((sum, m) => sum + Number(m.cost), 0);

    const avgFuelCostPerKm = totalDistanceKm > 0 ? Number((totalTripFuelCost / totalDistanceKm).toFixed(4)) : 0;
    const avgTransportCostPerKm = totalDistanceKm > 0 ? Number((totalTransportCost / totalDistanceKm).toFixed(4)) : 0;

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const complianceAlerts = vehicles.flatMap((v) => {
      const alerts: { vehicleNumber: string; type: string; expiryDate: Date; isExpired: boolean }[] = [];
      if (v.fitnessExpiry && v.fitnessExpiry <= thirtyDaysAhead) {
        alerts.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Fitness Certificate',
          expiryDate: v.fitnessExpiry,
          isExpired: v.fitnessExpiry < now,
        });
      }
      if (v.insuranceExpiry && v.insuranceExpiry <= thirtyDaysAhead) {
        alerts.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Insurance Policy',
          expiryDate: v.insuranceExpiry,
          isExpired: v.insuranceExpiry < now,
        });
      }
      if (v.taxTokenExpiry && v.taxTokenExpiry <= thirtyDaysAhead) {
        alerts.push({
          vehicleNumber: v.vehicleNumber,
          type: 'Tax Token',
          expiryDate: v.taxTokenExpiry,
          isExpired: v.taxTokenExpiry < now,
        });
      }
      return alerts;
    });

    return {
      totalVehicles: vehicles.length,
      totalTrips: trips.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalFreightRevenue: Number(totalFreightRevenue.toFixed(2)),
      totalTripFuelCost: Number(totalTripFuelCost.toFixed(2)),
      totalTransportCost: Number(totalTransportCost.toFixed(2)),
      totalFuelLiters: Number(totalFuelLiters.toFixed(2)),
      totalFuelExpense: Number(totalFuelExpense.toFixed(2)),
      totalMaintenanceExpense: Number(totalMaintenanceExpense.toFixed(2)),
      avgFuelCostPerKm,
      avgTransportCostPerKm,
      complianceAlerts,
    };
  }
}

