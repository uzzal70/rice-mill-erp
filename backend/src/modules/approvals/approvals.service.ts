import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateApprovalRequestDto, TransitionApprovalDto, ApprovalActionType } from './approvals.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrGetRequest(companyId: string, dto: CreateApprovalRequestDto, userId?: string) {
    const existing = await this.prisma.approvalRequest.findUnique({
      where: {
        companyId_entityType_entityId: {
          companyId,
          entityType: dto.entityType.toUpperCase(),
          entityId: dto.entityId,
        },
      },
      include: {
        actions: { orderBy: { actionTimestamp: 'asc' } },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.approvalRequest.create({
      data: {
        companyId,
        factoryId: dto.factoryId || null,
        entityType: dto.entityType.toUpperCase(),
        entityId: dto.entityId,
        entityNumber: dto.entityNumber,
        title: dto.title,
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : null,
        status: 'DRAFT',
        currentStage: 'DRAFT',
      },
      include: {
        actions: true,
      },
    });
  }

  async transition(companyId: string, id: string, dto: TransitionApprovalDto, actorId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { companyId, id },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with id ${id} not found.`);
    }

    const currentStatus = request.status;
    let nextStatus = currentStatus;
    let nextStage = request.currentStage;
    const now = new Date();

    const updateData: Prisma.ApprovalRequestUpdateInput = {};

    switch (dto.action) {
      case ApprovalActionType.SUBMIT:
        if (currentStatus !== 'DRAFT' && currentStatus !== 'RETURNED_FOR_CORRECTION') {
          throw new BadRequestException(`Cannot submit transaction currently in ${currentStatus} status.`);
        }
        nextStatus = 'SUBMITTED';
        nextStage = 'REVIEW';
        updateData.submittedById = actorId;
        updateData.submittedAt = now;
        break;

      case ApprovalActionType.REVIEW:
        if (currentStatus !== 'SUBMITTED') {
          throw new BadRequestException(`Cannot mark as reviewed from status ${currentStatus}. Must be SUBMITTED.`);
        }
        nextStatus = 'REVIEWED';
        nextStage = 'APPROVAL';
        updateData.reviewedById = actorId;
        updateData.reviewedAt = now;
        break;

      case ApprovalActionType.APPROVE:
        if (currentStatus !== 'REVIEWED' && currentStatus !== 'SUBMITTED') {
          throw new BadRequestException(`Cannot approve from status ${currentStatus}. Must be SUBMITTED or REVIEWED.`);
        }
        nextStatus = 'APPROVED';
        nextStage = 'POSTING';
        updateData.approvedById = actorId;
        updateData.approvedAt = now;
        break;

      case ApprovalActionType.POST:
        if (currentStatus !== 'APPROVED') {
          throw new BadRequestException(`Cannot post transaction before final approval. Current status is ${currentStatus}.`);
        }
        nextStatus = 'POSTED';
        nextStage = 'POSTED';
        updateData.postedById = actorId;
        updateData.postedAt = now;
        break;

      case ApprovalActionType.LOCK:
        if (currentStatus !== 'POSTED') {
          throw new BadRequestException(`Cannot lock transaction before posting. Current status is ${currentStatus}.`);
        }
        nextStatus = 'LOCKED';
        nextStage = 'LOCKED';
        updateData.lockedAt = now;
        break;

      case ApprovalActionType.REJECT:
        if (currentStatus === 'POSTED' || currentStatus === 'LOCKED') {
          throw new BadRequestException(`Cannot reject transaction that is already ${currentStatus}. Use reversal/correction.`);
        }
        if (!dto.comments || !dto.comments.trim()) {
          throw new BadRequestException('A reason/comment is required when rejecting a transaction.');
        }
        nextStatus = 'REJECTED';
        nextStage = 'REJECTED';
        updateData.rejectionReason = dto.comments.trim();
        break;

      case ApprovalActionType.RETURN_FOR_CORRECTION:
        if (currentStatus === 'POSTED' || currentStatus === 'LOCKED') {
          throw new BadRequestException(`Cannot return for correction once ${currentStatus}. Use reversal/correction.`);
        }
        if (!dto.comments || !dto.comments.trim()) {
          throw new BadRequestException('Feedback comments are required when returning for correction.');
        }
        nextStatus = 'RETURNED_FOR_CORRECTION';
        nextStage = 'DRAFT';
        updateData.correctionNotes = dto.comments.trim();
        break;

      default:
        throw new BadRequestException(`Unsupported approval action: ${dto.action}`);
    }

    updateData.status = nextStatus;
    updateData.currentStage = nextStage;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: updateData,
      });

      await tx.approvalAction.create({
        data: {
          approvalRequestId: id,
          actionType: dto.action,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actorId,
          actorName: dto.actorName || null,
          actorRole: dto.actorRole || null,
          comments: dto.comments || null,
          actionTimestamp: now,
        },
      });

      return tx.approvalRequest.findUnique({
        where: { id },
        include: {
          actions: { orderBy: { actionTimestamp: 'asc' } },
        },
      });
    });
  }

  async assertMutable(companyId: string, entityType: string, entityId: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: {
        companyId_entityType_entityId: {
          companyId,
          entityType: entityType.toUpperCase(),
          entityId,
        },
      },
    });

    if (request && (request.status === 'POSTED' || request.status === 'LOCKED')) {
      throw new BadRequestException(
        `Transaction ${request.entityNumber} is in ${request.status} state. Silent modifications are prohibited; use formal reversal or correction transactions.`,
      );
    }
  }

  async listRequests(companyId: string, status?: string, entityType?: string, search?: string) {
    const where: Prisma.ApprovalRequestWhereInput = { companyId };

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { entityNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.approvalRequest.findMany({
      where,
      include: {
        actions: { orderBy: { actionTimestamp: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRequest(companyId: string, id: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { companyId, id },
      include: {
        actions: { orderBy: { actionTimestamp: 'asc' } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with id ${id} not found.`);
    }

    return request;
  }

  async getApprovalInbox(companyId: string) {
    const [allRequests, pendingReview, pendingApproval, readyToPost, lockedCount, returnedCount, rejectedCount] = await Promise.all([
      this.prisma.approvalRequest.count({ where: { companyId } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'SUBMITTED' } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'REVIEWED' } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'APPROVED' } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'LOCKED' } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'RETURNED_FOR_CORRECTION' } }),
      this.prisma.approvalRequest.count({ where: { companyId, status: 'REJECTED' } }),
    ]);

    const activePending = await this.prisma.approvalRequest.findMany({
      where: {
        companyId,
        status: { in: ['SUBMITTED', 'REVIEWED', 'APPROVED'] },
      },
      include: {
        actions: { orderBy: { actionTimestamp: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return {
      totalTransactions: allRequests,
      pendingReview,
      pendingApproval,
      readyToPost,
      lockedCount,
      returnedCount,
      rejectedCount,
      activePending,
    };
  }
}

