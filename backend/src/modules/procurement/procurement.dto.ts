import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class ListPurchasesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreatePurchaseOrderDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) gateEntryId!: string;
  @IsString() @Length(1, 100) supplierId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) brokerId?: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) destinationGodownId!: string;
  @IsString() @Length(1, 100) destinationStackId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) qualitySampleId?: string;
  @IsString() @Length(2, 32) orderNumber!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) unitRate!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}

export class PurchaseActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class ListGoodsReceiptsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreateGoodsReceiptDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) purchaseOrderId!: string;
  @IsString() @Length(2, 32) receiptNumber!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) quantity!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}
