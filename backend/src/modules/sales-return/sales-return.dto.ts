import { Type } from 'class-transformer';
import {
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { SalesReturnCondition, SalesReturnSettlement, SalesReturnType } from '@prisma/client';

export class CreateSalesReturnLineDto {
  @IsString()
  salesOrderLineId!: string;

  @IsOptional()
  @IsString()
  dispatchLineId?: string;

  @IsString()
  itemId!: string;

  @IsString()
  restockStackId!: string;

  @IsEnum(SalesReturnCondition)
  condition!: SalesReturnCondition;

  @IsOptional()
  @IsInt()
  @Min(0)
  bagCount?: number;

  @IsNumberString()
  returnKg!: string;

  @IsOptional()
  @IsNumberString()
  unitRate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  damageNotes?: string;
}

export class CreateSalesReturnDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  salesOrderId!: string;

  @IsOptional()
  @IsString()
  dispatchId?: string;

  @IsString()
  customerId!: string;

  @IsString()
  @Length(3, 40)
  returnNumber!: string;

  @IsOptional()
  @IsString()
  @Length(3, 40)
  creditNoteNumber?: string;

  @IsEnum(SalesReturnType)
  type!: SalesReturnType;

  @IsEnum(SalesReturnSettlement)
  settlement!: SalesReturnSettlement;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsString()
  @Length(3, 500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnLineDto)
  lines!: CreateSalesReturnLineDto[];
}

export class ListSalesReturnDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  dispatchId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

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

export class SalesReturnActionDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;
}
