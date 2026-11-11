import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CompleteMaintenanceTicketDto,
  CreateMachineDto,
  CreateMaintenanceTicketDto,
  RecordMachineLogDto,
} from './machines.dto';

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Machine Master
  async createMachine(dto: CreateMachineDto) {
    const existing = await this.prisma.machine.findUnique({
      where: {
        companyId_factoryId_code: {
          companyId: dto.companyId,
          factoryId: dto.factoryId,
          code: dto.code,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Machine code ${dto.code} already exists in this factory`);
    }

    return this.prisma.machine.create({
      data: {
        companyId: dto.companyId,
        factoryId: dto.factoryId,
        productionLineId: dto.productionLineId,
        code: dto.code,
        name: dto.name,
        machineType: dto.machineType,
        brand: dto.brand,
        modelNumber: dto.modelNumber,
        capacity: dto.capacity,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseCost: dto.purchaseCost ? new Prisma.Decimal(dto.purchaseCost) : null,
        serviceIntervalHours: dto.serviceIntervalHours ? new Prisma.Decimal(dto.serviceIntervalHours) : null,
      },
    });
  }

  // 2. List Machines
  async listMachines(companyId: string, factoryId?: string, machineType?: string, status?: string) {
    const machines = await this.prisma.machine.findMany({
      where: {
        companyId,
        ...(factoryId ? { factoryId } : {}),
        ...(machineType ? { machineType } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        productionLine: { select: { id: true, name: true, code: true } },
      },
      orderBy: { code: 'asc' },
    });

    const now = new Date();

    return machines.map((m) => {
      const isServiceDue = m.nextServiceDate ? new Date(m.nextServiceDate) <= now : false;
      return {
        ...m,
        isServiceDue,
      };
    });
  }

  // 3. Get Machine Detail
  async getMachine(id: string, companyId: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, companyId },
      include: {
        productionLine: true,
        logs: { take: 30, orderBy: { logDate: 'desc' } },
        maintenances: {
          include: { spareParts: true },
          orderBy: { startDate: 'desc' },
          take: 20,
        },
      },
    });
    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }
    return machine;
  }

  // 4. Record Machine Run Hours & Energy Log
  async recordMachineLog(dto: RecordMachineLogDto) {
    if (dto.endHours < dto.startHours) {
      throw new BadRequestException('End hours cannot be less than start hours');
    }

    const runHoursNum = dto.endHours - dto.startHours;
    const runHoursDecimal = new Prisma.Decimal(runHoursNum.toFixed(2));
    const logDate = new Date(dto.logDate);

    return this.prisma.$transaction(async (tx) => {
      const machine = await tx.machine.findFirst({
        where: { id: dto.machineId, companyId: dto.companyId },
      });
      if (!machine) {
        throw new NotFoundException(`Machine ${dto.machineId} not found`);
      }

      const log = await tx.machineLog.create({
        data: {
          companyId: dto.companyId,
          factoryId: dto.factoryId,
          machineId: dto.machineId,
          logDate,
          startHours: new Prisma.Decimal(dto.startHours),
          endHours: new Prisma.Decimal(dto.endHours),
          runHours: runHoursDecimal,
          energyOrFuelConsumed: dto.energyOrFuelConsumed ? new Prisma.Decimal(dto.energyOrFuelConsumed) : null,
          operatorName: dto.operatorName,
          remarks: dto.remarks,
        },
      });

      // Update machine total hours
      const newTotal = Number(machine.totalRunHours) + runHoursNum;
      await tx.machine.update({
        where: { id: machine.id },
        data: {
          totalRunHours: new Prisma.Decimal(newTotal.toFixed(2)),
        },
      });

      return log;
    });
  }

  // 5. Create Maintenance / Breakdown Ticket
  async createMaintenanceTicket(dto: CreateMaintenanceTicketDto) {
    return this.prisma.$transaction(async (tx) => {
      const machine = await tx.machine.findFirst({
        where: { id: dto.machineId, companyId: dto.companyId },
      });
      if (!machine) {
        throw new NotFoundException(`Machine ${dto.machineId} not found`);
      }

      let sparePartsTotal = 0;
      const sparePartsCreate = [];

      if (dto.spareParts && dto.spareParts.length > 0) {
        for (const sp of dto.spareParts) {
          const itemCost = sp.quantity * sp.unitCost;
          sparePartsTotal += itemCost;
          sparePartsCreate.push({
            partName: sp.partName,
            partNumber: sp.partNumber,
            quantity: new Prisma.Decimal(sp.quantity),
            unitCost: new Prisma.Decimal(sp.unitCost),
            totalCost: new Prisma.Decimal(itemCost.toFixed(2)),
          });
        }
      }

      const labourCostNum = dto.labourCost || 0;
      const totalCostNum = labourCostNum + sparePartsTotal;

      const ticket = await tx.machineMaintenance.create({
        data: {
          companyId: dto.companyId,
          factoryId: dto.factoryId,
          machineId: dto.machineId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          startDate: new Date(dto.startDate),
          technicianName: dto.technicianName,
          status: 'IN_PROGRESS',
          labourCost: new Prisma.Decimal(labourCostNum.toFixed(2)),
          sparePartsCost: new Prisma.Decimal(sparePartsTotal.toFixed(2)),
          totalCost: new Prisma.Decimal(totalCostNum.toFixed(2)),
          spareParts: { create: sparePartsCreate },
        },
        include: { spareParts: true },
      });

      // Update machine status
      const newStatus = dto.type === 'BREAKDOWN' ? 'BREAKDOWN' : 'UNDER_MAINTENANCE';
      await tx.machine.update({
        where: { id: machine.id },
        data: { status: newStatus },
      });

      return ticket;
    });
  }

  // 6. Complete Maintenance Ticket
  async completeMaintenanceTicket(id: string, companyId: string, dto: CompleteMaintenanceTicketDto) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.machineMaintenance.findFirst({
        where: { id, companyId },
        include: { machine: true },
      });
      if (!ticket) {
        throw new NotFoundException(`Maintenance ticket ${id} not found`);
      }
      if (ticket.status === 'COMPLETED') {
        throw new ConflictException(`Maintenance ticket is already completed`);
      }

      const completedDate = new Date(dto.completedDate);
      const nextDue = dto.nextServiceDueDate ? new Date(dto.nextServiceDueDate) : null;

      const updatedTicket = await tx.machineMaintenance.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedDate,
          nextServiceDueDate: nextDue,
          ...(dto.additionalLabourCost
            ? {
                labourCost: { increment: new Prisma.Decimal(dto.additionalLabourCost) },
                totalCost: { increment: new Prisma.Decimal(dto.additionalLabourCost) },
              }
            : {}),
        },
      });

      // Restore machine to operational and update service dates
      await tx.machine.update({
        where: { id: ticket.machineId },
        data: {
          status: 'OPERATIONAL',
          lastServiceDate: completedDate,
          ...(nextDue ? { nextServiceDate: nextDue } : {}),
        },
      });

      return updatedTicket;
    });
  }
}

