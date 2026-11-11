import { AlertCategory, AlertSeverity, AlertType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class AlertsQueryDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  factoryId?: string;

  @IsOptional()
  @IsEnum(AlertCategory)
  category?: AlertCategory;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  isDismissed?: string;
}

export class DismissAlertDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}

export class UpdateAlertRuleDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsEnum(AlertType)
  type!: AlertType;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  thresholdValue!: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RunScanDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  factoryId?: string;
}

