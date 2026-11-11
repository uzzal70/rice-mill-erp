import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RecordAuditEventDto, AuditQueryDto } from './audit.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    companyId: string,
    dto: RecordAuditEventDto,
    user?: { id?: string; name?: string; email?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditEvent.create({
      data: {
        companyId,
        userId: user?.id || null,
        userName: user?.name || user?.email || null,
        action: dto.action.toUpperCase(),
        resource: dto.resource.toUpperCase(),
        resourceId: dto.resourceId || null,
        requestId: dto.requestId || null,
        ipAddress: dto.ipAddress || ipAddress || null,
        device: dto.device || userAgent || null,
        before: dto.before !== undefined ? (dto.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: dto.after !== undefined ? (dto.after as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async listEvents(companyId: string, query: AuditQueryDto) {
    const where: Prisma.AuditEventWhereInput = { companyId };

    if (query.resource && query.resource !== 'ALL') {
      where.resource = query.resource.toUpperCase();
    }

    if (query.action && query.action !== 'ALL') {
      where.action = query.action.toUpperCase();
    }

    if (query.userId && query.userId !== 'ALL') {
      where.userId = query.userId;
    }

    if (query.fromDate || query.toDate) {
      where.occurredAt = {};
      if (query.fromDate) {
        where.occurredAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        const to = new Date(query.toDate);
        to.setHours(23, 59, 59, 999);
        where.occurredAt.lte = to;
      }
    }

    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { resourceId: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return {
      events,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getEvent(companyId: string, id: string) {
    const event = await this.prisma.auditEvent.findFirst({
      where: { companyId, id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Audit log event with id ${id} not found.`);
    }

    return event;
  }

  async getAuditSummary(companyId: string) {
    const [totalEvents, allEvents] = await Promise.all([
      this.prisma.auditEvent.count({ where: { companyId } }),
      this.prisma.auditEvent.findMany({
        where: { companyId },
        select: {
          action: true,
          resource: true,
          userName: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'desc' },
        take: 1000,
      }),
    ]);

    const actionCounts: Record<string, number> = {};
    const moduleCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    for (const ev of allEvents) {
      actionCounts[ev.action] = (actionCounts[ev.action] || 0) + 1;
      moduleCounts[ev.resource] = (moduleCounts[ev.resource] || 0) + 1;
      const userKey = ev.userName || 'System';
      userCounts[userKey] = (userCounts[userKey] || 0) + 1;
    }

    const recentHighImpact = await this.prisma.auditEvent.findMany({
      where: {
        companyId,
        action: { in: ['DELETE', 'POST', 'APPROVE', 'LOCK', 'REJECT', 'PRICE_CHANGE'] },
      },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    return {
      totalEvents,
      actionCounts,
      moduleCounts,
      topUsers: Object.entries(userCounts)
        .map(([user, count]) => ({ user, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      recentHighImpact,
    };
  }
}
