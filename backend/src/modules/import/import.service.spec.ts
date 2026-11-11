import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma.service';
import { ImportEntityType } from './import.dto';
import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;

  const mockPrisma: any = {
    partner: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    item: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    employee: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    auditEvent: { create: jest.fn().mockResolvedValue({ id: 'aud-1' }) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return templates for all 7 entities: Suppliers, Customers, Paddy, Rice, Opening Stock, Opening Balance, Employees', () => {
    const templates = service.getTemplates();
    expect(templates).toHaveLength(7);
    const types = templates.map((t) => t.entityType);
    expect(types).toContain(ImportEntityType.SUPPLIERS);
    expect(types).toContain(ImportEntityType.CUSTOMERS);
    expect(types).toContain(ImportEntityType.PADDY);
    expect(types).toContain(ImportEntityType.RICE);
    expect(types).toContain(ImportEntityType.OPENING_STOCK);
    expect(types).toContain(ImportEntityType.OPENING_BALANCE);
    expect(types).toContain(ImportEntityType.EMPLOYEES);
  });

  it('should generate CSV headers and sample data for download', () => {
    const csv = service.getTemplateCsv(ImportEntityType.SUPPLIERS);
    expect(csv).toContain('code,name');
    expect(csv).toContain('SUP-101');
  });

  it('should validate records and report valid, invalid, and specific field errors', async () => {
    const rows = [
      { code: 'SUP-01', name: 'Valid Supplier', phone: '01711' },
      { code: '', name: 'Missing Code Supplier' },
      { code: 'SUP-01', name: 'Duplicate Code Supplier' }, // duplicate code
    ];

    const result = await service.validateRows({
      companyId: 'c1',
      entityType: ImportEntityType.SUPPLIERS,
      rows,
    });

    expect(result.totalRecords).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(2);

    expect(result.records[0].isValid).toBe(true);
    expect(result.records[1].isValid).toBe(false);
    expect(result.records[1].errors[0].field).toBe('code');
    expect(result.records[2].isValid).toBe(false);
    expect(result.records[2].errors[0].message).toContain('Duplicate code');
  });

  it('should commit valid records in an audited transaction', async () => {
    const records = [
      { code: 'SUP-10', name: 'Supplier Ten' },
      { code: 'SUP-11', name: 'Supplier Eleven' },
    ];

    const res = await service.commitRecords(
      {
        companyId: 'c1',
        entityType: ImportEntityType.SUPPLIERS,
        records,
      },
      'usr-1',
    );

    expect(res.success).toBe(true);
    expect(res.importedCount).toBe(2);
    expect(mockPrisma.partner.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditEvent.create).toHaveBeenCalled();
  });
});

