import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum ImportEntityType {
  SUPPLIERS = 'SUPPLIERS',
  CUSTOMERS = 'CUSTOMERS',
  PADDY = 'PADDY',
  RICE = 'RICE',
  OPENING_STOCK = 'OPENING_STOCK',
  OPENING_BALANCE = 'OPENING_BALANCE',
  EMPLOYEES = 'EMPLOYEES',
}

export class ValidateImportDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsEnum(ImportEntityType)
  entityType!: ImportEntityType;

  @IsArray()
  rows!: Array<Record<string, any>>;
}

export class CommitImportDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsEnum(ImportEntityType)
  entityType!: ImportEntityType;

  @IsArray()
  records!: Array<Record<string, any>>;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface ValidatedRecordItem {
  rowNumber: number;
  isValid: boolean;
  data: Record<string, any>;
  errors: ValidationErrorItem[];
}

export interface ImportValidationResult {
  entityType: ImportEntityType;
  totalRecords: number;
  validCount: number;
  invalidCount: number;
  records: ValidatedRecordItem[];
}

export interface ImportCommitResult {
  entityType: ImportEntityType;
  success: boolean;
  importedCount: number;
  message: string;
}

export interface ImportTemplateMeta {
  entityType: ImportEntityType;
  title: string;
  titleBn: string;
  description: string;
  columns: Array<{
    field: string;
    label: string;
    required: boolean;
    type: 'string' | 'number' | 'date' | 'enum';
    example: string;
  }>;
}

