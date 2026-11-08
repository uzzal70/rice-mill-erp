import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const SALES_CHANNELS = [
  'WHOLESALE',
  'RETAIL',
  'DEALER',
  'DISTRIBUTOR',
  'INSTITUTIONAL',
  'CASH',
  'CREDIT',
  'EXPORT',
] as const;

export type SalesChannel = typeof SALES_CHANNELS[number];

export class ListSalesQuotationsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) page = 1;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) @Max(100) pageSize = 25;
}

export class SalesQuotationLineDto {
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) quantityKg!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) unitRate!: string;
}

export class CreateSalesQuotationDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) quotationNumber!: string;
  @IsString() @Length(1, 100) customerId!: string;
  @IsIn(SALES_CHANNELS) channel!: SalesChannel;
  @IsDateString() validUntil!: string;
  @IsOptional() @IsString() @Length(1, 10) currency?: string;
  @IsOptional() @IsString() @Matches(/^\d{1,8}(\.\d{1,4})?$/) exchangeRate?: string;
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SalesQuotationLineDto) lines!: SalesQuotationLineDto[];
}

export class SalesQuotationActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class ListSalesOrdersDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(SALES_CHANNELS) channel?: SalesChannel;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) page = 1;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) @Max(100) pageSize = 25;
}

export class SalesOrderLineDto {
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) stackId!: string;
  @IsOptional() @IsString() @Length(1, 100) packagingItemId?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) bagCount?: number;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) quantityKg!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) unitRate!: string;
}

export class CreateSalesOrderDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) orderNumber!: string;
  @IsString() @Length(1, 100) customerId!: string;
  @IsIn(SALES_CHANNELS) channel!: SalesChannel;
  @IsOptional() @IsString() @Length(1, 100) quotationId?: string;
  @IsOptional() @IsDateString() requestedDelivery?: string;
  @IsOptional() @IsString() @Length(1, 10) currency?: string;
  @IsOptional() @IsString() @Matches(/^\d{1,8}(\.\d{1,4})?$/) exchangeRate?: string;
  @IsOptional() @IsString() @MaxLength(100) exportCountry?: string;
  @IsOptional() @IsString() @MaxLength(100) portOfDischarge?: string;
  @IsOptional() @IsString() @MaxLength(100) lcNumber?: string;
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SalesOrderLineDto) lines!: SalesOrderLineDto[];
}

export class SalesOrderActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
