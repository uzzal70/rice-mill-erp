import { NotificationChannel, NotificationStatus, NotificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ListNotificationsDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class MarkNotificationReadDto {
  @IsString()
  companyId!: string;

  @IsString()
  notificationId!: string;
}

export class MarkAllNotificationsReadDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ConfigureChannelDto {
  @IsString()
  companyId!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  isEnabled!: boolean;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;
}

export class DispatchTestNotificationDto {
  @IsString()
  companyId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  recipient?: string;
}

export interface NotificationChannelStatus {
  channel: NotificationChannel;
  title: string;
  isEnabled: boolean;
  provider: string;
  status: 'ONLINE' | 'STANDBY' | 'READY';
  description: string;
}

