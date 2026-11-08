import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import { MoistureDeductionFormula } from '@prisma/client';

const moisturePercentage = /^\d{1,3}(\.\d{1,3})?$/;
const deductionPercentage = /^\d{1,3}(\.\d{1,4})?$/;

export class MoistureSlabDto {
  @IsString() @Matches(deductionPercentage) minExcessPct!: string;
  @IsString() @Matches(deductionPercentage) deductionPct!: string;
}

export class ListMoisturePoliciesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) factoryId?: string;
}

export class SaveMoisturePolicyDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(2, 100) name!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string | null;
  @IsOptional() @IsString() @Length(1, 100) paddyItemId?: string | null;
  @IsOptional() @IsString() @Length(1, 100) supplierPartnerId?: string | null;
  @IsBoolean() active!: boolean;
  @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) priority!: number;
  @IsString() @Matches(moisturePercentage) allowedMoisturePct!: string;
  @IsString() @Matches(moisturePercentage) tolerancePct!: string;
  @IsEnum(MoistureDeductionFormula) formula!: MoistureDeductionFormula;
  @IsString() @Matches(deductionPercentage) rateDeductionPct!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MoistureSlabDto) slabs?: MoistureSlabDto[];
}
