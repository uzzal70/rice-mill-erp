import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const money = /^\d{1,16}(\.\d{1,2})?$/;

export class ListPurchaseInvoicesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreatePurchaseInvoiceDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) goodsReceiptId!: string;
  @IsString() @Length(2, 32) invoiceNumber!: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() invoiceDate?: string;
  @IsOptional() @IsString() @Matches(money) qualityDeductionAmount?: string;
  @IsOptional() @IsString() @Matches(money) transportCost?: string;
  @IsOptional() @IsString() @Matches(money) loadingCost?: string;
  @IsOptional() @IsString() @Matches(money) unloadingCost?: string;
  @IsOptional() @IsString() @Matches(money) otherCost?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}
