import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, ItemKind, PartnerType, Prisma, UnitOfMeasure } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: any;
  let tx: any;

  const validCustomer = {
    id: 'cust-1',
    name: 'Rahim Traders',
    businessName: 'Rahim Rice Agency',
    code: 'CUST-001',
    creditLimit: new Prisma.Decimal('100000'),
    openingBalance: new Prisma.Decimal('10000'),
  };

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

  beforeEach(() => {
    tx = {
      factory: { findFirst: jest.fn() },
      partner: { findFirst: jest.fn() },
      item: { findFirst: jest.fn() },
      stack: { findFirst: jest.fn() },
      salesQuotation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      salesOrder: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      salesOrderLine: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      stockMovement: {
        aggregate: jest.fn(),
      },
      salesReturn: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation((cb: (t: any) => any) => cb(tx)),
      salesQuotation: tx.salesQuotation,
      salesOrder: tx.salesOrder,
    };

    service = new SalesService(prisma as PrismaService);
  });

  describe('Quotations', () => {
    it('creates a sales quotation with calculated totals and audit trail', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(validCustomer);
      tx.item.findFirst.mockResolvedValue(activeRiceItem);
      tx.salesQuotation.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'quot-1', ...args.data }),
      );

      const result = await service.createQuotation(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          quotationNumber: 'QT-2026-001',
          customerId: 'cust-1',
          channel: 'WHOLESALE',
          validUntil: new Date(Date.now() + 86400000).toISOString(),
          currency: 'BDT',
          remarks: 'Test quote',
          lines: [
            { itemId: 'item-rice-1', quantityKg: '1000', unitRate: '65.50' },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(tx.salesQuotation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quotationNumber: 'QT-2026-001',
            totalAmount: new Prisma.Decimal('65500.00'),
          }),
        }),
      );
      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE_QUOTATION',
            resource: 'sales',
          }),
        }),
      );
    });

    it('rejects quotation when item is not RICE or BY_PRODUCT', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(validCustomer);
      tx.item.findFirst.mockResolvedValue({
        ...activeRiceItem,
        kind: ItemKind.SPARE_PART,
      });

      await expect(
        service.createQuotation(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            quotationNumber: 'QT-2026-002',
            customerId: 'cust-1',
            channel: 'WHOLESALE',
            validUntil: new Date().toISOString(),
            lines: [{ itemId: 'item-rice-1', quantityKg: '100', unitRate: '50' }],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a draft quotation', async () => {
      tx.salesQuotation.findFirst.mockResolvedValue({
        id: 'quot-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.DRAFT,
      });
      tx.salesQuotation.update.mockResolvedValue({
        id: 'quot-1',
        status: DocumentStatus.APPROVED,
      });

      const res = await service.approveQuotation('quot-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.APPROVED);
      expect(tx.salesQuotation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quot-1' },
          data: expect.objectContaining({ status: DocumentStatus.APPROVED }),
        }),
      );
    });
  });

  describe('Sales Orders', () => {
    it('creates an export sales order with required foreign destination and exchange rate', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(validCustomer);
      tx.item.findFirst.mockResolvedValue(activeRiceItem);
      tx.stack.findFirst.mockResolvedValue(activeStack);
      tx.salesOrder.findMany.mockResolvedValue([]); // open orders for exposure
      tx.salesOrder.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'order-exp-1', ...args.data }),
      );

      const result = await service.create(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          orderNumber: 'SO-EXP-001',
          customerId: 'cust-1',
          channel: 'EXPORT',
          currency: 'USD',
          exchangeRate: '110.50',
          exportCountry: 'United Arab Emirates',
          portOfDischarge: 'Jebel Ali',
          lcNumber: 'LC-2026-789',
          lines: [
            {
              itemId: 'item-rice-1',
              stackId: 'stack-1',
              quantityKg: '5000',
              unitRate: '0.85',
            },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(tx.salesOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'EXPORT',
            currency: 'USD',
            exchangeRate: new Prisma.Decimal('110.50'),
            exportCountry: 'United Arab Emirates',
            totalAmount: new Prisma.Decimal('4250.00'),
          }),
        }),
      );
    });

    it('rejects export sales order when export country is missing', async () => {
      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            orderNumber: 'SO-EXP-002',
            customerId: 'cust-1',
            channel: 'EXPORT',
            currency: 'USD',
            exchangeRate: '110.50',
            lines: [
              {
                itemId: 'item-rice-1',
                stackId: 'stack-1',
                quantityKg: '5000',
                unitRate: '0.85',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects credit order when customer has no credit limit', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue({
        ...validCustomer,
        creditLimit: null,
      });

      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            orderNumber: 'SO-CR-001',
            customerId: 'cust-1',
            channel: 'CREDIT',
            lines: [
              {
                itemId: 'item-rice-1',
                stackId: 'stack-1',
                quantityKg: '1000',
                unitRate: '60',
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('Customer has no approved credit limit. Cannot create order with CREDIT channel.');
    });

    it('rejects order when customer total exposure exceeds credit limit', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      // customer has 100,000 credit limit and 10,000 opening due
      tx.partner.findFirst.mockResolvedValue(validCustomer);
      tx.item.findFirst.mockResolvedValue(activeRiceItem);
      tx.stack.findFirst.mockResolvedValue(activeStack);
      // existing approved orders = 80,000
      tx.salesOrder.findMany.mockResolvedValue([
        { totalAmount: new Prisma.Decimal('80000') },
      ]);

      // new order is 20,000 -> 10,000 + 80,000 + 20,000 = 110,000 > 100,000!
      await expect(
        service.create(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            orderNumber: 'SO-CR-002',
            customerId: 'cust-1',
            channel: 'CREDIT',
            lines: [
              {
                itemId: 'item-rice-1',
                stackId: 'stack-1',
                quantityKg: '1000',
                unitRate: '20', // total 20,000
              },
            ],
          },
          'user-1',
        ),
      ).rejects.toThrow('Order total exceeds customer credit limit of 100000.00. Total credit exposure would be 110000.00.');
    });

    it('allows CASH order even if credit limit would otherwise be exceeded', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(validCustomer);
      tx.item.findFirst.mockResolvedValue(activeRiceItem);
      tx.stack.findFirst.mockResolvedValue(activeStack);
      tx.salesOrder.findMany.mockResolvedValue([
        { totalAmount: new Prisma.Decimal('95000') },
      ]);
      tx.salesOrder.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'order-cash-1', ...args.data }),
      );

      const result = await service.create(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          orderNumber: 'SO-CASH-001',
          customerId: 'cust-1',
          channel: 'CASH',
          lines: [
            {
              itemId: 'item-rice-1',
              stackId: 'stack-1',
              quantityKg: '1000',
              unitRate: '50', // 50,000
            },
          ],
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(tx.salesOrder.create).toHaveBeenCalled();
    });

    it('approves order and reserves stock when available stock is sufficient', async () => {
      const order = {
        id: 'order-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.DRAFT,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-rice-1',
            stackId: 'stack-1',
            quantityKg: new Prisma.Decimal('500'),
          },
        ],
      };

      tx.salesOrder.findFirst.mockResolvedValue(order);
      // On hand stock = 1000 KG
      tx.stockMovement.aggregate.mockResolvedValue({
        _sum: { quantity: new Prisma.Decimal('1000') },
      });
      // Already reserved by other orders = 200 KG
      tx.salesOrderLine.findMany.mockResolvedValue([
        { quantityKg: new Prisma.Decimal('200'), fulfilledKg: new Prisma.Decimal('0') },
      ]);
      // Available = 1000 - 200 = 800 >= 500
      tx.salesOrderLine.updateMany.mockResolvedValue({ count: 1 });
      tx.salesOrder.update.mockResolvedValue({
        ...order,
        status: DocumentStatus.APPROVED,
        approvedAt: new Date(),
      });

      const res = await service.approve('order-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.APPROVED);
      expect(tx.salesOrderLine.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-1', factoryId: 'factory-1', salesOrderId: 'order-1' },
          data: expect.objectContaining({ reservedAt: expect.any(Date) }),
        }),
      );
      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'APPROVE_AND_RESERVE',
            resource: 'sales',
          }),
        }),
      );
    });

    it('rejects order approval when unreserved available stock is insufficient', async () => {
      const order = {
        id: 'order-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.DRAFT,
        lines: [
          {
            id: 'line-1',
            itemId: 'item-rice-1',
            stackId: 'stack-1',
            quantityKg: new Prisma.Decimal('500'),
          },
        ],
      };

      tx.salesOrder.findFirst.mockResolvedValue(order);
      // On hand stock = 400 KG
      tx.stockMovement.aggregate.mockResolvedValue({
        _sum: { quantity: new Prisma.Decimal('400') },
      });
      // Already reserved = 100 KG -> Available = 300 < 500 requested
      tx.salesOrderLine.findMany.mockResolvedValue([
        { quantityKg: new Prisma.Decimal('100'), fulfilledKg: new Prisma.Decimal('0') },
      ]);

      await expect(
        service.approve('order-1', 'company-1', 'factory-1', 'user-1'),
      ).rejects.toThrow('Insufficient unreserved stock for item item-rice-1 on stack stack-1; available 300.000 KG, requested 500.000 KG.');
    });

    it('cancelling an approved order releases reservation and updates status to CANCELLED', async () => {
      const order = {
        id: 'order-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.APPROVED,
      };

      tx.salesOrder.findFirst.mockResolvedValue(order);
      tx.salesOrder.update.mockResolvedValue({
        ...order,
        status: DocumentStatus.CANCELLED,
      });

      const res = await service.cancel('order-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(DocumentStatus.CANCELLED);
      expect(tx.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: { status: DocumentStatus.CANCELLED },
        }),
      );
      expect(tx.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CANCEL_AND_RELEASE_RESERVATION',
          }),
        }),
      );
    });

    it('rejects cancellation of an already cancelled order', async () => {
      tx.salesOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        companyId: 'company-1',
        factoryId: 'factory-1',
        status: DocumentStatus.CANCELLED,
      });

      await expect(
        service.cancel('order-1', 'company-1', 'factory-1', 'user-1'),
      ).rejects.toThrow('Only draft or approved orders can be cancelled.');
    });
  });
});
