import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLineCheckDto {
  @IsNumber()
  debit: number;

  @IsNumber()
  credit: number;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class VerifyTransactionDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsArray()
  userRoles?: string[];

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @IsOptional()
  @IsString()
  gateNumber?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  tareWeightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(35)
  moisturePercent?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineCheckDto)
  journalLines?: JournalLineCheckDto[];

  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @IsOptional()
  @IsNumber()
  newPrice?: number;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  stackId?: string;

  @IsOptional()
  @IsNumber()
  deductKg?: number;
}
