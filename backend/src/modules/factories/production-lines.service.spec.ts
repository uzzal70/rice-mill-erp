import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ProductionLinesService } from './production-lines.service';

describe('ProductionLinesService', () => {
  const tx = {
    factory: { findFirst: jest.fn() },
    productionLine: { create: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma = {
    factory: { findFirst: jest.fn() },
    productionLine: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new ProductionLinesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));
  });

  it('creates and audits a line scoped to the selected factory', async () => {
    tx.factory.findFirst.mockResolvedValue({ id: 'factory-a' });
    const line = { id: 'line-a', companyId: 'company-a', factoryId: 'factory-a', name: 'Line 1', code: 'LINE-1' };
    tx.productionLine.create.mockResolvedValue(line);

    await expect(service.create({
      companyId: 'company-a',
      factoryId: 'factory-a',
      name: ' Line 1 ',
      code: ' line-1 ',
    }, 'user-a')).resolves.toEqual(line);

    expect(tx.productionLine.create).toHaveBeenCalledWith({
      data: { companyId: 'company-a', factoryId: 'factory-a', name: 'Line 1', code: 'LINE-1' },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyId: 'company-a', resource: 'production-lines', action: 'CREATE' }),
    }));
  });

  it('rejects a factory that does not belong to the requested company', async () => {
    tx.factory.findFirst.mockResolvedValue(null);

    await expect(service.create({
      companyId: 'company-a',
      factoryId: 'factory-b',
      name: 'Line 1',
      code: 'LINE-1',
    }, 'user-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.productionLine.create).not.toHaveBeenCalled();
  });

  it('scopes line lists by company and factory after verifying the factory', async () => {
    prisma.factory.findFirst.mockResolvedValue({ id: 'factory-a' });
    prisma.productionLine.findMany.mockResolvedValue([]);

    await service.list({ companyId: 'company-a', factoryId: 'factory-a' });

    expect(prisma.productionLine.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { companyId: 'company-a', factoryId: 'factory-a', active: true },
    }));
  });
});
