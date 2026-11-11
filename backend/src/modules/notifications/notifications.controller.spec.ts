import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    listNotifications: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 3 }),
    listChannels: jest.fn().mockResolvedValue([]),
    createNotification: jest.fn().mockResolvedValue({ id: 'n1' }),
    configureChannel: jest.fn().mockResolvedValue({ id: 'cfg1' }),
    markAsRead: jest.fn().mockResolvedValue({ id: 'n1', isRead: true }),
    markAllAsRead: jest.fn().mockResolvedValue({ updatedCount: 3 }),
    dispatchTest: jest.fn().mockResolvedValue({ id: 'n1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get unread count', async () => {
    const res = await controller.getUnreadCount('c1');
    expect(res.unreadCount).toBe(3);
    expect(mockService.getUnreadCount).toHaveBeenCalledWith('c1', undefined);
  });

  it('should delegate markAllAsRead to service', async () => {
    const res = await controller.markAllAsRead({ companyId: 'c1' });
    expect(res.updatedCount).toBe(3);
    expect(mockService.markAllAsRead).toHaveBeenCalled();
  });
});

