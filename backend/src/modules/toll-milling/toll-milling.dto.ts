import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ByProductPolicy, TollOrderStatus, TollRateBasis } from '@prisma/client';

export class CreateTollOrderDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  paddyItemId!: string;

  @IsString()
  @Length(3, 40)
  orderNumber!: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  driverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  challanNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  receivedBagCount?: number;

  @IsNumberString()
  receivedQuantityKg!: string;

  @IsNumberString()
  tollRate!: string;

  @IsEnum(TollRateBasis)
  tollRateBasis!: TollRateBasis;

  @IsEnum(ByProductPolicy)
  byProductPolicy!: ByProductPolicy;

  @IsOptional()
  @IsNumberString()
  additionalCharges?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}

export class ListTollOrderDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class CreateTollBatchDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  @Length(3, 40)
  batchNumber!: string;

  @IsNumberString()
  inputPaddyKg!: string;

  @IsNumberString()
  headRiceKg!: string;

  @IsOptional()
  @IsNumberString()
  brokenRiceKg?: string;

  @IsOptional()
  @IsNumberString()
  riceBranKg?: string;

  @IsOptional()
  @IsNumberString()
  huskKg?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}

export class CreateTollDeliveryDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  @Length(3, 40)
  deliveryNumber!: string;

  @IsString()
  @Length(3, 40)
  gatePassNumber!: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsString()
  @Length(2, 60)
  vehicleNumber!: string;

  @IsString()
  @Length(2, 80)
  driverName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  driverMobile?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalBags?: number;

  @IsNumberString()
  riceDeliveredKg!: string;

  @IsOptional()
  @IsNumberString()
  brokenRiceDeliveredKg?: string;

  @IsOptional()
  @IsNumberString()
  byProductDeliveredKg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}

export class TollOrderActionDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;
}

