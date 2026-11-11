import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { FleetService } from './fleet.service';

describe('FleetService', () => {
  let service: FleetService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      vehicle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      vehicleTrip: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      fuelLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      vehicleMaintenance: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new FleetService(prisma as PrismaService);
  });

  describe('createVehicle', () => {
    it('creates a vehicle if not exists', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockImplementation((args: any) => Promise.resolve({ id: 'v-1', ...args.data }));

      const res = await service.createVehicle('comp-1', {
        vehicleNumber: 'DHAKA-METRO-TA-11-1234',
        vehicleType: 'TRUCK_10_TON',
        driverName: 'Abdul Karim',
      });

      expect(res.vehicleNumber).toBe('DHAKA-METRO-TA-11-1234');
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('throws BadRequestException if vehicle already exists', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', vehicleNumber: 'DHAKA-METRO-TA-11-1234' });

      await expect(
        service.createVehicle('comp-1', {
          vehicleNumber: 'DHAKA-METRO-TA-11-1234',
          vehicleType: 'TRUCK_10_TON',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTrip', () => {
    it('calculates distance, fuelCostPerKm, and transportCostPerKm accurately', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', vehicleNumber: 'DHAKA-METRO-TA-11-1234' });
      prisma.vehicleTrip.create.mockImplementation((args: any) => Promise.resolve({ id: 'trip-1', ...args.data }));

      const res = await service.createTrip('comp-1', {
        vehicleId: 'v-1',
        tripNumber: 'TRIP-2026-001',
        driverName: 'Abdul Karim',
        tripDate: '2026-11-10',
        origin: 'Dinajpur Mill',
        destination: 'Dhaka Badamtoli',
        startOdometer: 10000,
        endOdometer: 10400, // 400 KM
        cargoDescription: 'Miniket 50kg Bags',
        cargoWeightKg: 15000,
        freightAmount: 35000,
        fuelCost: 10000,
        tollOtherCost: 2000,
      });

      expect(prisma.vehicleTrip.create).toHaveBeenCalled();
      const createData = prisma.vehicleTrip.create.mock.calls[0][0].data;

      // Distance = 10400 - 10000 = 400 KM
      expect(createData.distanceKm).toEqual(new Prisma.Decimal(400));
      // Total transport cost = fuelCost (10000) + tollOtherCost (2000) = 12000
      expect(createData.totalTransportCost).toEqual(new Prisma.Decimal(12000));
      // Fuel cost / km = 10000 / 400 = 25.0000
      expect(createData.fuelCostPerKm).toEqual(new Prisma.Decimal(25));
      // Transport cost / km = 12000 / 400 = 30.0000
      expect(createData.transportCostPerKm).toEqual(new Prisma.Decimal(30));
    });

    it('throws BadRequestException if endOdometer is lower than startOdometer', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });

      await expect(
        service.createTrip('comp-1', {
          vehicleId: 'v-1',
          tripNumber: 'TRIP-002',
          driverName: 'Karim',
          tripDate: '2026-11-10',
          origin: 'A',
          destination: 'B',
          startOdometer: 10500,
          endOdometer: 10200,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFuelLog', () => {
    it('calculates total fuel cost from quantity and ratePerLiter', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.fuelLog.create.mockImplementation((args: any) => Promise.resolve({ id: 'fl-1', ...args.data }));

      await service.createFuelLog('comp-1', {
        vehicleId: 'v-1',
        logDate: '2026-11-10',
        fuelType: 'DIESEL',
        quantityLiters: 120,
        ratePerLiter: 108.5,
        fillingStation: 'Padma Oil Depo',
      });

      expect(prisma.fuelLog.create).toHaveBeenCalled();
      const createData = prisma.fuelLog.create.mock.calls[0][0].data;
      // 120 * 108.5 = 13020.00
      expect(createData.totalCost).toEqual(new Prisma.Decimal(13020));
    });
  });

  describe('createMaintenance', () => {
    it('creates maintenance record for vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.vehicleMaintenance.create.mockImplementation((args: any) => Promise.resolve({ id: 'vm-1', ...args.data }));

      const res = await service.createMaintenance('comp-1', {
        vehicleId: 'v-1',
        maintenanceType: 'ENGINE_OIL_CHANGE',
        serviceDate: '2026-11-10',
        cost: 8500,
        serviceCenter: 'Navana Workshop',
      });

      expect(prisma.vehicleMaintenance.create).toHaveBeenCalled();
    });
  });

  describe('getFleetAnalytics', () => {
    it('aggregates fleet metrics and returns compliance alerts', async () => {
      prisma.vehicleTrip.findMany.mockResolvedValue([
        {
          distanceKm: new Prisma.Decimal(400),
          freightAmount: new Prisma.Decimal(35000),
          fuelCost: new Prisma.Decimal(10000),
          totalTransportCost: new Prisma.Decimal(12000),
        },
        {
          distanceKm: new Prisma.Decimal(600),
          freightAmount: new Prisma.Decimal(50000),
          fuelCost: new Prisma.Decimal(15000),
          totalTransportCost: new Prisma.Decimal(18000),
        },
      ]);

      prisma.fuelLog.findMany.mockResolvedValue([
        { quantityLiters: new Prisma.Decimal(250), totalCost: new Prisma.Decimal(27125) },
      ]);

      prisma.vehicleMaintenance.findMany.mockResolvedValue([
        { cost: new Prisma.Decimal(15000) },
      ]);

      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 10);

      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'v-1',
          vehicleNumber: 'DHAKA-METRO-111',
          fitnessExpiry: nearDate,
          insuranceExpiry: null,
          taxTokenExpiry: null,
        },
      ]);

      const stats = await service.getFleetAnalytics('comp-1');

      expect(stats.totalTrips).toBe(2);
      expect(stats.totalDistanceKm).toBe(1000); // 400 + 600
      expect(stats.totalFreightRevenue).toBe(85000);
      expect(stats.totalTransportCost).toBe(30000);
      // avg fuel cost per km: 25000 / 1000 = 25
      expect(stats.avgFuelCostPerKm).toBe(25);
      // avg transport cost per km: 30000 / 1000 = 30
      expect(stats.avgTransportCostPerKm).toBe(30);
      expect(stats.complianceAlerts.length).toBe(1);
      expect(stats.complianceAlerts[0].vehicleNumber).toBe('DHAKA-METRO-111');
      expect(stats.complianceAlerts[0].isExpired).toBe(false);
    });
  });
});

