import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { LandedCostComponentType } from '@prisma/client';

const money = /^\d{1,16}(\.\d{1,2})?$/;

export class ListLandedCostsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListLandedCostComponentsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class LandedCostComponentDto {
  @IsString() @Length(1, 100) code!: string;
  @IsString() @Length(1, 100) name!: string;
  @IsEnum(LandedCostComponentType) type!: LandedCostComponentType;
  @IsString() @Matches(money) amount!: string;
}

export class CreateLandedCostDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) goodsReceiptId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LandedCostComponentDto) components!: LandedCostComponentDto[];
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

export class CreateLandedCostConfigDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string;
  @IsString() @Length(1, 100) name!: string;
  @IsString() @Matches(/^[A-Z0-9_-]{2,32}$/) code!: string;
  @IsEnum(LandedCostComponentType) type!: LandedCostComponentType;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}
