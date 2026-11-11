import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TaxType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { BangladeshService } from './bangladesh.service';

describe('BangladeshService', () => {
  let service: BangladeshService;

  const mockPrisma: any = {
    taxConfig: {
      count: jest.fn().mockResolvedValue(4),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    auditEvent: {
      create: jest.fn().mockResolvedValue({ id: 'aud-1' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BangladeshService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BangladeshService>(BangladeshService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return Bangladesh defaults: Currency BDT (৳), Units KG/MON/TON/BAG, 1 MON = 40 KG configurable', async () => {
    mockPrisma.taxConfig.count.mockResolvedValueOnce(3);
    const defaults = await service.getDefaults('c1');

    expect(defaults.currency.code).toBe('BDT');
    expect(defaults.currency.symbol).toBe('৳');
    expect(defaults.supportedUnits).toContain(UnitOfMeasure.KG);
    expect(defaults.supportedUnits).toContain(UnitOfMeasure.MON);
    expect(defaults.supportedUnits).toContain(UnitOfMeasure.TON);
    expect(defaults.supportedUnits).toContain(UnitOfMeasure.BAG);

    const monRule = defaults.defaultConversions.find((c) => c.fromUnit === UnitOfMeasure.MON);
    expect(monRule).toBeDefined();
    expect(monRule?.factor).toBe(40.0);
    expect(monRule?.isConfigurable).toBe(true);

    expect(defaults.taxSystem.supportedTypes).toEqual([TaxType.VAT, TaxType.AIT, TaxType.TDS, TaxType.VDS]);
    expect(defaults.taxSystem.effectiveDateBased).toBe(true);
  });

  it('should create a configurable tax rule with effective dates', async () => {
    const createdRule = {
      id: 'tx-1',
      companyId: 'c1',
      taxType: TaxType.AIT,
      name: 'Paddy Advance Tax 2%',
      ratePercent: new Prisma.Decimal(2.0),
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null,
      category: 'PADDY',
      sroReference: 'Sec 52 Income Tax Act 2023',
      description: 'Advance income tax on commercial grain procurement',
      active: true,
    };
    mockPrisma.taxConfig.create.mockResolvedValueOnce(createdRule);

    const result = await service.createTaxConfig(
      {
        companyId: 'c1',
        taxType: TaxType.AIT,
        name: 'Paddy Advance Tax 2%',
        ratePercent: 2.0,
        effectiveFrom: '2026-07-01',
        category: 'PADDY',
        sroReference: 'Sec 52 Income Tax Act 2023',
      },
      'usr-1',
    );

    expect(result).toBeDefined();
    expect(result.taxType).toBe(TaxType.AIT);
    expect(mockPrisma.taxConfig.create).toHaveBeenCalled();
  });

  it('should query effective tax rate considering effective dates without hardcoding', async () => {
    mockPrisma.taxConfig.findFirst.mockResolvedValueOnce({
      id: 'tx-2',
      name: 'Custom Rice Bran VAT',
      ratePercent: new Prisma.Decimal(5.0),
      sroReference: 'SRO 182-Mushak',
    });

    const rate = await service.getEffectiveTaxRate('c1', TaxType.VAT, 'BRAN', '2026-11-10');
    expect(rate.ratePercent).toBe(5.0);
    expect(rate.ruleName).toBe('Custom Rice Bran VAT');
    expect(rate.sroReference).toBe('SRO 182-Mushak');
  });

  it('should calculate dynamic taxes for VAT, AIT, TDS, VDS and compute net payable', async () => {
    // VAT 0%, TDS 2%, AIT 2%
    mockPrisma.taxConfig.findFirst
      .mockResolvedValueOnce(null) // VAT fallback
      .mockResolvedValueOnce(null) // VAT general fallback
      .mockResolvedValueOnce({ name: 'AIT 2%', ratePercent: new Prisma.Decimal(2.0) })
      .mockResolvedValueOnce({ name: 'TDS 2%', ratePercent: new Prisma.Decimal(2.0) });

    const calc = await service.calculateTaxes({
      companyId: 'c1',
      baseAmount: 100000,
      taxTypes: [TaxType.VAT, TaxType.AIT, TaxType.TDS],
      category: 'PADDY',
      asOf: '2026-11-10',
    });

    expect(calc.baseAmount).toBe(100000);
    expect(calc.lines).toHaveLength(3);
    // Base 100000 + 0 VAT - 2000 AIT - 2000 TDS = 96000 Net Payable
    expect(calc.totalVatAmount).toBe(0);
    expect(calc.totalWithholdingAmount).toBe(4000);
    expect(calc.netPayableAmount).toBe(96000);
  });
});
