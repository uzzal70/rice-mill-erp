import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApprovalsService } from './approvals.service';
import { ApprovalActionType } from './approvals.dto';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      approvalRequest: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      approvalAction: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
      approvalRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      approvalAction: {
        create: jest.fn(),
      },
    };

    service = new ApprovalsService(prisma as PrismaService);
  });

  describe('createOrGetRequest', () => {
    it('creates a new approval request in DRAFT status', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue(null);
      prisma.approvalRequest.create.mockImplementation((args: any) => Promise.resolve({ id: 'appr-1', ...args.data }));

      const res = await service.createOrGetRequest('comp-1', {
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-101',
        entityNumber: 'PO-2026-001',
        title: 'Procurement of 500 Bags Miniket Paddy',
        amount: 850000,
      });

      expect(res.status).toBe('DRAFT');
      expect(res.currentStage).toBe('DRAFT');
      expect(prisma.approvalRequest.create).toHaveBeenCalled();
    });
  });

  describe('transition workflow lifecycle', () => {
    it('executes the full lifecycle: DRAFT -> SUBMITTED -> REVIEWED -> APPROVED -> POSTED -> LOCKED', async () => {
      // 1. Submit from DRAFT
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'DRAFT',
        currentStage: 'DRAFT',
      });
      tx.approvalRequest.update.mockResolvedValueOnce({ id: 'appr-1', status: 'SUBMITTED' });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'SUBMITTED' });

      const submitted = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.SUBMIT, comments: 'Ready for verification' },
        'user-1',
      );
      expect(submitted!.status).toBe('SUBMITTED');

      // 2. Review from SUBMITTED
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'SUBMITTED',
        currentStage: 'REVIEW',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'REVIEWED' });

      const reviewed = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.REVIEW, comments: 'Verified quantities and rates' },
        'user-2',
      );
      expect(reviewed!.status).toBe('REVIEWED');

      // 3. Approve from REVIEWED
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'REVIEWED',
        currentStage: 'APPROVAL',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'APPROVED' });

      const approved = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.APPROVE, comments: 'Approved by MD' },
        'user-3',
      );
      expect(approved!.status).toBe('APPROVED');

      // 4. Post from APPROVED
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'APPROVED',
        currentStage: 'POSTING',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'POSTED' });

      const posted = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.POST, comments: 'Posted to GL and Inventory' },
        'user-4',
      );
      expect(posted!.status).toBe('POSTED');

      // 5. Lock from POSTED
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'POSTED',
        currentStage: 'POSTED',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'LOCKED' });

      const locked = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.LOCK, comments: 'Final audit lock' },
        'user-5',
      );
      expect(locked!.status).toBe('LOCKED');
    });

    it('supports Rejection with mandatory reason and blocks rejection after POSTED', async () => {
      // Rejection from SUBMITTED
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'SUBMITTED',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'REJECTED' });

      const rejected = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.REJECT, comments: 'Invalid pricing terms' },
        'user-mgr',
      );
      expect(rejected!.status).toBe('REJECTED');

      // Rejection without comments fails
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'SUBMITTED',
      });
      await expect(
        service.transition('comp-1', 'appr-1', { action: ApprovalActionType.REJECT, comments: '' }, 'user-mgr'),
      ).rejects.toThrow(BadRequestException);

      // Rejection of POSTED fails
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'POSTED',
      });
      await expect(
        service.transition('comp-1', 'appr-1', { action: ApprovalActionType.REJECT, comments: 'Late rejection' }, 'user-mgr'),
      ).rejects.toThrow(BadRequestException);
    });

    it('supports Return for Correction', async () => {
      prisma.approvalRequest.findFirst.mockResolvedValueOnce({
        id: 'appr-1',
        companyId: 'comp-1',
        status: 'SUBMITTED',
      });
      tx.approvalRequest.findUnique.mockResolvedValueOnce({ id: 'appr-1', status: 'RETURNED_FOR_CORRECTION' });

      const returned = await service.transition(
        'comp-1',
        'appr-1',
        { action: ApprovalActionType.RETURN_FOR_CORRECTION, comments: 'Please attach weight slip' },
        'user-mgr',
      );
      expect(returned!.status).toBe('RETURNED_FOR_CORRECTION');
    });
  });

  describe('assertMutable immutability check', () => {
    it('throws BadRequestException if transaction is POSTED or LOCKED', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        entityNumber: 'INV-2026-001',
        status: 'POSTED',
      });

      await expect(
        service.assertMutable('comp-1', 'PURCHASE_INVOICE', 'inv-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes if transaction is in DRAFT or SUBMITTED status', async () => {
      prisma.approvalRequest.findUnique.mockResolvedValue({
        entityNumber: 'INV-2026-001',
        status: 'DRAFT',
      });

      await expect(service.assertMutable('comp-1', 'PURCHASE_INVOICE', 'inv-1')).resolves.not.toThrow();
    });
  });

  describe('getApprovalInbox', () => {
    it('aggregates status counts accurately', async () => {
      prisma.approvalRequest.count
        .mockResolvedValueOnce(50) // all
        .mockResolvedValueOnce(5)  // submitted
        .mockResolvedValueOnce(3)  // reviewed
        .mockResolvedValueOnce(4)  // approved
        .mockResolvedValueOnce(30) // locked
        .mockResolvedValueOnce(2)  // returned
        .mockResolvedValueOnce(1); // rejected

      prisma.approvalRequest.findMany.mockResolvedValue([]);

      const inbox = await service.getApprovalInbox('comp-1');

      expect(inbox.totalTransactions).toBe(50);
      expect(inbox.pendingReview).toBe(5);
      expect(inbox.pendingApproval).toBe(3);
      expect(inbox.readyToPost).toBe(4);
      expect(inbox.lockedCount).toBe(30);
      expect(inbox.returnedCount).toBe(2);
      expect(inbox.rejectedCount).toBe(1);
    });
  });
});
