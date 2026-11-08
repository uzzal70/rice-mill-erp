import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class ListWarehouseDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
}

export class CreateGodownDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(1, 32) code!: string;
}

export class CreateStackDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) godownId!: string;
  @IsString() @Length(1, 32) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) code!: string;
  @IsString() @Matches(/^(?=.*[1-9])\d{1,11}(\.\d{1,3})?$/) capacityKg!: string;
  @IsOptional() @IsString() @Length(1, 100) materialItemId?: string | null;
  @IsOptional() @IsString() @MaxLength(120) varietyName?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2200) cropYear?: number | null;
  @IsOptional() @IsString() @MaxLength(80) batchNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(80) lotNumber?: string | null;
  @IsOptional() @IsDateString() receivedAt?: string | null;
}

export class UpdateStackDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @Length(1, 32) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) code?: string;
  @IsOptional() @IsString() @Matches(/^(?=.*[1-9])\d{1,11}(\.\d{1,3})?$/) capacityKg?: string;
  @IsOptional() @IsString() @Length(1, 100) materialItemId?: string | null;
  @IsOptional() @IsString() @MaxLength(120) varietyName?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2200) cropYear?: number | null;
  @IsOptional() @IsString() @MaxLength(80) batchNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(80) lotNumber?: string | null;
  @IsOptional() @IsDateString() receivedAt?: string | null;
}

export class ListInventoryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) itemId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) stackId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) sourceType?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListByProductActivityDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListPackagingStockDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListStacksDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) godownId?: string;
}

export class CreateStockTransferDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) transferNumber!: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) sourceStackId!: string;
  @IsString() @Length(1, 100) destinationStackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) quantity!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) reason?: string;
}

export class CreateStockAdjustmentDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) adjustmentNumber!: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) stackId!: string;
  @IsString() @Matches(/^-?\d{1,15}(\.\d{1,3})?$/) quantity!: string;
  @IsString() @Length(3, 1000) reason!: string;
}

export class ListStockCountsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) itemId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) stackId?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreateStockCountDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) countNumber!: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) stackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) countedQuantity!: string;
  @IsString() @Length(3, 1000) reason!: string;
}

export class StockCountActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
