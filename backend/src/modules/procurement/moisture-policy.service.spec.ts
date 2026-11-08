import { BadRequestException } from '@nestjs/common';
import { MoistureDeductionFormula, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { MoisturePolicyService } from './moisture-policy.service';

describe('MoisturePolicyService', () => {
  const tx: any = {
    moisturePolicy: { create: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new MoisturePolicyService(prisma as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.moisturePolicy.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'policy-1', ...data }));
    tx.auditEvent.create.mockResolvedValue({});
  });

  it('creates an audited policy with normalized slab thresholds', async () => {
    const policy = await service.create({
      companyId: 'company-1',
      name: ' Standard moisture ',
      active: true,
      priority: 5,
      allowedMoisturePct: '14',
      tolerancePct: '0.5',
      formula: MoistureDeductionFormula.SLAB_PERCENTAGE,
      rateDeductionPct: '1.25',
      slabs: [
        { minExcessPct: '0', deductionPct: '0' },
        { minExcessPct: '1.5', deductionPct: '2' },
      ],
    }, 'user-1');

    expect(policy).toEqual(expect.objectContaining({ id: 'policy-1', name: 'Standard moisture' }));
    expect(tx.moisturePolicy.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        companyId: 'company-1',
        allowedMoisturePct: new Prisma.Decimal(14),
        tolerancePct: new Prisma.Decimal('0.5'),
        slabs: [
          { minExcessPct: '0.0000', deductionPct: '0.0000' },
          { minExcessPct: '1.5000', deductionPct: '2.0000' },
        ],
      }),
    }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resource: 'moisture-policies', action: 'CREATE', resourceId: 'policy-1' }),
    }));
  });

  it('rejects invalid slab order and missing first threshold before persistence', async () => {
    await expect(service.create({
      companyId: 'company-1', name: 'Invalid slab order', active: true, priority: 1,
      allowedMoisturePct: '14', tolerancePct: '0', formula: MoistureDeductionFormula.SLAB_PERCENTAGE,
      rateDeductionPct: '0', slabs: [
        { minExcessPct: '0', deductionPct: '1' },
        { minExcessPct: '0', deductionPct: '2' },
      ],
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.create({
      companyId: 'company-1', name: 'Missing threshold', active: true, priority: 1,
      allowedMoisturePct: '14', tolerancePct: '0', formula: MoistureDeductionFormula.SLAB_PERCENTAGE,
      rateDeductionPct: '0', slabs: [{ minExcessPct: '1', deductionPct: '2' }],
    }, 'user-1')).rejects.toThrow('first slab must start at 0%');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
