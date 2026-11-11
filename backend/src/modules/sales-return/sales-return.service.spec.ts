import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DocumentStatus,
  ItemKind,
  PartnerType,
  Prisma,
  SalesReturnCondition,
  SalesReturnSettlement,
  SalesReturnType,
  StockMovementType,
  UnitOfMeasure,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { SalesReturnService } from './sales-return.service';

describe('SalesReturnService', () => {
  let service: SalesReturnService;
  let prisma: any;
  let tx: any;

  const activeFactory = { id: 'factory-1', companyId: 'company-1', active: true };
  const activeCustomer = { id: 'cust-1', companyId: 'company-1', name: 'Al-Madina Rice Traders', type: PartnerType.CUSTOMER, active: true };
  const activeItem = { id: 'item-1', companyId: 'company-1', name: 'Miniket Rice 50KG', kind: ItemKind.RICE, baseUnit: UnitOfMeasure.KG, active: true };
  const activeStack = { id: 'stack-1', companyId: 'company-1', factoryId: 'factory-1', code: 'ST-01', godown: { active: true } };

  beforeEach(() => {
    tx = {
      factory: { findFirst: jest.fn() },
      partner: { findFirst: jest.fn() },
      salesOrder: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      salesOrderLine: { update: jest.fn() },
      dispatch: { findFirst: jest.fn() },
      item: { findFirst: jest.fn() },
      stack: { findFirst: jest.fn() },
      salesReturn: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      stockMovement: { create: jest.fn() },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: jest.fn((callback: any) => {
        if (Array.isArray(callback)) {
          return Promise.all(callback);
        }
        return callback(tx);
      }),
      salesReturn: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new SalesReturnService(prisma as PrismaService);
  });

  describe('list', () => {
    it('returns paginated sales returns filtered by companyId and factoryId', async () => {
      prisma.salesReturn.findMany.mockResolvedValue([
        { id: 'ret-1', returnNumber: 'RET-001', totalAmount: new Prisma.Decimal('15000') },
      ]);
      prisma.salesReturn.count.mockResolvedValue(1);

      const res = await service.list({ companyId: 'company-1', factoryId: 'factory-1', page: 1, pageSize: 20 });
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });

  describe('getReturn', () => {
    it('returns a single return or throws NotFoundException', async () => {
      prisma.salesReturn.findFirst.mockResolvedValueOnce({ id: 'ret-1', returnNumber: 'RET-001' });
      const res = await service.getReturn('ret-1', 'company-1', 'factory-1');
      expect(res.data.id).toBe('ret-1');

      prisma.salesReturn.findFirst.mockResolvedValueOnce(null);
      await expect(service.getReturn('ret-99', 'company-1', 'factory-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects empty lines list', async () => {
      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            salesOrderId: 'so-1',
            customerId: 'cust-1',
            returnNumber: 'RET-001',
            type: SalesReturnType.PARTIAL,
            settlement: SalesReturnSettlement.CREDIT_NOTE,
            reason: 'Excess delivered',
            lines: [],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects return creation against unapproved order', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(activeCustomer);
      tx.salesOrder.findFirst.mockResolvedValue({
        id: 'so-1',
        orderNumber: 'SO-101',
        status: DocumentStatus.DRAFT,
        lines: [],
      });

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            salesOrderId: 'so-1',
            customerId: 'cust-1',
            returnNumber: 'RET-001',
            type: SalesReturnType.PARTIAL,
            settlement: SalesReturnSettlement.CREDIT_NOTE,
            reason: 'Quality issue',
            lines: [
              {
                salesOrderLineId: 'sol-1',
                itemId: 'item-1',
                restockStackId: 'stack-1',
                condition: SalesReturnCondition.INTACT,
                returnKg: '500',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('Sales returns can only be created against approved or fulfilled orders.');
    });

    it('rejects when return quantity exceeds fulfilled quantity for line', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(activeCustomer);
      tx.salesOrder.findFirst.mockResolvedValue({
        id: 'so-1',
        orderNumber: 'SO-101',
        status: DocumentStatus.APPROVED,
        customerId: 'cust-1',
        lines: [
          {
            id: 'sol-1',
            fulfilledKg: new Prisma.Decimal('300'),
            unitRate: new Prisma.Decimal('60'),
          },
        ],
      });

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            salesOrderId: 'so-1',
            customerId: 'cust-1',
            returnNumber: 'RET-001',
            type: SalesReturnType.PARTIAL,
            settlement: SalesReturnSettlement.CREDIT_NOTE,
            reason: 'Over order',
            lines: [
              {
                salesOrderLineId: 'sol-1',
                itemId: 'item-1',
                restockStackId: 'stack-1',
                condition: SalesReturnCondition.INTACT,
                returnKg: '500',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('exceeds fulfilled quantity');
    });

    it('successfully creates DRAFT sales return and auto-generates credit note number', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(activeCustomer);
      tx.salesOrder.findFirst.mockResolvedValue({
        id: 'so-1',
        orderNumber: 'SO-101',
        status: DocumentStatus.APPROVED,
        customerId: 'cust-1',
        lines: [
          {
            id: 'sol-1',
            fulfilledKg: new Prisma.Decimal('1000'),
            unitRate: new Prisma.Decimal('60'),
          },
        ],
      });
      tx.item.findFirst.mockResolvedValue(activeItem);
      tx.stack.findFirst.mockResolvedValue(activeStack);
      tx.salesReturn.create.mockImplementation((args: any) => ({
        id: 'ret-1',
        ...args.data,
      }));

      const res = await service.create(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          salesOrderId: 'so-1',
          customerId: 'cust-1',
          returnNumber: 'RET-001',
          type: SalesReturnType.PARTIAL,
          settlement: SalesReturnSettlement.CREDIT_NOTE,
          reason: 'Excess quantity',
          lines: [
            {
              salesOrderLineId: 'sol-1',
              itemId: 'item-1',
              restockStackId: 'stack-1',
              condition: SalesReturnCondition.INTACT,
              bagCount: 10,
              returnKg: '500',
            },
          ],
        },
        'user-1',
      );

      expect(res.id).toBe('ret-1');
      expect(res.returnNumber).toBe('RET-001');
      expect(res.creditNoteNumber).toMatch(/^CN-/);
      expect(res.totalWeightKg.toString()).toBe('500');
      expect(res.totalAmount.toString()).toBe('30000');
    });
  });

  describe('approve', () => {
    it('approves a draft sales return', async () => {
      tx.salesReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.DRAFT,
      });
      tx.salesReturn.update.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.APPROVED,
        approvedById: 'user-1',
      });

      const res = await service.approve('ret-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.APPROVED);
    });
  });

  describe('post', () => {
    it('creates positive StockMovement and posts sales return', async () => {
      tx.salesReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.APPROVED,
        settlement: SalesReturnSettlement.CREDIT_NOTE,
        salesOrderId: 'so-1',
        lines: [
          {
            id: 'ret-line-1',
            itemId: 'item-1',
            restockStackId: 'stack-1',
            condition: SalesReturnCondition.INTACT,
            returnKg: new Prisma.Decimal('500'),
            salesOrderLineId: 'sol-1',
            salesOrderLine: { fulfilledKg: new Prisma.Decimal('1000') },
          },
        ],
      });
      tx.salesReturn.update.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.POSTED,
        postedById: 'user-1',
      });

      const res = await service.post('ret-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.POSTED);
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          factoryId: 'factory-1',
          itemId: 'item-1',
          stackId: 'stack-1',
          type: StockMovementType.SALE_RETURN,
          quantity: new Prisma.Decimal('500'),
          unit: UnitOfMeasure.KG,
          sourceType: 'SALES_RETURN',
          sourceId: 'ret-line-1',
        },
      });
    });

    it('creates DAMAGE movement when condition is DAMAGED', async () => {
      tx.salesReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.APPROVED,
        settlement: SalesReturnSettlement.CREDIT_NOTE,
        salesOrderId: 'so-1',
        lines: [
          {
            id: 'ret-line-2',
            itemId: 'item-1',
            restockStackId: 'stack-1',
            condition: SalesReturnCondition.DAMAGED,
            returnKg: new Prisma.Decimal('200'),
            salesOrderLineId: 'sol-1',
            salesOrderLine: { fulfilledKg: new Prisma.Decimal('500') },
          },
        ],
      });
      tx.salesReturn.update.mockResolvedValue({ id: 'ret-1', status: DocumentStatus.POSTED });

      await service.post('ret-1', 'company-1', 'factory-1', 'user-1');
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: StockMovementType.DAMAGE,
            quantity: new Prisma.Decimal('200'),
          }),
        }),
      );
    });

    it('decrements fulfilledKg and reopens order if settlement is REPLACEMENT', async () => {
      tx.salesReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        status: DocumentStatus.APPROVED,
        settlement: SalesReturnSettlement.REPLACEMENT,
        salesOrderId: 'so-1',
        lines: [
          {
            id: 'ret-line-1',
            itemId: 'item-1',
            restockStackId: 'stack-1',
            condition: SalesReturnCondition.INTACT,
            returnKg: new Prisma.Decimal('300'),
            salesOrderLineId: 'sol-1',
            salesOrderLine: { fulfilledKg: new Prisma.Decimal('1000') },
          },
        ],
      });
      tx.salesOrder.findUnique.mockResolvedValue({ id: 'so-1', status: DocumentStatus.POSTED });
      tx.salesReturn.update.mockResolvedValue({ id: 'ret-1', status: DocumentStatus.POSTED });

      await service.post('ret-1', 'company-1', 'factory-1', 'user-1');
      expect(tx.salesOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'sol-1' },
        data: { fulfilledKg: new Prisma.Decimal('700') },
      });
      expect(tx.salesOrder.update).toHaveBeenCalledWith({
        where: { id: 'so-1' },
        data: { status: DocumentStatus.APPROVED },
      });
    });
  });

  describe('cancel', () => {
    it('cancels draft return but rejects cancelling posted return', async () => {
      tx.salesReturn.findFirst.mockResolvedValueOnce({
        id: 'ret-1',
        status: DocumentStatus.DRAFT,
      });
      tx.salesReturn.update.mockResolvedValueOnce({
        id: 'ret-1',
        status: DocumentStatus.CANCELLED,
      });

      const res = await service.cancel('ret-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.CANCELLED);

      tx.salesReturn.findFirst.mockResolvedValueOnce({
        id: 'ret-1',
        status: DocumentStatus.POSTED,
      });
      await expect(service.cancel('ret-1', 'company-1', 'factory-1', 'user-1')).rejects.toThrow(
        'Posted sales returns cannot be cancelled',
      );
    });
  });
});

