import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum ReportType {
  PROCUREMENT_REGISTER = 'PROCUREMENT_REGISTER',
  GATE_REGISTER = 'GATE_REGISTER',
  PRODUCTION_REGISTER = 'PRODUCTION_REGISTER',
  SALES_REGISTER = 'SALES_REGISTER',
  STOCK_REGISTER = 'STOCK_REGISTER',
  EXPENSE_REGISTER = 'EXPENSE_REGISTER',
  FINANCIAL_LEDGER = 'FINANCIAL_LEDGER',
  PARTY_STATEMENT = 'PARTY_STATEMENT',
}

export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PRINT = 'PRINT',
}

export class GenerateReportDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsEnum(ReportType)
  reportType!: ReportType;

  // 1. Date Range
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // 2. Factory
  @IsOptional()
  @IsString()
  @Length(1, 100)
  factoryId?: string;

  // 3. Godown
  @IsOptional()
  @IsString()
  @Length(1, 100)
  godownId?: string;

  // 4. Supplier
  @IsOptional()
  @IsString()
  @Length(1, 100)
  supplierId?: string;

  // 5. Customer
  @IsOptional()
  @IsString()
  @Length(1, 100)
  customerId?: string;

  // 6. Paddy Item
  @IsOptional()
  @IsString()
  @Length(1, 100)
  paddyItemId?: string;

  // 7. Rice Item
  @IsOptional()
  @IsString()
  @Length(1, 100)
  riceItemId?: string;

  // 8. Product / Byproduct Item
  @IsOptional()
  @IsString()
  @Length(1, 100)
  productItemId?: string;

  // 9. Batch
  @IsOptional()
  @IsString()
  @Length(1, 100)
  batchNumber?: string;

  // 10. User
  @IsOptional()
  @IsString()
  @Length(1, 100)
  userId?: string;

  // Export format
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}

