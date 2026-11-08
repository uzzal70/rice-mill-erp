import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GateStatus, Prisma, QualityDecision, QualitySampleStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { PrismaService } from '../../common/prisma.service';
import {
  ApproveQualitySampleDto,
  CreateGateEntryDto,
  CreateQualitySampleDto,
  CreateVehicleDto,
  CreateWeighbridgeTicketDto,
  GateAttachmentScopeDto,
  ListGateEntriesDto,
  ListQualitySamplesDto,
  ListVehicleMovementsDto,
  ListVehiclesDto,
  SubmitQualityResultsDto,
  UpdateVehicleDto,
} from './gate.dto';

const attachmentTypes = new Map([
  ['application/pdf', { extension: 'pdf', signature: (buffer: Buffer) => buffer.subarray(0, 5).toString() === '%PDF-' }],
  ['image/jpeg', { extension: 'jpg', signature: (buffer: Buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ['image/png', { extension: 'png', signature: (buffer: Buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', signature: (buffer: Buffer) => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' }],
]);

function attachmentDirectory() {
  return path.resolve(process.env.GATE_ATTACHMENT_DIR ?? path.join(process.cwd(), 'uploads', 'gate'));
}

function cleanAttachmentName(name: string) {
  const basename = path.basename(name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
  return basename || 'attachment';
}

function getAttachmentType(file: Express.Multer.File) {
  const type = attachmentTypes.get(file.mimetype);
  if (!type || !file.buffer?.length || !type.signature(file.buffer)) {
    throw new BadRequestException('Only valid PDF, JPEG, PNG, and WebP files are accepted.');
  }
  return type;
}

export function calculateNetWeight(grossWeight: string | Prisma.Decimal, tareWeight: string | Prisma.Decimal) {
  const gross = new Prisma.Decimal(grossWeight);
  const tare = new Prisma.Decimal(tareWeight);
  if (gross.lte(0) || tare.lt(0) || gross.lte(tare)) {
    throw new BadRequestException('Gross weight must be greater than tare weight, and both weights must be nonnegative.');
  }
  return gross.minus(tare);
}

@Injectable()
export class GateService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(tx: Prisma.TransactionClient, companyId: string, userId: string, resource: string, action: string, id: string, before: unknown, after: unknown) {
    const snapshot = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.auditEvent.create({
      data: { companyId, userId, resource, action, resourceId: id, before: snapshot(before), after: snapshot(after) },
    });
  }

  async listVehicles(query: ListVehiclesDto) {
    if (query.factoryId && !(await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    }))) {
      throw new BadRequestException('Factory does not belong to this company.');
    }
    const where: Prisma.VehicleWhereInput = {
      companyId: query.companyId,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { OR: [
        { vehicleNumber: { contains: query.search, mode: 'insensitive' } },
        { registrationNumber: { contains: query.search, mode: 'insensitive' } },
        { driverName: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({ where, orderBy: { vehicleNumber: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async createVehicle(dto: CreateVehicleDto, userId: string) {
    const vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
    const vehicleType = dto.vehicleType.trim();
    if (vehicleNumber.length < 2 || vehicleType.length < 2) {
      throw new BadRequestException('Vehicle number and type must contain at least two non-space characters.');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const vehicle = await tx.vehicle.create({
          data: {
            companyId: dto.companyId,
            vehicleNumber,
            registrationNumber: dto.registrationNumber?.trim() || null,
            vehicleType,
            ownerName: dto.ownerName?.trim() || null,
            driverName: dto.driverName?.trim() || null,
            driverMobile: dto.driverMobile?.trim() || null,
            fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : null,
            insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
            taxTokenExpiry: dto.taxTokenExpiry ? new Date(dto.taxTokenExpiry) : null,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'vehicles', 'CREATE', vehicle.id, undefined, vehicle);
        return vehicle;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A vehicle with this number already exists in the company.');
      }
      throw error;
    }
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto, userId: string) {
    const changedFields = Object.keys(dto).filter(key => key !== 'companyId');
    if (!changedFields.length) throw new BadRequestException('Provide at least one vehicle field to update.');
    if (dto.vehicleNumber !== undefined && dto.vehicleNumber.trim().length < 2) {
      throw new BadRequestException('Vehicle number must contain at least two non-space characters.');
    }
    if (dto.vehicleType !== undefined && dto.vehicleType.trim().length < 2) {
      throw new BadRequestException('Vehicle type must contain at least two non-space characters.');
    }

    try {
      return await this.prisma.$transaction(async tx => {
        const before = await tx.vehicle.findFirst({ where: { id, companyId: dto.companyId } });
        if (!before) throw new NotFoundException('Vehicle not found.');

        const data: Prisma.VehicleUpdateInput = {};
        if (dto.vehicleNumber !== undefined) data.vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
        if (dto.registrationNumber !== undefined) data.registrationNumber = dto.registrationNumber?.trim() || null;
        if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType.trim();
        if (dto.ownerName !== undefined) data.ownerName = dto.ownerName?.trim() || null;
        if (dto.driverName !== undefined) data.driverName = dto.driverName?.trim() || null;
        if (dto.driverMobile !== undefined) data.driverMobile = dto.driverMobile?.trim() || null;
        if (dto.fitnessExpiry !== undefined) data.fitnessExpiry = dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : null;
        if (dto.insuranceExpiry !== undefined) data.insuranceExpiry = dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null;
        if (dto.taxTokenExpiry !== undefined) data.taxTokenExpiry = dto.taxTokenExpiry ? new Date(dto.taxTokenExpiry) : null;
        if (dto.active !== undefined) data.active = dto.active;

        const after = await tx.vehicle.update({
          where: { companyId_id: { companyId: dto.companyId, id } },
          data,
        });
        await this.audit(tx, dto.companyId, userId, 'vehicles', 'UPDATE', id, before, after);
        return after;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A vehicle with this number already exists in the company.');
      }
      throw error;
    }
  }

  async listVehicleMovements(id: string, query: ListVehicleMovementsDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId: query.companyId },
      select: { id: true, vehicleNumber: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found.');
    if (query.factoryId && !(await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId },
      select: { id: true },
    }))) {
      throw new BadRequestException('Factory does not belong to this company.');
    }

    const where: Prisma.GateEntryWhereInput = {
      companyId: query.companyId,
      OR: [
        { vehicleId: vehicle.id },
        { vehicleId: null, vehicleNumber: vehicle.vehicleNumber },
      ],
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.gateEntry.findMany({
        where,
        select: {
          id: true,
          gateNumber: true,
          direction: true,
          purpose: true,
          status: true,
          enteredAt: true,
          completedAt: true,
          factory: { select: { id: true, name: true, code: true } },
        },
        orderBy: { enteredAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.gateEntry.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async listGateEntries(query: ListGateEntriesDto) {
    const where: Prisma.GateEntryWhereInput = {
      companyId: query.companyId,
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.direction ? { direction: query.direction } : {}),
      ...(query.search ? { OR: [
        { gateNumber: { contains: query.search, mode: 'insensitive' } },
        { vehicleNumber: { contains: query.search, mode: 'insensitive' } },
        { challanNumber: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.gateEntry.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, type: true } },
          item: { select: { id: true, name: true } },
          weighbridgeTicket: true,
          qualitySamples: { orderBy: { createdAt: 'desc' } },
          attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true }, orderBy: { createdAt: 'asc' } },
        },
        orderBy: { enteredAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.gateEntry.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async getGateEntry(id: string, companyId: string, factoryId: string) {
    const entry = await this.prisma.gateEntry.findFirst({
      where: { id, companyId, factoryId },
      include: { vehicle: true, partner: true, item: true, weighbridgeTicket: true, qualitySamples: { orderBy: { createdAt: 'asc' } }, attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, uploadedById: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!entry) throw new NotFoundException('Gate entry not found.');
    return entry;
  }

  async addGateAttachment(id: string, scope: GateAttachmentScopeDto, file: Express.Multer.File, userId: string) {
    if (!file) throw new BadRequestException('Select a file to attach.');
    if (file.buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Attachment size must not exceed 10 MB.');
    const type = getAttachmentType(file);
    const entry = await this.prisma.gateEntry.findFirst({
      where: { id, companyId: scope.companyId, factoryId: scope.factoryId },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException('Gate entry not found in this factory.');

    const storageKey = `${randomUUID()}.${type.extension}`;
    const directory = attachmentDirectory();
    const filePath = path.join(directory, storageKey);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(filePath, file.buffer, { flag: 'wx', mode: 0o600 });

    try {
      return await this.prisma.$transaction(async tx => {
        const attachment = await tx.gateAttachment.create({
          data: {
            companyId: scope.companyId,
            factoryId: scope.factoryId,
            gateEntryId: id,
            fileName: cleanAttachmentName(file.originalname),
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: file.buffer.length,
            uploadedById: userId,
          },
          select: { id: true, gateEntryId: true, fileName: true, mimeType: true, sizeBytes: true, uploadedById: true, createdAt: true },
        });
        await this.audit(tx, scope.companyId, userId, 'gate', 'ATTACHMENT_ADDED', attachment.id, undefined, attachment);
        return attachment;
      });
    } catch (error) {
      await rm(filePath, { force: true });
      throw error;
    }
  }

  async getGateAttachment(id: string, attachmentId: string, scope: GateAttachmentScopeDto) {
    const attachment = await this.prisma.gateAttachment.findFirst({
      where: { id: attachmentId, gateEntryId: id, companyId: scope.companyId, factoryId: scope.factoryId },
    });
    if (!attachment || path.basename(attachment.storageKey) !== attachment.storageKey) {
      throw new NotFoundException('Gate attachment not found.');
    }
    const filePath = path.join(attachmentDirectory(), attachment.storageKey);
    try {
      const content = await readFile(filePath);
      if (content.length !== attachment.sizeBytes) throw new Error('Stored attachment size does not match its metadata.');
      return { attachment, content };
    } catch {
      throw new InternalServerErrorException('The stored gate attachment is unavailable.');
    }
  }

  async createGateEntry(dto: CreateGateEntryDto, userId: string) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: dto.factoryId, companyId: dto.companyId, active: true },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');

    let vehicleNumber = dto.vehicleNumber?.trim().toUpperCase();
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, companyId: dto.companyId, active: true },
        select: { vehicleNumber: true },
      });
      if (!vehicle) throw new BadRequestException('Select an active vehicle belonging to this company.');
      if (vehicleNumber && vehicleNumber !== vehicle.vehicleNumber) throw new BadRequestException('Vehicle number does not match the selected vehicle.');
      vehicleNumber = vehicle.vehicleNumber;
    }
    if (!vehicleNumber) throw new BadRequestException('Provide a vehicle number or select a registered vehicle.');

    if (dto.partnerId && !(await this.prisma.partner.findFirst({ where: { id: dto.partnerId, companyId: dto.companyId }, select: { id: true } }))) {
      throw new BadRequestException('Partner does not belong to this company.');
    }
    if (dto.itemId && !(await this.prisma.item.findFirst({ where: { id: dto.itemId, companyId: dto.companyId }, select: { id: true } }))) {
      throw new BadRequestException('Item does not belong to this company.');
    }

    try {
      return await this.prisma.$transaction(async tx => {
        const entry = await tx.gateEntry.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            gateNumber: dto.gateNumber.trim().toUpperCase(),
            direction: dto.direction,
            purpose: dto.purpose,
            vehicleId: dto.vehicleId,
            vehicleNumber,
            driverName: dto.driverName?.trim() || null,
            driverMobile: dto.driverMobile?.trim() || null,
            partnerId: dto.partnerId,
            itemId: dto.itemId,
            challanNumber: dto.challanNumber?.trim() || null,
            referenceNumber: dto.referenceNumber?.trim() || null,
            remarks: dto.remarks?.trim() || null,
            enteredAt: dto.enteredAt ? new Date(dto.enteredAt) : new Date(),
            createdById: userId,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'gate', 'CREATE', entry.id, undefined, entry);
        return entry;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A gate entry with this number already exists in the company.');
      }
      throw error;
    }
  }

  async createWeighbridgeTicket(gateEntryId: string, dto: CreateWeighbridgeTicketDto, operatorId: string) {
    const netWeight = calculateNetWeight(dto.grossWeight, dto.tareWeight);
    const firstWeightAt = new Date(dto.firstWeightAt);
    const secondWeightAt = new Date(dto.secondWeightAt);
    if (firstWeightAt.getTime() > secondWeightAt.getTime()) {
      throw new BadRequestException('First weight time must be earlier than or equal to second weight time.');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const entry = await tx.gateEntry.findFirst({
          where: { id: gateEntryId, companyId: dto.companyId, factoryId: dto.factoryId },
        });
        if (!entry) throw new NotFoundException('Gate entry not found in this factory.');
        if (entry.status !== GateStatus.ENTRY) throw new ConflictException('This gate entry is not ready for weighing.');
        const started = await tx.gateEntry.updateMany({
          where: { id: entry.id, companyId: dto.companyId, factoryId: dto.factoryId, status: GateStatus.ENTRY },
          data: { status: GateStatus.WEIGHING },
        });
        if (started.count !== 1) throw new ConflictException('Gate entry changed while weighing was being recorded.');
        const ticket = await tx.weighbridgeTicket.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            gateEntryId: entry.id,
            ticketNumber: dto.ticketNumber.trim().toUpperCase(),
            grossWeight: new Prisma.Decimal(dto.grossWeight),
            tareWeight: new Prisma.Decimal(dto.tareWeight),
            netWeight,
            firstWeightAt,
            secondWeightAt,
            isManual: true,
            remarks: dto.remarks?.trim() || null,
            operatorId,
          },
        });
        const qualityStage = await tx.gateEntry.updateMany({
          where: { id: entry.id, status: GateStatus.WEIGHING },
          data: { status: GateStatus.QUALITY },
        });
        if (qualityStage.count !== 1) throw new ConflictException('Gate entry could not advance to quality inspection.');
        const after = { ...entry, status: GateStatus.QUALITY, weighbridgeTicket: ticket };
        await this.audit(tx, dto.companyId, operatorId, 'gate', 'WEIGHED', entry.id, entry, after);
        await this.audit(tx, dto.companyId, operatorId, 'weighbridge', 'CREATE', ticket.id, undefined, ticket);
        return ticket;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This gate entry already has a weighbridge ticket or the ticket number is already in use.');
      }
      throw error;
    }
  }

  async createQualitySample(gateEntryId: string, dto: CreateQualitySampleDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const entry = await tx.gateEntry.findFirst({
          where: { id: gateEntryId, companyId: dto.companyId, factoryId: dto.factoryId },
        });
        if (!entry) throw new NotFoundException('Gate entry not found in this factory.');
        if (entry.status !== GateStatus.QUALITY) throw new ConflictException('Quality samples can only be added while the gate entry is in quality inspection.');
        const sample = await tx.qualitySample.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            gateEntryId: entry.id,
            sampleNumber: dto.sampleNumber.trim().toUpperCase(),
            sampleType: dto.sampleType,
            sampledById: userId,
          },
        });
        await this.audit(tx, dto.companyId, userId, 'quality', 'SAMPLE_CREATED', sample.id, undefined, sample);
        return sample;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A quality sample with this number already exists in the company.');
      }
      throw error;
    }
  }

  async listQualitySamples(query: ListQualitySamplesDto) {
    const where: Prisma.QualitySampleWhereInput = {
      companyId: query.companyId,
      ...(query.factoryId ? { factoryId: query.factoryId } : {}),
      ...(query.sampleType ? { sampleType: query.sampleType } : {}),
      ...(query.search ? { OR: [
        { sampleNumber: { contains: query.search, mode: 'insensitive' } },
        { gateEntry: { gateNumber: { contains: query.search, mode: 'insensitive' } } },
        { gateEntry: { vehicleNumber: { contains: query.search, mode: 'insensitive' } } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.qualitySample.findMany({
        where,
        include: {
          gateEntry: {
            select: {
              id: true,
              gateNumber: true,
              vehicleNumber: true,
              direction: true,
              purpose: true,
              enteredAt: true,
              partner: { select: { name: true, type: true } },
              item: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.qualitySample.count({ where }),
    ]);
    return { success: true, data, meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async submitQualityResults(id: string, dto: SubmitQualityResultsDto, userId: string) {
    const { companyId, factoryId, comments, ...fields } = dto;
    const measurements = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    if (Object.keys(measurements).length === 0) throw new BadRequestException('Provide at least one quality measurement.');
    return this.prisma.$transaction(async tx => {
      const sample = await tx.qualitySample.findFirst({ where: { id, companyId, factoryId } });
      if (!sample) throw new NotFoundException('Quality sample not found in this factory.');
      if (sample.status !== QualitySampleStatus.SAMPLE) throw new ConflictException('Results can only be recorded once for an untested sample.');
      const updated = await tx.qualitySample.updateMany({
        where: { id, companyId, factoryId, status: QualitySampleStatus.SAMPLE },
        data: {
          measurements: measurements as Prisma.InputJsonObject,
          comments: comments?.trim() || null,
          status: QualitySampleStatus.TESTED,
          testedById: userId,
          testedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new ConflictException('Quality sample changed while results were being recorded.');
      const after = await tx.qualitySample.findUniqueOrThrow({ where: { id } });
      await this.audit(tx, companyId, userId, 'quality', 'RESULTS_RECORDED', id, sample, after);
      return after;
    });
  }

  async approveQualitySample(id: string, dto: ApproveQualitySampleDto, userId: string) {
    return this.prisma.$transaction(async tx => {
      const sample = await tx.qualitySample.findFirst({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId },
      });
      if (!sample) throw new NotFoundException('Quality sample not found in this factory.');
      if (sample.status !== QualitySampleStatus.TESTED) throw new ConflictException('Only tested quality samples can be approved.');
      const entry = await tx.gateEntry.findFirst({
        where: { id: sample.gateEntryId, companyId: dto.companyId, factoryId: dto.factoryId },
      });
      if (!entry || entry.status !== GateStatus.QUALITY) throw new ConflictException('Gate entry is no longer awaiting a quality decision.');
      const newStatus = dto.decision === QualityDecision.ACCEPT ? QualitySampleStatus.APPROVED : QualitySampleStatus.REJECTED;
      const sampleUpdate = await tx.qualitySample.updateMany({
        where: { id, companyId: dto.companyId, factoryId: dto.factoryId, status: QualitySampleStatus.TESTED },
        data: { status: newStatus, decision: dto.decision, comments: dto.comments?.trim() || sample.comments, approvedById: userId, approvedAt: new Date() },
      });
      if (sampleUpdate.count !== 1) throw new ConflictException('Quality sample changed while its decision was being recorded.');
      const gateLock = await tx.gateEntry.updateMany({
        where: { id: entry.id, companyId: dto.companyId, factoryId: dto.factoryId, status: GateStatus.QUALITY },
        data: { status: GateStatus.QUALITY },
      });
      if (gateLock.count !== 1) throw new ConflictException('Gate entry changed while the quality decision was being recorded.');
      const pendingSamples = dto.decision === QualityDecision.ACCEPT
        ? await tx.qualitySample.count({
          where: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            gateEntryId: entry.id,
            id: { not: id },
            status: { in: [QualitySampleStatus.SAMPLE, QualitySampleStatus.TESTED] },
          },
        })
        : 0;
      const gateStatus = dto.decision === QualityDecision.REJECT
        ? GateStatus.REJECTED
        : pendingSamples > 0 ? GateStatus.QUALITY : GateStatus.RECEIVING;
      if (gateStatus !== entry.status) {
        const gateUpdate = await tx.gateEntry.updateMany({
          where: { id: entry.id, companyId: dto.companyId, factoryId: dto.factoryId, status: GateStatus.QUALITY },
          data: { status: gateStatus },
        });
        if (gateUpdate.count !== 1) throw new ConflictException('Gate entry changed while the quality decision was being recorded.');
      }
      const updatedSample = await tx.qualitySample.findUniqueOrThrow({ where: { id } });
      const updatedEntry = { ...entry, status: gateStatus };
      await this.audit(tx, dto.companyId, userId, 'quality', 'DECISION_RECORDED', id, sample, updatedSample);
      await this.audit(tx, dto.companyId, userId, 'gate', 'QUALITY_DECISION', entry.id, entry, updatedEntry);
      return updatedSample;
    });
  }

  async completeGateEntry(id: string, companyId: string, factoryId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const entry = await tx.gateEntry.findFirst({ where: { id, companyId, factoryId } });
      if (!entry) throw new NotFoundException('Gate entry not found in this factory.');
      if (entry.status !== GateStatus.RECEIVING) throw new ConflictException('Only an accepted gate entry can be completed.');
      const completedAt = new Date();
      const updated = await tx.gateEntry.updateMany({
        where: { id, companyId, factoryId, status: GateStatus.RECEIVING },
        data: { status: GateStatus.COMPLETED, completedAt },
      });
      if (updated.count !== 1) throw new ConflictException('Gate entry changed while completion was being recorded.');
      const after = { ...entry, status: GateStatus.COMPLETED, completedAt };
      await this.audit(tx, companyId, userId, 'gate', 'COMPLETE', id, entry, after);
      return after;
    });
  }
}
