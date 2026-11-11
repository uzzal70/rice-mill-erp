import { TaxType, UnitOfMeasure } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTaxConfigDto {
  @IsString()
  companyId!: string;

  @IsEnum(TaxType)
  taxType!: TaxType;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  ratePercent!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sroReference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListTaxConfigsDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class CalculateTaxDto {
  @IsString()
  companyId!: string;

  @IsNumber()
  @Min(0)
  baseAmount!: number;

  @IsArray()
  @IsEnum(TaxType, { each: true })
  taxTypes!: TaxType[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export interface TaxCalculationLine {
  taxType: TaxType;
  ruleName: string;
  ratePercent: number;
  taxAmount: number;
  sroReference?: string;
  isWithholding: boolean; // TDS / VDS are withholdings (deductions)
}

export interface TaxCalculationResult {
  baseAmount: number;
  currency: string;
  asOf: string;
  category: string;
  lines: TaxCalculationLine[];
  totalVatAmount: number;
  totalWithholdingAmount: number; // TDS + VDS
  netPayableAmount: number; // baseAmount + VAT - (TDS + VDS)
}

export interface BangladeshDefaultsResponse {
  currency: {
    code: string;
    symbol: string;
    name: string;
    subUnit: string;
    numberingSystem: string;
  };
  supportedUnits: UnitOfMeasure[];
  defaultConversions: Array<{
    fromUnit: UnitOfMeasure;
    toUnit: UnitOfMeasure;
    factor: number;
    description: string;
    isConfigurable: boolean;
  }>;
  taxSystem: {
    supportedTypes: TaxType[];
    effectiveDateBased: boolean;
    activeRuleCount: number;
    description: string;
  };
}

