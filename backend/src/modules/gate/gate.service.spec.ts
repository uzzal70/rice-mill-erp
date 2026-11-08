import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GateStatus, QualityDecision, QualitySampleStatus } from '@prisma/client';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { PrismaService } from '../../common/prisma.service';
import { GateService, calculateNetWeight } from './gate.service';

describe('gate weighbridge calculations and workflow', () => {
  const entry = {
    id: 'gate-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    status: GateStatus.ENTRY,
  };
  const ticket = { id: 'ticket-1', gateEntryId: entry.id, ticketNumber: 'WB-1', netWeight: '13650' };
  const tx: any = {
    gateEntry: { findFirst: jest.fn(), updateMany: jest.fn() },
    vehicle: { findFirst: jest.fn(), update: jest.fn() },
    weighbridgeTicket: { create: jest.fn() },
    qualitySample: { findFirst: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), count: jest.fn() },
    auditEvent: { create: jest.fn() },
    gateAttachment: { create: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((callback: (transaction: unknown) => unknown) => callback(tx)),
    gateEntry: { findFirst: jest.fn() },
    gateAttachment: { findFirst: jest.fn() },
    vehicle: { findFirst: jest.fn() },
    factory: { findFirst: jest.fn() },
  };
  const service = new GateService(prisma as PrismaService);
  let attachmentDirectory: string;
  const originalAttachmentDirectory = process.env.GATE_ATTACHMENT_DIR;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.gateEntry.findFirst.mockResolvedValue(entry);
    tx.gateEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.weighbridgeTicket.create.mockResolvedValue(ticket);
    tx.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-1', companyId: 'company-1', vehicleNumber: 'DHAKA-METRO-11-1234', driverName: 'Rahim' });
    tx.vehicle.update.mockResolvedValue({ id: 'vehicle-1', vehicleNumber: 'DHAKA-METRO-11-1234', registrationNumber: null, active: false });
    tx.qualitySample.count.mockResolvedValue(0);
    tx.auditEvent.create.mockResolvedValue({});
    tx.qualitySample.findFirst.mockReset();
  });

  afterEach(async () => {
    if (attachmentDirectory) await rm(attachmentDirectory, { recursive: true, force: true });
    if (originalAttachmentDirectory === undefined) delete process.env.GATE_ATTACHMENT_DIR;
    else process.env.GATE_ATTACHMENT_DIR = originalAttachmentDirectory;
  });

  it('calculates net weight with decimal-safe subtraction', () => {
    expect(calculateNetWeight('24150.125', '10500.125').toString()).toBe('13650');
  });

  it('rejects invalid weights instead of storing a negative or zero net quantity', () => {
    expect(() => calculateNetWeight('100', '100')).toThrow(BadRequestException);
    expect(() => calculateNetWeight('99', '100')).toThrow(BadRequestException);
    expect(() => calculateNetWeight('100', '-1')).toThrow(BadRequestException);
  });

  it('records an immutable ticket and advances the gate entry through weighing to quality', async () => {
    const result = await service.createWeighbridgeTicket('gate-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      ticketNumber: 'wb-1',
      grossWeight: '24150',
      tareWeight: '10500',
      firstWeightAt: '2026-10-31T10:00:00.000Z',
      secondWeightAt: '2026-10-31T10:10:00.000Z',
    }, 'operator-1');

    expect(result).toBe(ticket);
    expect(tx.gateEntry.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'gate-1', companyId: 'company-1', factoryId: 'factory-1', status: GateStatus.ENTRY },
      data: { status: GateStatus.WEIGHING },
    });
    expect(tx.gateEntry.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'gate-1', status: GateStatus.WEIGHING },
      data: { status: GateStatus.QUALITY },
    });
    const storedTicket = tx.weighbridgeTicket.create.mock.calls[0][0].data;
    expect(storedTicket).toMatchObject({ gateEntryId: 'gate-1', ticketNumber: 'WB-1' });
    expect(storedTicket.netWeight.toString()).toBe('13650');
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(2);
  });

  it('rejects weights captured out of time order before opening a transaction', async () => {
    await expect(service.createWeighbridgeTicket('gate-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      ticketNumber: 'wb-1',
      grossWeight: '24150',
      tareWeight: '10500',
      firstWeightAt: '2026-10-31T10:10:00.000Z',
      secondWeightAt: '2026-10-31T10:00:00.000Z',
    }, 'operator-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores verified gate attachments outside the database and audits metadata', async () => {
    attachmentDirectory = await mkdtemp(path.join(os.tmpdir(), 'rice-mill-gate-'));
    process.env.GATE_ATTACHMENT_DIR = attachmentDirectory;
    prisma.gateEntry.findFirst.mockResolvedValue({ id: 'gate-1' });
    const fileBuffer = Buffer.from('%PDF-1.7\nchallan');
    const stored = { id: 'attachment-1', gateEntryId: 'gate-1', fileName: 'challan.pdf', mimeType: 'application/pdf', sizeBytes: fileBuffer.length };
    tx.gateAttachment.create.mockResolvedValue(stored);

    const result = await service.addGateAttachment('gate-1', { companyId: 'company-1', factoryId: 'factory-1' }, {
      originalname: '../challan.pdf',
      mimetype: 'application/pdf',
      size: fileBuffer.length,
      buffer: fileBuffer,
    } as Express.Multer.File, 'operator-1');

    const storedRow = tx.gateAttachment.create.mock.calls[0][0].data;
    expect(result).toBe(stored);
    expect(storedRow.fileName).toBe('challan.pdf');
    expect(storedRow.storageKey).toMatch(/^[a-f0-9-]+\.pdf$/);
    expect(await readFile(path.join(attachmentDirectory, storedRow.storageKey))).toEqual(fileBuffer);
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ATTACHMENT_ADDED', resource: 'gate', resourceId: 'attachment-1' }),
    }));
  });

  it('rejects mismatched attachment content types and company/factory cross-scope access', async () => {
    const fileBuffer = Buffer.from('not a pdf');
    await expect(service.addGateAttachment('gate-1', { companyId: 'company-1', factoryId: 'factory-1' }, {
      originalname: 'challan.pdf',
      mimetype: 'application/pdf',
      size: fileBuffer.length,
      buffer: fileBuffer,
    } as Express.Multer.File, 'operator-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.gateEntry.findFirst).not.toHaveBeenCalled();

    prisma.gateAttachment.findFirst.mockResolvedValue(null);
    await expect(service.getGateAttachment('gate-1', 'attachment-foreign', {
      companyId: 'company-1',
      factoryId: 'factory-1',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.gateAttachment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attachment-foreign', gateEntryId: 'gate-1', companyId: 'company-1', factoryId: 'factory-1' },
    }));
  });

  it('updates and audits vehicle details, including explicitly cleared optional fields', async () => {
    const updated = await service.updateVehicle('vehicle-1', {
      companyId: 'company-1',
      vehicleNumber: 'dhaka-metro-11-1234',
      registrationNumber: null,
      driverName: 'Rahim',
      active: false,
    }, 'operator-1');

    expect(updated).toMatchObject({ id: 'vehicle-1', active: false });
    expect(tx.vehicle.update).toHaveBeenCalledWith({
      where: { companyId_id: { companyId: 'company-1', id: 'vehicle-1' } },
      data: { vehicleNumber: 'DHAKA-METRO-11-1234', registrationNumber: null, driverName: 'Rahim', active: false },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resource: 'vehicles', action: 'UPDATE', resourceId: 'vehicle-1' }),
    }));
  });

  it('includes linked and unregistered same-plate gate visits in scoped vehicle movement history', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-1', vehicleNumber: 'DHAKA-METRO-11-1234' });
    prisma.factory.findFirst.mockResolvedValue({ id: 'factory-1' });
    prisma.gateEntry.findMany = jest.fn().mockResolvedValue([]);
    prisma.gateEntry.count = jest.fn().mockResolvedValue(0);
    prisma.$transaction.mockImplementationOnce((queries: Promise<unknown>[]) => Promise.all(queries));

    const result = await service.listVehicleMovements('vehicle-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      page: 1,
      pageSize: 25,
    });

    expect(result).toMatchObject({ success: true, meta: { total: 0, page: 1 } });
    expect(prisma.gateEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId: 'company-1',
        factoryId: 'factory-1',
        OR: [
          { vehicleId: 'vehicle-1' },
          { vehicleId: null, vehicleNumber: 'DHAKA-METRO-11-1234' },
        ],
      },
    }));
  });

  it('requires at least one test measurement', async () => {
    await expect(service.submitQualityResults('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
    }, 'lab-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('preserves a measured zero and rejects a second result submission', async () => {
    const sample = { id: 'sample-1', companyId: 'company-1', factoryId: 'factory-1', status: QualitySampleStatus.SAMPLE };
    tx.qualitySample.findFirst.mockResolvedValueOnce(sample).mockResolvedValueOnce({ ...sample, status: QualitySampleStatus.TESTED });
    tx.qualitySample.updateMany.mockResolvedValue({ count: 1 });
    tx.qualitySample.findUniqueOrThrow.mockResolvedValue({
      ...sample,
      status: QualitySampleStatus.TESTED,
      measurements: { moisturePct: 0, discoloredPct: 0, immaturePct: 3, chalkyPct: 4, otherPct: 2 },
    });

    await service.submitQualityResults('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      moisturePct: 0,
      discoloredPct: 0,
      immaturePct: 3,
      chalkyPct: 4,
      otherPct: 2,
    }, 'lab-1');

    expect(tx.qualitySample.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sample-1', companyId: 'company-1', factoryId: 'factory-1', status: QualitySampleStatus.SAMPLE },
      data: expect.objectContaining({
        measurements: { moisturePct: 0, discoloredPct: 0, immaturePct: 3, chalkyPct: 4, otherPct: 2 },
        status: QualitySampleStatus.TESTED,
      }),
    }));
    await expect(service.submitQualityResults('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      moisturePct: 1,
    }, 'lab-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.qualitySample.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('accepts a tested sample once, advances the gate, and locks approved results', async () => {
    const tested = {
      id: 'sample-1',
      companyId: 'company-1',
      factoryId: 'factory-1',
      gateEntryId: 'gate-1',
      status: QualitySampleStatus.TESTED,
      measurements: { moisturePct: 14.5 },
    };
    tx.qualitySample.findFirst.mockResolvedValueOnce(tested).mockResolvedValueOnce({
      ...tested,
      status: QualitySampleStatus.APPROVED,
    });
    tx.gateEntry.findFirst.mockResolvedValue({ ...entry, status: GateStatus.QUALITY });
    tx.qualitySample.updateMany.mockResolvedValue({ count: 1 });
    tx.gateEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.qualitySample.findUniqueOrThrow.mockResolvedValue({
      ...tested,
      status: QualitySampleStatus.APPROVED,
      decision: 'ACCEPT',
    });

    await service.approveQualitySample('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      decision: QualityDecision.ACCEPT,
    }, 'manager-1');

    expect(tx.qualitySample.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sample-1', companyId: 'company-1', factoryId: 'factory-1', status: QualitySampleStatus.TESTED },
      data: expect.objectContaining({ status: QualitySampleStatus.APPROVED, decision: 'ACCEPT' }),
    }));
    expect(tx.gateEntry.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'gate-1', companyId: 'company-1', factoryId: 'factory-1', status: GateStatus.QUALITY },
      data: { status: GateStatus.RECEIVING },
    });
    await expect(service.approveQualitySample('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      decision: QualityDecision.ACCEPT,
    }, 'manager-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.qualitySample.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('keeps the gate in quality while other laboratory samples are awaiting a decision', async () => {
    const tested = {
      id: 'sample-1',
      companyId: 'company-1',
      factoryId: 'factory-1',
      gateEntryId: 'gate-1',
      status: QualitySampleStatus.TESTED,
      measurements: { moisturePct: 14.5 },
    };
    tx.qualitySample.findFirst.mockResolvedValue(tested);
    tx.gateEntry.findFirst.mockResolvedValue({ ...entry, status: GateStatus.QUALITY });
    tx.qualitySample.updateMany.mockResolvedValue({ count: 1 });
    tx.qualitySample.count.mockResolvedValue(1);
    tx.qualitySample.findUniqueOrThrow.mockResolvedValue({ ...tested, status: QualitySampleStatus.APPROVED });

    await service.approveQualitySample('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      decision: QualityDecision.ACCEPT,
    }, 'manager-1');

    expect(tx.gateEntry.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.gateEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'gate-1', companyId: 'company-1', factoryId: 'factory-1', status: GateStatus.QUALITY },
      data: { status: GateStatus.QUALITY },
    });
  });

  it('rejects the gate immediately when any tested sample is rejected', async () => {
    const tested = {
      id: 'sample-1',
      companyId: 'company-1',
      factoryId: 'factory-1',
      gateEntryId: 'gate-1',
      status: QualitySampleStatus.TESTED,
      measurements: { moisturePct: 14.5 },
    };
    tx.qualitySample.findFirst.mockResolvedValue(tested);
    tx.gateEntry.findFirst.mockResolvedValue({ ...entry, status: GateStatus.QUALITY });
    tx.qualitySample.updateMany.mockResolvedValue({ count: 1 });
    tx.qualitySample.findUniqueOrThrow.mockResolvedValue({ ...tested, status: QualitySampleStatus.REJECTED });

    await service.approveQualitySample('sample-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
      decision: QualityDecision.REJECT,
    }, 'manager-1');

    expect(tx.qualitySample.count).not.toHaveBeenCalled();
    expect(tx.gateEntry.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'gate-1', companyId: 'company-1', factoryId: 'factory-1', status: GateStatus.QUALITY },
      data: { status: GateStatus.REJECTED },
    });
  });
});
