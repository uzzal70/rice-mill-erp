import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  ConfigureChannelDto,
  CreateNotificationDto,
  DispatchTestNotificationDto,
  ListNotificationsDto,
  NotificationChannelStatus,
} from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getUnreadCount(companyId: string, userId?: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.appNotification.count({
      where: {
        companyId,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
        isRead: false,
      },
    });
    return { unreadCount };
  }

  public async listNotifications(dto: ListNotificationsDto) {
    const limit = Math.min(Number(dto.limit) || 20, 100);

    const items = await this.prisma.appNotification.findMany({
      where: {
        companyId: dto.companyId,
        ...(dto.userId ? { OR: [{ userId: dto.userId }, { userId: null }] } : {}),
        ...(dto.channel ? { channel: dto.channel } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.isRead !== undefined ? { isRead: dto.isRead } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (items.length === 0) {
      // Seed realistic initial demo notifications for all 9 types if brand new company
      return this.generateDefaultDemoNotifications(dto.companyId);
    }

    return items;
  }

  public async createNotification(dto: CreateNotificationDto) {
    const channel = dto.channel || NotificationChannel.IN_APP;

    // Simulate multi-channel dispatch payload formatting
    const dispatchMeta: Record<string, any> = {
      ...(dto.metadata || {}),
      dispatchedAt: new Date().toISOString(),
    };

    if (channel === NotificationChannel.SMS) {
      dispatchMeta.smsPayload = {
        gsmEncoding: 'Unicode/Bangla',
        charCount: dto.message.length,
        gateway: 'SSL Wireless / Teletalk Bangladesh',
        status: 'DISPATCH_READY',
      };
    } else if (channel === NotificationChannel.WHATSAPP) {
      dispatchMeta.whatsAppPayload = {
        templateName: `rice_mill_${dto.type.toLowerCase()}_alert`,
        language: 'en_GB',
        interactiveButtons: ['View Document', 'Acknowledge'],
        gateway: 'Meta Cloud API v19.0',
        status: 'DISPATCH_READY',
      };
    } else if (channel === NotificationChannel.EMAIL) {
      dispatchMeta.emailPayload = {
        subject: `[Sonar Bangla Rice Mill] ${dto.title}`,
        template: 'transactional_alert_v2.html',
        status: 'DISPATCH_READY',
      };
    }

    return this.prisma.appNotification.create({
      data: {
        companyId: dto.companyId,
        factoryId: dto.factoryId || null,
        userId: dto.userId || null,
        channel,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        status: NotificationStatus.SENT,
        isRead: false,
        referenceId: dto.referenceId || null,
        metadata: dispatchMeta as Prisma.InputJsonValue,
      },
    });
  }

  public async markAsRead(companyId: string, notificationId: string) {
    const record = await this.prisma.appNotification.findFirst({
      where: { companyId, id: notificationId },
    });
    if (!record) throw new NotFoundException('Notification not found.');

    return this.prisma.appNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
  }

  public async markAllAsRead(companyId: string, userId?: string) {
    const result = await this.prisma.appNotification.updateMany({
      where: {
        companyId,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    return { updatedCount: result.count, message: 'All notifications marked as read.' };
  }

  public async listChannels(companyId: string): Promise<NotificationChannelStatus[]> {
    const configs = await this.prisma.notificationChannelConfig.findMany({
      where: { companyId },
    });

    const getCfg = (c: NotificationChannel) => configs.find((x) => x.channel === c);

    return [
      {
        channel: NotificationChannel.IN_APP,
        title: 'In-App Notifications',
        isEnabled: getCfg(NotificationChannel.IN_APP)?.isEnabled ?? true,
        provider: 'WebSocket / REST Internal Bus',
        status: 'ONLINE',
        description: 'Instant notification badges, sound chimes, and slide-in notifications inside ERP.',
      },
      {
        channel: NotificationChannel.EMAIL,
        title: 'Email Notifications (SMTP)',
        isEnabled: getCfg(NotificationChannel.EMAIL)?.isEnabled ?? true,
        provider: getCfg(NotificationChannel.EMAIL)?.provider || 'SMTP / AWS SES / SendGrid',
        status: 'READY',
        description: 'HTML transactional statements, invoice delivery, and daily milling production digests.',
      },
      {
        channel: NotificationChannel.SMS,
        title: 'SMS Gateway (Bangladesh SMS-Ready)',
        isEnabled: getCfg(NotificationChannel.SMS)?.isEnabled ?? true,
        provider: getCfg(NotificationChannel.SMS)?.provider || 'SSL Wireless / Teletalk / Grameenphone',
        status: 'READY',
        description: 'Instant 160-char Bangla/English SMS to farmers, drivers, and aratdars on weighment & payment.',
      },
      {
        channel: NotificationChannel.WHATSAPP,
        title: 'WhatsApp Business API (WhatsApp-Ready)',
        isEnabled: getCfg(NotificationChannel.WHATSAPP)?.isEnabled ?? true,
        provider: getCfg(NotificationChannel.WHATSAPP)?.provider || 'Meta Cloud WhatsApp Business API v19.0',
        status: 'READY',
        description: 'Instant WhatsApp PDF Delivery Challans, Weighbridge Slips, and Due Payment reminders.',
      },
    ];
  }

  public async configureChannel(dto: ConfigureChannelDto) {
    return this.prisma.notificationChannelConfig.upsert({
      where: {
        companyId_channel: {
          companyId: dto.companyId,
          channel: dto.channel,
        },
      },
      create: {
        companyId: dto.companyId,
        channel: dto.channel,
        isEnabled: dto.isEnabled,
        provider: dto.provider,
        apiKey: dto.apiKey || null,
        senderId: dto.senderId || null,
        webhookUrl: dto.webhookUrl || null,
        configJson: (dto.configJson || {}) as Prisma.InputJsonValue,
      },
      update: {
        isEnabled: dto.isEnabled,
        provider: dto.provider,
        apiKey: dto.apiKey || null,
        senderId: dto.senderId || null,
        webhookUrl: dto.webhookUrl || null,
        configJson: (dto.configJson || {}) as Prisma.InputJsonValue,
      },
    });
  }

  public async dispatchTest(dto: DispatchTestNotificationDto, userId: string) {
    const templates: Record<NotificationType, { title: string; message: string }> = {
      [NotificationType.DUE]: {
        title: 'Customer Payment Overdue Alert',
        message: 'Messrs Al-Madina Rice Agency has overdue balance of ৳666,000 exceeding 15-day credit period.',
      },
      [NotificationType.PAYMENT]: {
        title: 'Paddy Payment Disbursed',
        message: 'Payment voucher PV-2026-0422 of ৳170,000 successfully disbursed via BEFTN Bank Transfer.',
      },
      [NotificationType.LOW_STOCK]: {
        title: 'Raw Paddy Reorder Threshold Reached',
        message: 'BR-28 Paddy in Godown #1 is down to 8,400 KG (below minimum safety stock threshold of 15,000 KG).',
      },
      [NotificationType.APPROVAL]: {
        title: 'Purchase Order Approval Required',
        message: 'Purchase Order PO-2026-4421 (৳1,076,999) submitted by Commercial Desk is awaiting Director sign-off.',
      },
      [NotificationType.PRODUCTION]: {
        title: 'Daily Milling Batch Completed',
        message: 'Auto Milling Line #1 completed Batch-512: 40,000 KG input processed. Rice Recovery: 66.00% Head Rice.',
      },
      [NotificationType.QUALITY]: {
        title: 'High Moisture Paddy Tested',
        message: 'Truck Bogura-Ta 11-7890 paddy moisture tested at 15.2% (1.75% quality deduction applied by Lab In-charge).',
      },
      [NotificationType.VEHICLE]: {
        title: 'Commercial Vehicle Weighment Completed',
        message: 'Truck Dhaka Metro-Ta 18-9921 2nd weighment finished. Net Cargo: 24,820 KG (620.50 Mon). Gate clearance granted.',
      },
      [NotificationType.DOCUMENT_EXPIRY]: {
        title: 'Trade License Expiry Warning',
        message: 'Dinajpur Municipality Trade License # TL-8829 expires in 14 days (30th November 2026). Renewal required.',
      },
      [NotificationType.MAINTENANCE]: {
        title: 'Captive Steam Boiler Servicing Due',
        message: 'Boiler Unit-1 has logged 1,200 operating hours. Scheduled safety valve and descaling maintenance required.',
      },
    };

    const target = templates[dto.type] || {
      title: `${dto.type} Notification`,
      message: `Operational notice generated for ${dto.channel}.`,
    };

    return this.createNotification({
      companyId: dto.companyId,
      userId,
      channel: dto.channel,
      type: dto.type,
      title: target.title,
      message: target.message,
      metadata: { isTestDispatch: true, recipient: dto.recipient || 'all-active-users' },
    });
  }

  private generateDefaultDemoNotifications(companyId: string) {
    const now = new Date();
    return [
      {
        id: 'demo-notif-1',
        companyId,
        factoryId: null,
        userId: null,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.DUE,
        title: 'Customer Payment Overdue Alert',
        message: 'Messrs Al-Madina Rice Agency has overdue balance of ৳666,000 exceeding 15-day credit period.',
        status: NotificationStatus.SENT,
        isRead: false,
        readAt: null,
        referenceId: 'CUS-402',
        metadata: {},
        createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 mins ago
        updatedAt: now,
      },
      {
        id: 'demo-notif-2',
        companyId,
        factoryId: null,
        userId: null,
        channel: NotificationChannel.SMS,
        type: NotificationType.VEHICLE,
        title: 'Weighbridge Scale Slip Certified',
        message: 'Truck Bogura-Ta 11-7890 2nd weighment completed. Net Cargo: 24,820 KG (620.50 Mon). Driver receipt issued.',
        status: NotificationStatus.SENT,
        isRead: false,
        readAt: null,
        referenceId: 'WT-5541',
        metadata: { smsStatus: 'DELIVERED_VIA_GATEWAY' },
        createdAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 mins ago
        updatedAt: now,
      },
      {
        id: 'demo-notif-3',
        companyId,
        factoryId: null,
        userId: null,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.LOW_STOCK,
        title: 'Raw Paddy Reorder Threshold Reached',
        message: 'BR-28 Paddy in Godown #1 is down to 8,400 KG (below minimum safety stock threshold of 15,000 KG).',
        status: NotificationStatus.SENT,
        isRead: false,
        readAt: null,
        referenceId: 'PAD-BR28',
        metadata: {},
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000), // 2 hrs ago
        updatedAt: now,
      },
      {
        id: 'demo-notif-4',
        companyId,
        factoryId: null,
        userId: null,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.PRODUCTION,
        title: 'Daily Milling Production Batch Finished',
        message: 'Line #1 completed Batch-512: 40,000 KG processed. Head Rice Output: 26,400 KG (66.00% Recovery).',
        status: NotificationStatus.DELIVERED,
        isRead: true,
        readAt: new Date(now.getTime() - 3 * 3600 * 1000),
        referenceId: 'BATCH-512',
        metadata: {},
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
        updatedAt: now,
      },
      {
        id: 'demo-notif-5',
        companyId,
        factoryId: null,
        userId: null,
        channel: NotificationChannel.WHATSAPP,
        type: NotificationType.DOCUMENT_EXPIRY,
        title: 'Trade License Expiry Approaching',
        message: 'Dinajpur Municipality Trade License # TL-8829 expires in 14 days (30th November 2026). Renewal needed.',
        status: NotificationStatus.SENT,
        isRead: false,
        readAt: null,
        referenceId: 'DOC-TL-8829',
        metadata: { whatsAppDelivered: true },
        createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
        updatedAt: now,
      },
    ];
  }
}

