import {
  AccountSubtype,
  AccountType,
  DocumentStatus,
  JournalStatus,
  VoucherType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  companyId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsEnum(AccountSubtype)
  subtype?: AccountSubtype;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateAccountDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsEnum(AccountSubtype)
  subtype?: AccountSubtype;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class JournalLineInputDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsString()
  accountCode!: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  debit!: number;

  @IsNumber()
  @Min(0)
  credit!: number;
}

export class CreateJournalDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsEnum(VoucherType)
  voucherType?: VoucherType;

  @IsOptional()
  @IsString()
  voucherDate?: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsOptional()
  @IsString()
  chequeOrRefNo?: string;

  @IsOptional()
  @IsString()
  partnerId?: string;

  @IsOptional()
  @IsEnum(JournalStatus)
  status?: JournalStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineInputDto)
  lines!: JournalLineInputDto[];
}

export class ListJournalDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsEnum(VoucherType)
  voucherType?: VoucherType;

  @IsOptional()
  @IsEnum(JournalStatus)
  status?: JournalStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  accountCode?: string;
}

export class GeneralLedgerQueryDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  accountCode?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class TrialBalanceQueryDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  asOfDate?: string;
}

export class FinancialReportQueryDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  factoryId?: string;
}

