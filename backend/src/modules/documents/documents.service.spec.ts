import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      companyDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new DocumentsService(prisma as PrismaService);
  });

  describe('createDocument', () => {
    it('creates a new document record', async () => {
      prisma.companyDocument.create.mockImplementation((args: any) => Promise.resolve({ id: 'doc-1', ...args.data }));

      const res = await service.createDocument('comp-1', {
        category: 'TRADE_LICENSE',
        title: 'Trade License 2026-2027',
        documentNumber: 'TL-DIN-2026-9876',
        issuingAuthority: 'Dinajpur Municipality',
        expiryDate: '2027-06-30',
        reminderDaysBefore: 30,
      });

      expect(res.title).toBe('Trade License 2026-2027');
      expect(res.category).toBe('TRADE_LICENSE');
      expect(prisma.companyDocument.create).toHaveBeenCalled();
    });

    it('throws BadRequestException if title is missing', async () => {
      await expect(
        service.createDocument('comp-1', {
          category: 'TRADE_LICENSE',
          title: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDocument', () => {
    it('updates document details', async () => {
      prisma.companyDocument.findFirst.mockResolvedValue({ id: 'doc-1', companyId: 'comp-1' });
      prisma.companyDocument.update.mockResolvedValue({ id: 'doc-1', title: 'Updated Title' });

      const res = await service.updateDocument('comp-1', 'doc-1', { title: 'Updated Title' });
      expect(res.title).toBe('Updated Title');
      expect(prisma.companyDocument.update).toHaveBeenCalled();
    });

    it('throws NotFoundException if document not found', async () => {
      prisma.companyDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDocument('comp-1', 'doc-999', { title: 'Updated Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDocument', () => {
    it('deletes document when exists', async () => {
      prisma.companyDocument.findFirst.mockResolvedValue({ id: 'doc-1' });
      prisma.companyDocument.delete.mockResolvedValue({ id: 'doc-1' });

      await service.deleteDocument('comp-1', 'doc-1');
      expect(prisma.companyDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });

  describe('getExpiryNotifications', () => {
    it('identifies expired, critical, and warning documents correctly', async () => {
      const now = new Date();

      const expiredDate = new Date();
      expiredDate.setDate(now.getDate() - 5); // 5 days ago

      const criticalDate = new Date();
      criticalDate.setDate(now.getDate() + 3); // 3 days remaining

      const warningDate = new Date();
      warningDate.setDate(now.getDate() + 20); // 20 days remaining

      const farDate = new Date();
      farDate.setDate(now.getDate() + 180); // 180 days remaining

      prisma.companyDocument.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          title: 'Expired Fire License',
          category: 'FACTORY_LICENSE',
          documentNumber: 'FL-001',
          expiryDate: expiredDate,
          reminderDaysBefore: 30,
        },
        {
          id: 'doc-2',
          title: 'Expiring Environmental Permit',
          category: 'ENVIRONMENTAL_LICENSE',
          documentNumber: 'ENV-002',
          expiryDate: criticalDate,
          reminderDaysBefore: 30,
        },
        {
          id: 'doc-3',
          title: 'Insurance Contract',
          category: 'INSURANCE',
          documentNumber: 'INS-003',
          expiryDate: warningDate,
          reminderDaysBefore: 30,
        },
        {
          id: 'doc-4',
          title: 'Trade License',
          category: 'TRADE_LICENSE',
          documentNumber: 'TL-004',
          expiryDate: farDate,
          reminderDaysBefore: 30,
        },
      ]);

      const result = await service.getExpiryNotifications('comp-1');

      expect(result.totalDocuments).toBe(4);
      expect(result.expiredCount).toBe(1);
      expect(result.expiringSoonCount).toBe(2);
      expect(result.validCount).toBe(1);
      expect(result.alerts.length).toBe(3);

      expect(result.alerts[0].title).toBe('Expired Fire License');
      expect(result.alerts[0].urgency).toBe('EXPIRED');

      expect(result.alerts[1].title).toBe('Expiring Environmental Permit');
      expect(result.alerts[1].urgency).toBe('CRITICAL');

      expect(result.alerts[2].title).toBe('Insurance Contract');
      expect(result.alerts[2].urgency).toBe('WARNING');
    });
  });
});

