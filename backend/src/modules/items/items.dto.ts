import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ItemKind, UnitOfMeasure } from '@prisma/client';

export class PackagingSpecDto {
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(40) bagType?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) sizeKg!: number;
  @IsString() @Length(2, 80) material!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() supplierPartnerId?: string;
}

export class ListItemsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(ItemKind) kind?: ItemKind;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreateItemDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsEnum(ItemKind) kind!: ItemKind;
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 32) code!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(80) variety?: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @Type(() => Number) @IsInt() @Min(1900) @Max(2200) cropYear?: number | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) grade?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) localName?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) brand?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) riceType?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @Length(2, 80) byProductType?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) defaultPackagingLabel?: string | null;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) standardMoisture?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) standardRecovery?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) headRicePercentage?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) brokenPercentage?: number;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(UnitOfMeasure) baseUnit?: UnitOfMeasure;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(1000) description?: string | null;
  @ValidateIf((_, value) => value !== undefined) @ValidateNested() @Type(() => PackagingSpecDto) packagingSpec?: PackagingSpecDto;
}

export class UpdateItemDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 160) name?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 32) code?: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) variety?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @Type(() => Number) @IsInt() @Min(1900) @Max(2200) cropYear?: number | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) grade?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) localName?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) brand?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) riceType?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @Length(2, 80) byProductType?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) defaultPackagingLabel?: string | null;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) standardMoisture?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) standardRecovery?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) headRicePercentage?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) brokenPercentage?: number;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(1000) description?: string | null;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
}

export class CreateByProductDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsEnum(ItemKind) kind!: ItemKind;
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 32) code!: string;
  @IsString() @Length(2, 80) byProductType!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) purchasePrice!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) salesPrice!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(80) grade?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(1000) description?: string | null;
}

export class CreatePackagingDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 32) code!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(40) bagType?: string | null;
  @IsString() @Matches(/^(?=.*[1-9])\d{1,11}(\.\d{1,3})?$/) sizeKg!: string;
  @IsString() @Length(2, 80) material!: string;
  @IsString() @Matches(/^\d{1,14}(\.\d{1,4})?$/) unitCost!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @Length(1, 100) supplierPartnerId?: string | null;
}

export class ItemFinancialDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d+(\.\d{1,4})?$/) purchasePrice?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d+(\.\d{1,4})?$/) salesPrice?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d+(\.\d{1,4})?$/) packagingUnitCost?: string;
}

export class UpdatePackagingSpecDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 160) name?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 32) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) code?: string;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(40) bagType?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) sizeKg!: number;
  @IsString() @Length(2, 80) material!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() supplierPartnerId?: string | null;
}
