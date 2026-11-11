import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      auditEvent: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new AuditService(prisma as PrismaService);
  });

  describe('recordEvent', () => {
    it('records an audit event with user, action, resource, diffs, IP and device', async () => {
      prisma.auditEvent.create.mockImplementation((args: any) => Promise.resolve({ id: 'aud-1', ...args.data }));

      const res = await service.recordEvent(
        'comp-1',
        {
          action: 'UPDATE',
          resource: 'PURCHASE_ORDER',
          resourceId: 'po-101',
          before: { rate: 45.0 },
          after: { rate: 47.5 },
        },
        { id: 'usr-1', name: 'Tareq Rahman', email: 'tareq@example.com' },
        '103.205.71.12',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      );

      expect(prisma.auditEvent.create).toHaveBeenCalled();
      const createData = prisma.auditEvent.create.mock.calls[0][0].data;
      expect(createData.companyId).toBe('comp-1');
      expect(createData.action).toBe('UPDATE');
      expect(createData.resource).toBe('PURCHASE_ORDER');
      expect(createData.resourceId).toBe('po-101');
      expect(createData.userName).toBe('Tareq Rahman');
      expect(createData.ipAddress).toBe('103.205.71.12');
      expect(createData.device).toContain('Macintosh');
      expect(createData.before).toEqual({ rate: 45.0 });
      expect(createData.after).toEqual({ rate: 47.5 });
    });
  });

  describe('immutability check', () => {
    it('ensures no update or delete methods exist on AuditService', () => {
      expect((service as any).updateEvent).toBeUndefined();
      expect((service as any).deleteEvent).toBeUndefined();
    });
  });

  describe('listEvents', () => {
    it('returns paginated events matching search and filter parameters', async () => {
      prisma.auditEvent.findMany.mockResolvedValue([
        { id: 'aud-1', action: 'CREATE', resource: 'PURCHASE_ORDER' },
      ]);
      prisma.auditEvent.count.mockResolvedValue(1);

      const res = await service.listEvents('comp-1', {
        resource: 'PURCHASE_ORDER',
        action: 'CREATE',
        page: 1,
        pageSize: 10,
      });

      expect(res.events.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
    });
  });

  describe('getEvent', () => {
    it('returns event by id', async () => {
      prisma.auditEvent.findFirst.mockResolvedValue({ id: 'aud-1', action: 'POST' });
      const event = await service.getEvent('comp-1', 'aud-1');
      expect(event.id).toBe('aud-1');
    });

    it('throws NotFoundException if event does not exist', async () => {
      prisma.auditEvent.findFirst.mockResolvedValue(null);
      await expect(service.getEvent('comp-1', 'aud-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAuditSummary', () => {
    it('aggregates total counts, action distributions, and module frequencies', async () => {
      prisma.auditEvent.count.mockResolvedValue(100);
      prisma.auditEvent.findMany
        .mockResolvedValueOnce([
          { action: 'CREATE', resource: 'SALES', userName: 'User A', occurredAt: new Date() },
          { action: 'UPDATE', resource: 'SALES', userName: 'User A', occurredAt: new Date() },
          { action: 'POST', resource: 'ACCOUNTING', userName: 'User B', occurredAt: new Date() },
        ])
        .mockResolvedValueOnce([]); // recent high impact

      const summary = await service.getAuditSummary('comp-1');

      expect(summary.totalEvents).toBe(100);
      expect(summary.actionCounts['CREATE']).toBe(1);
      expect(summary.actionCounts['POST']).toBe(1);
      expect(summary.moduleCounts['SALES']).toBe(2);
      expect(summary.topUsers.length).toBe(2);
      expect(summary.topUsers[0].user).toBe('User A');
      expect(summary.topUsers[0].count).toBe(2);
    });
  });
});

