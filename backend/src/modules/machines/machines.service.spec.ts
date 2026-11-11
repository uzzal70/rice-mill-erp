import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { MachinesService } from './machines.service';

describe('MachinesService', () => {
  let service: MachinesService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      machine: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      machineLog: {
        create: jest.fn(),
      },
      machineMaintenance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      machine: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      machineLog: {
        create: jest.fn(),
      },
      machineMaintenance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new MachinesService(prisma as PrismaService);
  });

  describe('createMachine', () => {
    it('creates a new machine registry', async () => {
      prisma.machine.findUnique.mockResolvedValue(null);
      prisma.machine.create.mockImplementation((args: any) => Promise.resolve({ id: 'm-1', ...args.data }));

      const res = await service.createMachine({
        companyId: 'comp-1',
        factoryId: 'fact-1',
        code: 'MILL-01',
        name: 'Satake Auto Mill',
        machineType: 'RICE_MILL',
        capacity: '10 Ton/Hour',
      });

      expect(res).toBeDefined();
      expect(res.code).toBe('MILL-01');
      expect(res.name).toBe('Satake Auto Mill');
    });

    it('throws ConflictException on duplicate machine code in factory', async () => {
      prisma.machine.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createMachine({
          companyId: 'comp-1',
          factoryId: 'fact-1',
          code: 'MILL-01',
          name: 'Satake Auto Mill',
          machineType: 'RICE_MILL',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordMachineLog', () => {
    it('records run hours and increments totalRunHours', async () => {
      tx.machine.findFirst.mockResolvedValue({
        id: 'm-1',
        totalRunHours: new Prisma.Decimal(120),
      });
      tx.machineLog.create.mockImplementation((args: any) => Promise.resolve({ id: 'log-1', ...args.data }));
      tx.machine.update.mockResolvedValue({});

      const res = await service.recordMachineLog({
        companyId: 'comp-1',
        factoryId: 'fact-1',
        machineId: 'm-1',
        logDate: '2026-11-01',
        startHours: 120,
        endHours: 128.5,
        energyOrFuelConsumed: 45,
        operatorName: 'Salam',
      });

      expect(res).toBeDefined();
      expect(Number(res.runHours)).toBe(8.5);
      expect(tx.machine.update).toHaveBeenCalled();
      const updateArgs = tx.machine.update.mock.calls[0][0];
      expect(Number(updateArgs.data.totalRunHours)).toBe(128.5);
    });

    it('rejects log if endHours < startHours', async () => {
      await expect(
        service.recordMachineLog({
          companyId: 'comp-1',
          factoryId: 'fact-1',
          machineId: 'm-1',
          logDate: '2026-11-01',
          startHours: 120,
          endHours: 110,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createMaintenanceTicket & completeMaintenanceTicket', () => {
    it('creates breakdown ticket, calculates total cost, and sets machine status to BREAKDOWN', async () => {
      tx.machine.findFirst.mockResolvedValue({ id: 'm-1', status: 'OPERATIONAL' });
      tx.machineMaintenance.create.mockImplementation((args: any) => Promise.resolve({ id: 'ticket-1', ...args.data }));
      tx.machine.update.mockResolvedValue({});

      const res = await service.createMaintenanceTicket({
        companyId: 'comp-1',
        factoryId: 'fact-1',
        machineId: 'm-1',
        type: 'BREAKDOWN',
        title: 'Main Roller Bearing Failure',
        startDate: '2026-11-02',
        labourCost: 2000,
        spareParts: [
          { partName: 'Bearing SKF 6208', quantity: 2, unitCost: 1500 },
          { partName: 'Rubber Polish Belt', quantity: 1, unitCost: 800 },
        ],
      });

      expect(res).toBeDefined();
      expect(Number(res.labourCost)).toBe(2000);
      expect(Number(res.sparePartsCost)).toBe(3800); // 3000 + 800
      expect(Number(res.totalCost)).toBe(5800); // 2000 + 3800
      expect(tx.machine.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { status: 'BREAKDOWN' },
      });
    });

    it('completes ticket and restores machine status to OPERATIONAL', async () => {
      tx.machineMaintenance.findFirst.mockResolvedValue({
        id: 'ticket-1',
        machineId: 'm-1',
        status: 'IN_PROGRESS',
      });
      tx.machineMaintenance.update.mockResolvedValue({ id: 'ticket-1', status: 'COMPLETED' });
      tx.machine.update.mockResolvedValue({});

      const res = await service.completeMaintenanceTicket('ticket-1', 'comp-1', {
        completedDate: '2026-11-03',
        nextServiceDueDate: '2027-02-01',
      });

      expect(res.status).toBe('COMPLETED');
      expect(tx.machine.update).toHaveBeenCalled();
      const mUpdateArgs = tx.machine.update.mock.calls[0][0];
      expect(mUpdateArgs.data.status).toBe('OPERATIONAL');
      expect(mUpdateArgs.data.nextServiceDate).toEqual(new Date('2027-02-01'));
    });
  });
});

