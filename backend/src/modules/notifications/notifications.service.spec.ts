import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, NotificationStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma: any = {
    appNotification: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    notificationChannelConfig: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return unread count for company and user', async () => {
    mockPrisma.appNotification.count.mockResolvedValueOnce(5);
    const res = await service.getUnreadCount('c1', 'u1');
    expect(res.unreadCount).toBe(5);
    expect(mockPrisma.appNotification.count).toHaveBeenCalled();
  });

  it('should support all 4 channels: In-App, Email, SMS-ready, WhatsApp-ready', async () => {
    const channels = await service.listChannels('c1');
    expect(channels).toHaveLength(4);
    const types = channels.map((c) => c.channel);
    expect(types).toContain(NotificationChannel.IN_APP);
    expect(types).toContain(NotificationChannel.EMAIL);
    expect(types).toContain(NotificationChannel.SMS);
    expect(types).toContain(NotificationChannel.WHATSAPP);
  });

  it('should create notification with proper channel metadata formatting', async () => {
    mockPrisma.appNotification.create.mockImplementationOnce((args: any) =>
      Promise.resolve({ id: 'notif-1', ...args.data }),
    );

    const created = await service.createNotification({
      companyId: 'c1',
      channel: NotificationChannel.SMS,
      type: NotificationType.VEHICLE,
      title: 'Weighbridge Certified',
      message: 'Truck net weight 24,820 KG verified.',
    });

    expect(created.id).toBe('notif-1');
    expect(created.type).toBe(NotificationType.VEHICLE);
    expect(mockPrisma.appNotification.create).toHaveBeenCalled();
  });

  it('should dispatch test notifications across all 9 required types', async () => {
    const allTypes = Object.values(NotificationType);
    expect(allTypes).toContain(NotificationType.DUE);
    expect(allTypes).toContain(NotificationType.PAYMENT);
    expect(allTypes).toContain(NotificationType.LOW_STOCK);
    expect(allTypes).toContain(NotificationType.APPROVAL);
    expect(allTypes).toContain(NotificationType.PRODUCTION);
    expect(allTypes).toContain(NotificationType.QUALITY);
    expect(allTypes).toContain(NotificationType.VEHICLE);
    expect(allTypes).toContain(NotificationType.DOCUMENT_EXPIRY);
    expect(allTypes).toContain(NotificationType.MAINTENANCE);

    mockPrisma.appNotification.create.mockResolvedValue({ id: 'test-notif-1' });

    for (const notifType of allTypes) {
      const res = await service.dispatchTest(
        {
          companyId: 'c1',
          type: notifType,
          channel: NotificationChannel.IN_APP,
        },
        'usr-1',
      );
      expect(res).toBeDefined();
    }
  });

  it('should mark all notifications as read', async () => {
    const res = await service.markAllAsRead('c1', 'usr-1');
    expect(res.updatedCount).toBe(2);
    expect(mockPrisma.appNotification.updateMany).toHaveBeenCalled();
  });
});

