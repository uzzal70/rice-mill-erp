import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ProfitabilityDimension {
  PURCHASE = 'PURCHASE',
  BATCH = 'BATCH',
  PRODUCT = 'PRODUCT',
  BRAND = 'BRAND',
  FACTORY = 'FACTORY',
  CUSTOMER = 'CUSTOMER',
  INVOICE = 'INVOICE',
}

export class CalculateBatchProfitabilityDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  batchId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paddyRatePerKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  processingCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  electricityCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packagingCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overheadCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  projectedRiceSalesRatePerKg?: number;
}

export class ProfitabilityQueryDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsEnum(ProfitabilityDimension)
  dimension?: ProfitabilityDimension;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

