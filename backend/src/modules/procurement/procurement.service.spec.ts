import { BadRequestException } from '@nestjs/common';
import { BrokerCommissionType, DocumentStatus, GateDirection, GatePurpose, GateStatus, ItemKind, PartnerType, Prisma, QualityDecision, QualitySampleStatus, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ProcurementService } from './procurement.service';

describe('ProcurementService goods receipt posting', () => {
  const receipt = {
    id: 'grn-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    status: DocumentStatus.APPROVED,
    quantity: new Prisma.Decimal('100'),
    unit: 'KG',
    destinationStackId: 'stack-1',
    purchaseOrder: {
      id: 'po-1',
      status: DocumentStatus.APPROVED,
      orderedQuantity: new Prisma.Decimal('400'),
      payableQuantityKg: new Prisma.Decimal('400'),
      itemId: 'paddy-1',
      gateEntryId: 'gate-1',
      unitRate: new Prisma.Decimal('45'),
      adjustedUnitRate: new Prisma.Decimal('45'),
    },
    destinationStack: { capacityKg: new Prisma.Decimal('1000') },
  };
  const tx: any = {
    goodsReceipt: { findFirst: jest.fn(), aggregate: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    stockMovement: { aggregate: jest.fn(), create: jest.fn() },
    purchaseOrder: { updateMany: jest.fn() },
    gateEntry: { updateMany: jest.fn() },
    auditEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn() };
  const service = new ProcurementService(prisma as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
    tx.goodsReceipt.findFirst.mockResolvedValue(receipt);
    tx.goodsReceipt.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('300') } });
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('100') } });
    tx.goodsReceipt.updateMany.mockResolvedValue({ count: 1 });
    tx.goodsReceipt.findUniqueOrThrow.mockResolvedValue({ ...receipt, status: DocumentStatus.POSTED });
    tx.stockMovement.create.mockResolvedValue({});
    tx.purchaseOrder.updateMany.mockResolvedValue({ count: 1 });
    tx.gateEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.auditEvent.create.mockResolvedValue({});
  });

  describe('ProcurementService broker commission snapshot', () => {
    const tx: any = {
      gateEntry: { findFirst: jest.fn() },
      partner: { findFirst: jest.fn() },
      item: { findFirst: jest.fn() },
      godown: { findFirst: jest.fn() },
      stack: { findFirst: jest.fn() },
      unitConversion: { findMany: jest.fn() },
      moisturePolicy: { findMany: jest.fn() },
      purchaseOrder: { create: jest.fn() },
      auditEvent: { create: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn() };
    const service = new ProcurementService(prisma as PrismaService);

    beforeEach(() => {
      jest.clearAllMocks();
      prisma.$transaction.mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx));
      tx.gateEntry.findFirst.mockResolvedValue({
        id: 'gate-1',
        status: GateStatus.RECEIVING,
        direction: GateDirection.INWARD,
        purpose: GatePurpose.PROCUREMENT,
        partnerId: 'supplier-1',
        itemId: 'paddy-1',
        weighbridgeTicket: { netWeight: new Prisma.Decimal(4000) },
        qualitySamples: [{ status: QualitySampleStatus.APPROVED, decision: QualityDecision.ACCEPT }],
      });
      tx.moisturePolicy.findMany.mockResolvedValue([]);
      tx.partner.findFirst
        .mockResolvedValueOnce({ id: 'supplier-1', type: PartnerType.SUPPLIER })
        .mockResolvedValueOnce({
          id: 'broker-1',
          commissionType: BrokerCommissionType.PER_MON,
          commissionRate: new Prisma.Decimal(10),
        });
      tx.item.findFirst.mockResolvedValue({ id: 'paddy-1', kind: ItemKind.PADDY, baseUnit: UnitOfMeasure.KG });
      tx.godown.findFirst.mockResolvedValue({ id: 'godown-1' });
      tx.stack.findFirst.mockResolvedValue({ id: 'stack-1', godownId: 'godown-1' });
      tx.unitConversion.findMany.mockResolvedValue([
        { fromUnit: UnitOfMeasure.KG, toUnit: UnitOfMeasure.MON, factor: new Prisma.Decimal('0.025') },
      ]);
      tx.purchaseOrder.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'po-1', ...data }));
      tx.auditEvent.create.mockResolvedValue({});
    });

    it('snapshots broker terms and calculates commission using the company unit conversion', async () => {
      const result = await service.createPurchaseOrder({
        companyId: 'company-1',
        factoryId: 'factory-1',
        gateEntryId: 'gate-1',
        supplierId: 'supplier-1',
        brokerId: 'broker-1',
        itemId: 'paddy-1',
        destinationGodownId: 'godown-1',
        destinationStackId: 'stack-1',
        orderNumber: 'PO-1',
        unitRate: '30',
      }, 'user-1');

      expect(tx.unitConversion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId: 'company-1', effectiveFrom: { lte: expect.any(Date) } },
      }));
      expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          payableQuantityKg: new Prisma.Decimal(4000),
          adjustedUnitRate: new Prisma.Decimal(30),
          brokerId: 'broker-1',
          brokerCommissionType: BrokerCommissionType.PER_MON,
          brokerCommissionRate: new Prisma.Decimal(10),
          brokerCommissionAmount: new Prisma.Decimal('1000.00'),
        }),
      }));
      expect(result).toEqual(expect.objectContaining({
        brokerCommissionAmount: new Prisma.Decimal('1000.00'),
      }));
    });

    it('does not require or create commission data when a purchase has no broker', async () => {
      tx.partner.findFirst.mockReset().mockResolvedValue({ id: 'supplier-1', type: PartnerType.SUPPLIER });
      const result = await service.createPurchaseOrder({
        companyId: 'company-1',
        factoryId: 'factory-1',
        gateEntryId: 'gate-1',
        supplierId: 'supplier-1',
        itemId: 'paddy-1',
        destinationGodownId: 'godown-1',
        destinationStackId: 'stack-1',
        orderNumber: 'PO-2',
        unitRate: '30',
      }, 'user-1');

      expect(tx.unitConversion.findMany).not.toHaveBeenCalled();
      expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.not.objectContaining({ brokerCommissionAmount: expect.anything() }),
      }));
      expect(result).not.toHaveProperty('brokerCommissionAmount');
    });

    it('snapshots moisture-based payable quantity separately from physical stock quantity', async () => {
      tx.gateEntry.findFirst.mockResolvedValue({
        id: 'gate-1',
        status: GateStatus.RECEIVING,
        direction: GateDirection.INWARD,
        purpose: GatePurpose.PROCUREMENT,
        partnerId: 'supplier-1',
        itemId: 'paddy-1',
        weighbridgeTicket: { netWeight: new Prisma.Decimal(4000) },
        qualitySamples: [{
          id: 'sample-1',
          sampleNumber: 'QS-1',
          status: QualitySampleStatus.APPROVED,
          decision: QualityDecision.ACCEPT,
          measurements: { moisturePct: 14.5 },
        }],
      });
      tx.partner.findFirst.mockReset().mockResolvedValue({ id: 'supplier-1', type: PartnerType.SUPPLIER });
      tx.moisturePolicy.findMany.mockResolvedValue([{
        id: 'policy-1',
        name: 'Standard paddy moisture',
        priority: 10,
        factoryId: null,
        paddyItemId: null,
        supplierPartnerId: null,
        allowedMoisturePct: new Prisma.Decimal('12'),
        tolerancePct: new Prisma.Decimal('0.5'),
        formula: 'DRY_MATTER_CORRECTION',
        rateDeductionPct: new Prisma.Decimal('2'),
        slabs: [],
      }]);

      const result = await service.createPurchaseOrder({
        companyId: 'company-1',
        factoryId: 'factory-1',
        gateEntryId: 'gate-1',
        supplierId: 'supplier-1',
        itemId: 'paddy-1',
        destinationGodownId: 'godown-1',
        destinationStackId: 'stack-1',
        orderNumber: 'PO-MOISTURE',
        unitRate: '30',
      }, 'user-1');

      expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          orderedQuantity: new Prisma.Decimal(4000),
          payableQuantityKg: new Prisma.Decimal('3908.571'),
          unitRate: new Prisma.Decimal(30),
          adjustedUnitRate: new Prisma.Decimal('29.4'),
          qualitySampleId: 'sample-1',
          moisturePolicyId: 'policy-1',
          moisturePolicyName: 'Standard paddy moisture',
          moistureReceivedPct: new Prisma.Decimal('14.5'),
          moistureAllowedPct: new Prisma.Decimal(12),
          moistureTolerancePct: new Prisma.Decimal('0.5'),
          moistureDifferencePct: new Prisma.Decimal(2),
          moistureDeductionFormula: 'DRY_MATTER_CORRECTION',
          moistureDeductionPct: new Prisma.Decimal('2.2857'),
          moistureDeductionQuantityKg: new Prisma.Decimal('91.429'),
          moistureRateDeductionPct: new Prisma.Decimal(2),
        }),
      }));
      expect(result.orderedQuantity).toEqual(new Prisma.Decimal(4000));
      expect(result.payableQuantityKg).toEqual(new Prisma.Decimal('3908.571'));
    });

    it('blocks measured-moisture purchases without a matching active policy', async () => {
      tx.gateEntry.findFirst.mockResolvedValue({
        id: 'gate-1',
        status: GateStatus.RECEIVING,
        direction: GateDirection.INWARD,
        purpose: GatePurpose.PROCUREMENT,
        partnerId: 'supplier-1',
        itemId: 'paddy-1',
        weighbridgeTicket: { netWeight: new Prisma.Decimal(4000) },
        qualitySamples: [{
          id: 'sample-1',
          status: QualitySampleStatus.APPROVED,
          decision: QualityDecision.ACCEPT,
          measurements: { moisturePct: 13 },
        }],
      });
      tx.partner.findFirst.mockReset().mockResolvedValue({ id: 'supplier-1', type: PartnerType.SUPPLIER });
      tx.moisturePolicy.findMany.mockResolvedValue([]);
      await expect(service.createPurchaseOrder({
        companyId: 'company-1',
        factoryId: 'factory-1',
        gateEntryId: 'gate-1',
        supplierId: 'supplier-1',
        itemId: 'paddy-1',
        destinationGodownId: 'godown-1',
        destinationStackId: 'stack-1',
        orderNumber: 'PO-NO-POLICY',
        unitRate: '30',
      }, 'user-1')).rejects.toThrow('no active applicable moisture policy');
      expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('blocks equally prioritized matching moisture policies instead of choosing arbitrarily', async () => {
      tx.gateEntry.findFirst.mockResolvedValue({
        id: 'gate-1',
        status: GateStatus.RECEIVING,
        direction: GateDirection.INWARD,
        purpose: GatePurpose.PROCUREMENT,
        partnerId: 'supplier-1',
        itemId: 'paddy-1',
        weighbridgeTicket: { netWeight: new Prisma.Decimal(4000) },
        qualitySamples: [{
          id: 'sample-1',
          status: QualitySampleStatus.APPROVED,
          decision: QualityDecision.ACCEPT,
          measurements: { moisturePct: 13 },
        }],
      });
      tx.partner.findFirst.mockReset().mockResolvedValue({ id: 'supplier-1', type: PartnerType.SUPPLIER });
      tx.moisturePolicy.findMany.mockResolvedValue([
        { id: 'policy-1', priority: 10, factoryId: null, paddyItemId: null, supplierPartnerId: null },
        { id: 'policy-2', priority: 10, factoryId: 'factory-1', paddyItemId: null, supplierPartnerId: null },
      ]);

      await expect(service.createPurchaseOrder({
        companyId: 'company-1',
        factoryId: 'factory-1',
        gateEntryId: 'gate-1',
        supplierId: 'supplier-1',
        itemId: 'paddy-1',
        destinationGodownId: 'godown-1',
        destinationStackId: 'stack-1',
        orderNumber: 'PO-TIED-POLICY',
        unitRate: '30',
      }, 'user-1')).rejects.toThrow('share the highest priority');
      expect(tx.purchaseOrder.create).not.toHaveBeenCalled();
    });
  });

  it('posts a GRN, stock movement, and final gate completion atomically', async () => {
    const result = await service.postGoodsReceipt('grn-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
    }, 'user-1');

    expect(result.status).toBe(DocumentStatus.POSTED);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itemId: 'paddy-1',
        stackId: 'stack-1',
        type: 'RECEIPT',
        quantity: new Prisma.Decimal('100'),
        sourceType: 'GOODS_RECEIPT',
        sourceId: 'grn-1',
      }),
    });
    expect(tx.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 'po-1', status: DocumentStatus.APPROVED },
      data: { status: DocumentStatus.POSTED },
    });
    expect(tx.gateEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'gate-1', companyId: 'company-1', factoryId: 'factory-1', status: GateStatus.RECEIVING },
      data: expect.objectContaining({ status: GateStatus.COMPLETED, completedAt: expect.any(Date) }),
    });
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(2);
  });

  it('does not post stock when stack capacity is insufficient', async () => {
    tx.stockMovement.aggregate.mockResolvedValue({ _sum: { quantity: new Prisma.Decimal('950') } });
    await expect(service.postGoodsReceipt('grn-1', {
      companyId: 'company-1',
      factoryId: 'factory-1',
    }, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.goodsReceipt.updateMany).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });
});
