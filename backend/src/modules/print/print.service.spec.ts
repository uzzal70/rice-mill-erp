import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma.service';
import { PrintDocumentType } from './print.dto';
import { PrintService } from './print.service';

describe('PrintService', () => {
  let service: PrintService;

  const mockPrisma = {
    company: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'Sonar Bangla Mill' }) },
    purchaseInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
    gateEntry: { findFirst: jest.fn().mockResolvedValue(null) },
    weighbridgeTicket: { findFirst: jest.fn().mockResolvedValue(null) },
    partner: { findFirst: jest.fn().mockResolvedValue(null) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PrintService>(PrintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all 14 document templates', () => {
    const templates = service.getTemplates();
    expect(templates).toHaveLength(14);
    const types = templates.map((t) => t.type);
    expect(types).toContain(PrintDocumentType.PURCHASE_INVOICE);
    expect(types).toContain(PrintDocumentType.PURCHASE_RECEIPT);
    expect(types).toContain(PrintDocumentType.GATE_PASS);
    expect(types).toContain(PrintDocumentType.WEIGHBRIDGE_TICKET);
    expect(types).toContain(PrintDocumentType.QUALITY_REPORT);
    expect(types).toContain(PrintDocumentType.GRN);
    expect(types).toContain(PrintDocumentType.STOCK_TRANSFER);
    expect(types).toContain(PrintDocumentType.PRODUCTION_REPORT);
    expect(types).toContain(PrintDocumentType.SALES_INVOICE);
    expect(types).toContain(PrintDocumentType.DELIVERY_CHALLAN);
    expect(types).toContain(PrintDocumentType.PAYMENT_RECEIPT);
    expect(types).toContain(PrintDocumentType.MONEY_RECEIPT);
    expect(types).toContain(PrintDocumentType.SUPPLIER_STATEMENT);
    expect(types).toContain(PrintDocumentType.CUSTOMER_STATEMENT);
  });

  it('should correctly format Bangladeshi Taka into words', () => {
    expect(service.numberToWordsBDT(0)).toBe('Taka Zero Only');
    expect(service.numberToWordsBDT(500)).toBe('Taka Five Hundred Only');
    expect(service.numberToWordsBDT(1500)).toBe('Taka One Thousand Five Hundred Only');
    expect(service.numberToWordsBDT(150000)).toBe('Taka One Lakh Fifty Thousand Only');
    expect(service.numberToWordsBDT(12500000)).toBe('Taka One Crore Twenty-Five Lakh Only');
  });

  it('should generate valid printable data for all 14 document types', async () => {
    const allTypes = Object.values(PrintDocumentType);
    for (const docType of allTypes) {
      const doc = await service.getDocumentData('c1', docType, 'sample-1');
      expect(doc).toBeDefined();
      expect(doc.documentType).toBe(docType);
      expect(doc.documentTitle).toBeTruthy();
      expect(doc.documentTitleBangla).toBeTruthy();
      expect(doc.company.name).toBeTruthy();
      expect(doc.items.length).toBeGreaterThan(0);
      expect(doc.terms.length).toBeGreaterThan(0);
      expect(doc.signatures.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should resolve real PurchaseInvoice if found in database', async () => {
    mockPrisma.purchaseInvoice.findFirst.mockResolvedValueOnce({
      id: 'inv-123',
      companyId: 'c1',
      invoiceNumber: 'PINV-001',
      invoiceDate: new Date('2026-11-10'),
      grossAmount: 100000,
      qualityDeductionAmount: 5000,
      netSupplierPayable: 95000,
      adjustedUnitRate: 38,
      physicalQuantityKg: 2631.5,
      payableQuantityKg: 2500,
      purchaseOrderId: 'PO-99',
      status: 'APPROVED',
      supplierId: 's1',
      factory: { id: 'f1', name: 'Fac 1', code: 'F1' },
      transportCost: 0,
      remarks: 'Clean paddy',
    });

    mockPrisma.partner.findFirst.mockResolvedValueOnce({
      id: 's1',
      name: 'Rahim Traders',
      code: 'SUP-01',
      phone: '01700000000',
      address: 'Naogaon',
      type: 'SUPPLIER',
    });

    const doc = await service.getDocumentData('c1', PrintDocumentType.PURCHASE_INVOICE, 'inv-123');
    expect(doc.documentNumber).toBe('PINV-001');
    expect(doc.party?.name).toBe('Rahim Traders');
    expect(doc.totals.grandTotalAmount).toBe(95000);
    expect(doc.totals.inWords).toContain('Ninety-Five Thousand');
  });
});
