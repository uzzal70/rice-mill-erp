import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, Prisma, StockMovementType, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { DispatchService } from './dispatch.service';

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: any;
  let tx: any;

  const activeFactory = { id: 'factory-1', companyId: 'company-1', active: true };
  const activeRiceItem = {
    id: 'item-rice-1',
    companyId: 'company-1',
    name: 'Miniket Rice 50KG',
    kind: ItemKind.RICE,
    baseUnit: UnitOfMeasure.KG,
    active: true,
  };
  const activeStack = {
    id: 'stack-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    code: 'ST-01',
    godown: { active: true },
  };

  const approvedOrder = {
    id: 'so-1',
    companyId: 'company-1',
    factoryId: 'factory-1',
    customerId: 'cust-1',
    orderNumber: 'SO-101',
    status: DocumentStatus.APPROVED,
    lines: [
      {
        id: 'sol-1',
        salesOrderId: 'so-1',
        itemId: 'item-rice-1',
        stackId: 'stack-1',
        quantityKg: new Prisma.Decimal('1000.000'),
        fulfilledKg: new Prisma.Decimal('0.000'),
        unitRate: new Prisma.Decimal('65.0000'),
        lineAmount: new Prisma.Decimal('65000.00'),
      },
    ],
    customer: { id: 'cust-1', name: 'Rahim Traders' },
  };

  beforeEach(() => {
    tx = {
      factory: { findFirst: jest.fn() },
      salesOrder: { findFirst: jest.fn(), update: jest.fn() },
      salesOrderLine: { findMany: jest.fn(), update: jest.fn() },
      item: { findFirst: jest.fn() },
      stack: { findFirst: jest.fn() },
      dispatch: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      stockMovement: {
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation((cb: (t: any) => any) => cb(tx)),
      dispatch: tx.dispatch,
    };

    service = new DispatchService(prisma as PrismaService);
  });

  describe('Create Dispatch', () => {
    it('creates a draft dispatch document with Delivery Challan and Gate Pass numbers', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.salesOrder.findFirst.mockResolvedValue(approvedOrder);
      tx.item.findFirst.mockResolvedValue(activeRiceItem);
      tx.stack.findFirst.mockResolvedValue(activeStack);
      tx.dispatch.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'disp-1', ...args.data }),
      );

      const result = await service.create(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          salesOrderId: 'so-1',
          challanNumber: 'DC-2026-001',
          gatePassNumber: 'GP-2026-001',
          vehicleNumber: 'DHAKA METRO-TA-11-2233',
          driverName: 'Abdul Kashem',
          driverMobile: '01711223344',
          lines: [
            {
              salesOrderLineId: 'sol-1',
              itemId: 'item-rice-1',
              stackId: 'stack-1',
              bagCount: 10,
              netWeightKg: '500.000',
            },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(tx.dispatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            challanNumber: 'DC-2026-001',
            gatePassNumber: 'GP-2026-001',
            totalBags: 10,
            totalWeightKg: new Prisma.Decimal('500.000'),
          }),
        }),
      );
      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            resource: 'dispatch',
          }),
        }),
      );
    });

    it('rejects dispatch creation against draft or cancelled sales orders', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.salesOrder.findFirst.mockResolvedValue({
        ...approvedOrder,
        status: DocumentStatus.DRAFT,
      });

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            salesOrderId: 'so-1',
            challanNumber: 'DC-2026-002',
            gatePassNumber: 'GP-2026-002',
            vehicleNumber: 'DHAKA METRO-TA-11-2233',
            driverName: 'Abdul Kashem',
            lines: [
              {
                salesOrderLineId: 'sol-1',
                itemId: 'item-rice-1',
                stackId: 'stack-1',
                netWeightKg: '500.000',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('Dispatches can only be created against APPROVED sales orders.');
    });

    it('rejects dispatch if dispatched weight exceeds unfulfilled order quantity', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      // order line quantity is 1000, fulfilled is 800 -> remaining 200
      tx.salesOrder.findFirst.mockResolvedValue({
        ...approvedOrder,
        lines: [
          {
            ...approvedOrder.lines[0],
            quantityKg: new Prisma.Decimal('1000'),
            fulfilledKg: new Prisma.Decimal('800'),
          },
        ],
      });

      // requesting 300 > 200
      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            salesOrderId: 'so-1',
            challanNumber: 'DC-2026-003',
            gatePassNumber: 'GP-2026-003',
            vehicleNumber: 'DHAKA METRO-TA-11-2233',
            driverName: 'Abdul Kashem',
            lines: [
              {
                salesOrderLineId: 'sol-1',
                itemId: 'item-rice-1',
                stackId: 'stack-1',
                netWeightKg: '300.000',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('Dispatched weight 300.000 KG exceeds unfulfilled order line quantity of 200.000 KG.');
    });
  });

  describe('Post Dispatch', () => {
    it('verifies physical stock, posts stock out movement, updates order fulfilledKg, and marks order POSTED when fully dispatched', async () => {
      const dispatchRecord = {
        id: 'disp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        salesOrderId: 'so-1',
        status: DocumentStatus.APPROVED,
        lines: [
          {
            id: 'dl-1',
            salesOrderLineId: 'sol-1',
            itemId: 'item-rice-1',
            stackId: 'stack-1',
            netWeightKg: new Prisma.Decimal('1000.000'),
            item: activeRiceItem,
            stack: activeStack,
            salesOrderLine: approvedOrder.lines[0],
          },
        ],
      };

      tx.dispatch.findFirst.mockResolvedValue(dispatchRecord);
      // Physical stock on stack = 1500 KG >= 1000 KG
      tx.stockMovement.aggregate.mockResolvedValue({
        _sum: { quantity: new Prisma.Decimal('1500.000') },
      });
      tx.stockMovement.create.mockResolvedValue({ id: 'sm-1' });
      tx.salesOrderLine.update.mockResolvedValue({});
      // Order line is now fully fulfilled (1000 fulfilled of 1000)
      tx.salesOrderLine.findMany.mockResolvedValue([
        { quantityKg: new Prisma.Decimal('1000'), fulfilledKg: new Prisma.Decimal('1000') },
      ]);
      tx.salesOrder.update.mockResolvedValue({});
      tx.dispatch.update.mockResolvedValue({
        ...dispatchRecord,
        status: DocumentStatus.POSTED,
        postedAt: new Date(),
      });

      const res = await service.post('disp-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.POSTED);

      // Verify stock movement created with negative quantity for stock deduction
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: StockMovementType.SALE,
            quantity: new Prisma.Decimal('-1000.000'),
            sourceType: 'SALES_DISPATCH',
            sourceId: 'disp-1',
          }),
        }),
      );

      // Verify SalesOrderLine fulfilledKg incremented
      expect(tx.salesOrderLine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sol-1' },
          data: { fulfilledKg: { increment: new Prisma.Decimal('1000.000') } },
        }),
      );

      // Verify parent SalesOrder transitioned to POSTED
      expect(tx.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'so-1' },
          data: { status: DocumentStatus.POSTED },
        }),
      );

      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'POST',
            resource: 'dispatch',
          }),
        }),
      );
    });

    it('rejects posting when physical stock on stack is less than dispatch weight', async () => {
      const dispatchRecord = {
        id: 'disp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        salesOrderId: 'so-1',
        status: DocumentStatus.APPROVED,
        lines: [
          {
            id: 'dl-1',
            salesOrderLineId: 'sol-1',
            itemId: 'item-rice-1',
            stackId: 'stack-1',
            netWeightKg: new Prisma.Decimal('1000.000'),
            item: activeRiceItem,
            stack: activeStack,
            salesOrderLine: approvedOrder.lines[0],
          },
        ],
      };

      tx.dispatch.findFirst.mockResolvedValue(dispatchRecord);
      // Physical stock on stack = 800 KG < 1000 KG required!
      tx.stockMovement.aggregate.mockResolvedValue({
        _sum: { quantity: new Prisma.Decimal('800.000') },
      });

      await expect(
        service.post('disp-1', 'company-1', 'factory-1', 'user-1'),
      ).rejects.toThrow('Insufficient physical stock on stack ST-01 for item Miniket Rice 50KG; available 800.000 KG, required 1000.000 KG.');

      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Dispatch', () => {
    it('cancels a draft or approved dispatch', async () => {
      const dispatchRecord = {
        id: 'disp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.APPROVED,
      };

      tx.dispatch.findFirst.mockResolvedValue(dispatchRecord);
      tx.dispatch.update.mockResolvedValue({
        ...dispatchRecord,
        status: DocumentStatus.CANCELLED,
      });

      const res = await service.cancel('disp-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.CANCELLED);
    });

    it('rejects cancellation of an already POSTED dispatch', async () => {
      tx.dispatch.findFirst.mockResolvedValue({
        id: 'disp-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.POSTED,
      });

      await expect(
        service.cancel('disp-1', 'company-1', 'factory-1', 'user-1'),
      ).rejects.toThrow('Posted dispatch documents cannot be cancelled. Use a sales return workflow.');
    });
  });
});

