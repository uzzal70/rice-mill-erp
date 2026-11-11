import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import {
  ConfigureChannelDto,
  CreateNotificationDto,
  DispatchTestNotificationDto,
  ListNotificationsDto,
  MarkAllNotificationsReadDto,
  MarkNotificationReadDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission('dashboard', PermissionAction.READ)
  listNotifications(@Query() query: ListNotificationsDto) {
    return this.notificationsService.listNotifications(query);
  }

  @Get('unread-count')
  @RequirePermission('dashboard', PermissionAction.READ)
  getUnreadCount(
    @Query('companyId') companyId: string,
    @Query('userId') userId?: string,
  ) {
    return this.notificationsService.getUnreadCount(companyId, userId);
  }

  @Get('channels')
  @RequirePermission('settings', PermissionAction.READ)
  listChannels(@Query('companyId') companyId: string) {
    return this.notificationsService.listChannels(companyId);
  }

  @Post()
  @RequirePermission('settings', PermissionAction.CREATE)
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Post('channels')
  @RequirePermission('settings', PermissionAction.UPDATE)
  configureChannel(@Body() dto: ConfigureChannelDto) {
    return this.notificationsService.configureChannel(dto);
  }

  @Post('mark-read')
  @RequirePermission('dashboard', PermissionAction.UPDATE)
  markAsRead(@Body() dto: MarkNotificationReadDto) {
    return this.notificationsService.markAsRead(dto.companyId, dto.notificationId);
  }

  @Post('mark-all-read')
  @RequirePermission('dashboard', PermissionAction.UPDATE)
  markAllAsRead(@Body() dto: MarkAllNotificationsReadDto) {
    return this.notificationsService.markAllAsRead(dto.companyId, dto.userId);
  }

  @Post('dispatch')
  @RequirePermission('settings', PermissionAction.CREATE)
  dispatchTest(
    @Body() dto: DispatchTestNotificationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.dispatchTest(dto, req.user?.id || 'system-admin');
  }
}

