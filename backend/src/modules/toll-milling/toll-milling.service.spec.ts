import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ByProductPolicy,
  DocumentStatus,
  ItemKind,
  PartnerType,
  Prisma,
  TollOrderStatus,
  TollRateBasis,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { TollMillingService } from './toll-milling.service';

describe('TollMillingService', () => {
  let service: TollMillingService;
  let prisma: any;
  let tx: any;

  const activeFactory = { id: 'factory-1', companyId: 'company-1', active: true };
  const activeCustomer = { id: 'cust-1', companyId: 'company-1', name: 'Al-Hasan Traders', type: PartnerType.CUSTOMER, active: true };
  const activePaddyItem = { id: 'item-paddy-1', companyId: 'company-1', name: 'BRRI Dhan 28 Paddy', kind: ItemKind.PADDY, active: true };

  beforeEach(() => {
    tx = {
      factory: { findFirst: jest.fn() },
      partner: { findFirst: jest.fn() },
      item: { findFirst: jest.fn() },
      tollOrder: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tollBatch: {
        create: jest.fn(),
      },
      tollDelivery: {
        create: jest.fn(),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };

    prisma = {
      $transaction: jest.fn((callback: any) => {
        if (Array.isArray(callback)) {
          return Promise.all(callback);
        }
        return callback(tx);
      }),
      tollOrder: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      partner: {
        findFirst: jest.fn(),
      },
    };

    service = new TollMillingService(prisma as PrismaService);
  });

  describe('calculateTollCharge', () => {
    it('calculates toll charge per KG basis', () => {
      const charge = service.calculateTollCharge(
        new Prisma.Decimal('1000'),
        20,
        new Prisma.Decimal('2.50'),
        TollRateBasis.PER_KG,
      );
      expect(charge.toString()).toBe('2500');
    });

    it('calculates toll charge per Mon (40 KG) basis', () => {
      const charge = service.calculateTollCharge(
        new Prisma.Decimal('1000'),
        20,
        new Prisma.Decimal('100.00'),
        TollRateBasis.PER_MON,
      );
      // 1000 / 40 * 100 = 2500
      expect(charge.toString()).toBe('2500');
    });

    it('calculates toll charge per Bag basis', () => {
      const charge = service.calculateTollCharge(
        new Prisma.Decimal('1000'),
        50,
        new Prisma.Decimal('50.00'),
        TollRateBasis.PER_BAG,
      );
      expect(charge.toString()).toBe('2500');
    });
  });

  describe('getCustomerCustodyLedger', () => {
    it('computes accurate customer custody balances for paddy, rice, and by-products', async () => {
      prisma.partner.findFirst.mockResolvedValue(activeCustomer);
      prisma.tollOrder.findMany.mockResolvedValue([
        {
          id: 'ord-1',
          receivedQuantityKg: new Prisma.Decimal('10000'),
          processedQuantityKg: new Prisma.Decimal('6000'),
          totalRiceProducedKg: new Prisma.Decimal('3900'),
          totalRiceDeliveredKg: new Prisma.Decimal('2500'),
          totalByProductProducedKg: new Prisma.Decimal('1800'),
          totalByProductDeliveredKg: new Prisma.Decimal('1000'),
          totalAmount: new Prisma.Decimal('15000'),
        },
      ]);

      const res = await service.getCustomerCustodyLedger('cust-1', 'company-1', 'factory-1');
      expect(res.success).toBe(true);
      // Paddy custody: 10000 - 6000 = 4000
      expect(res.custodySummary.paddyInCustodyKg.toString()).toBe('4000');
      // Rice custody: 3900 - 2500 = 1400
      expect(res.custodySummary.riceInCustodyKg.toString()).toBe('1400');
      // By-product custody: 1800 - 1000 = 800
      expect(res.custodySummary.byProductInCustodyKg.toString()).toBe('800');
      expect(res.custodySummary.totalServiceFees.toString()).toBe('15000');
    });
  });

  describe('createOrder', () => {
    it('rejects order with non-positive received quantity', async () => {
      await expect(
        service.createOrder(
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            customerId: 'cust-1',
            paddyItemId: 'item-paddy-1',
            orderNumber: 'TOLL-001',
            receivedQuantityKg: '0',
            tollRate: '2.50',
            tollRateBasis: TollRateBasis.PER_KG,
            byProductPolicy: ByProductPolicy.RETURN_TO_CUSTOMER,
          },
          'user-1',
        ),
      ).rejects.toThrow('Received paddy quantity must be greater than zero.');
    });

    it('successfully creates toll order in RECEIVED status', async () => {
      tx.factory.findFirst.mockResolvedValue(activeFactory);
      tx.partner.findFirst.mockResolvedValue(activeCustomer);
      tx.item.findFirst.mockResolvedValue(activePaddyItem);
      tx.tollOrder.create.mockImplementation((args: any) => ({
        id: 'toll-1',
        ...args.data,
      }));

      const res = await service.createOrder(
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          customerId: 'cust-1',
          paddyItemId: 'item-paddy-1',
          orderNumber: 'TOLL-001',
          receivedBagCount: 200,
          receivedQuantityKg: '10000',
          tollRate: '2.50',
          tollRateBasis: TollRateBasis.PER_KG,
          byProductPolicy: ByProductPolicy.RETURN_TO_CUSTOMER,
        },
        'user-1',
      );

      expect(res.id).toBe('toll-1');
      expect(res.status).toBe(TollOrderStatus.RECEIVED);
      expect(res.receivedQuantityKg.toString()).toBe('10000');
    });
  });

  describe('createBatch', () => {
    it('rejects batch when input quantity exceeds unprocessed custody paddy', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.RECEIVED,
        receivedQuantityKg: new Prisma.Decimal('5000'),
        processedQuantityKg: new Prisma.Decimal('4000'),
      });

      await expect(
        service.createBatch(
          'toll-1',
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            batchNumber: 'TB-001',
            inputPaddyKg: '2000', // Only 1000 remains
            headRiceKg: '1300',
          },
          'user-1',
        ),
      ).rejects.toThrow('exceeds remaining unprocessed custody paddy');
    });

    it('rejects batch when total outputs exceed input paddy', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.RECEIVED,
        receivedQuantityKg: new Prisma.Decimal('5000'),
        processedQuantityKg: new Prisma.Decimal('0'),
      });

      await expect(
        service.createBatch(
          'toll-1',
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            batchNumber: 'TB-001',
            inputPaddyKg: '1000',
            headRiceKg: '800',
            brokenRiceKg: '200',
            riceBranKg: '100', // Total 1100 > 1000
          },
          'user-1',
        ),
      ).rejects.toThrow('Total output quantity cannot exceed input paddy quantity');
    });

    it('successfully creates milling batch, updates processedKg and service fees', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.RECEIVED,
        receivedQuantityKg: new Prisma.Decimal('5000'),
        processedQuantityKg: new Prisma.Decimal('0'),
        totalRiceProducedKg: new Prisma.Decimal('0'),
        totalByProductProducedKg: new Prisma.Decimal('0'),
        totalRiceDeliveredKg: new Prisma.Decimal('0'),
        receivedBagCount: 100,
        tollRate: new Prisma.Decimal('2.50'),
        tollRateBasis: TollRateBasis.PER_KG,
        additionalCharges: new Prisma.Decimal('500'),
      });
      tx.tollBatch.create.mockResolvedValue({ id: 'tb-1', batchNumber: 'TB-001' });

      await service.createBatch(
        'toll-1',
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          batchNumber: 'TB-001',
          inputPaddyKg: '2000',
          headRiceKg: '1200',
          brokenRiceKg: '100',
          riceBranKg: '200',
          huskKg: '400',
        },
        'user-1',
      );

      expect(tx.tollOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'toll-1' },
          data: expect.objectContaining({
            processedQuantityKg: new Prisma.Decimal('2000'),
            totalRiceProducedKg: new Prisma.Decimal('1300'),
            totalByProductProducedKg: new Prisma.Decimal('600'),
            tollChargeAmount: new Prisma.Decimal('5000.00'), // 2000 * 2.50
            totalAmount: new Prisma.Decimal('5500.00'), // 5000 + 500
            status: TollOrderStatus.IN_PROCESS,
          }),
        }),
      );
    });
  });

  describe('createDelivery', () => {
    it('rejects delivery exceeding produced rice in custody', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.IN_PROCESS,
        totalRiceProducedKg: new Prisma.Decimal('2000'),
        totalRiceDeliveredKg: new Prisma.Decimal('1500'), // 500 remaining
        byProductPolicy: ByProductPolicy.RETURN_TO_CUSTOMER,
        totalByProductProducedKg: new Prisma.Decimal('500'),
        totalByProductDeliveredKg: new Prisma.Decimal('0'),
      });

      await expect(
        service.createDelivery(
          'toll-1',
          {
            companyId: 'company-1',
            factoryId: 'factory-1',
            deliveryNumber: 'TD-001',
            gatePassNumber: 'TGP-001',
            vehicleNumber: 'DHAKA-METRO-11',
            driverName: 'Rafiqul',
            riceDeliveredKg: '800', // exceeds 500
          },
          'user-1',
        ),
      ).rejects.toThrow('exceeds undelivered produced rice in custody');
    });

    it('successfully creates delivery and auto-completes order if fully processed and delivered', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.IN_PROCESS,
        receivedQuantityKg: new Prisma.Decimal('2000'),
        processedQuantityKg: new Prisma.Decimal('2000'),
        totalRiceProducedKg: new Prisma.Decimal('1300'),
        totalRiceDeliveredKg: new Prisma.Decimal('800'),
        totalByProductProducedKg: new Prisma.Decimal('500'),
        totalByProductDeliveredKg: new Prisma.Decimal('0'),
        byProductPolicy: ByProductPolicy.MILL_RETENTION,
      });
      tx.tollDelivery.create.mockResolvedValue({ id: 'td-1' });

      await service.createDelivery(
        'toll-1',
        {
          companyId: 'company-1',
          factoryId: 'factory-1',
          deliveryNumber: 'TD-001',
          gatePassNumber: 'TGP-001',
          vehicleNumber: 'DHAKA-METRO-11',
          driverName: 'Rafiqul',
          riceDeliveredKg: '500', // 800 + 500 = 1300 (satisfies all produced rice)
        },
        'user-1',
      );

      expect(tx.tollOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'toll-1' },
          data: expect.objectContaining({
            totalRiceDeliveredKg: new Prisma.Decimal('1300'),
            status: TollOrderStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe('cancelOrder', () => {
    it('cancels draft or received order without batches', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.RECEIVED,
        batches: [],
        deliveries: [],
      });
      tx.tollOrder.update.mockResolvedValue({ id: 'toll-1', status: TollOrderStatus.CANCELLED });

      const res = await service.cancelOrder('toll-1', 'company-1', 'factory-1', 'user-1');
      expect(res.status).toBe(TollOrderStatus.CANCELLED);
    });

    it('rejects cancelling order with existing batches', async () => {
      tx.tollOrder.findFirst.mockResolvedValue({
        id: 'toll-1',
        status: TollOrderStatus.IN_PROCESS,
        batches: [{ id: 'b-1' }],
        deliveries: [],
      });

      await expect(service.cancelOrder('toll-1', 'company-1', 'factory-1', 'user-1')).rejects.toThrow(
        'Cannot cancel a toll order that has recorded milling batches or deliveries.',
      );
    });
  });
});

