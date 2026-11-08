import { IsDateString, IsEnum, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { UnitOfMeasure } from '@prisma/client';

export class ListUnitConversionsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() asOf?: string;
}

export class CreateUnitConversionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsEnum(UnitOfMeasure) fromUnit!: UnitOfMeasure;
  @IsEnum(UnitOfMeasure) toUnit!: UnitOfMeasure;
  @IsString() @Matches(/^\d+(\.\d{1,8})?$/) factor!: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() effectiveFrom?: string;
}

export class ConvertQuantityDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsEnum(UnitOfMeasure) fromUnit!: UnitOfMeasure;
  @IsEnum(UnitOfMeasure) toUnit!: UnitOfMeasure;
  @IsString() @Matches(/^\d+(\.\d{1,6})?$/) quantity!: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() asOf?: string;
}
