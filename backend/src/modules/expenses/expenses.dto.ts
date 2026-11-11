import { DocumentStatus, ExpenseCategory, ExpensePaymentMode, ExpenseType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExpenseLineDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  accountCode?: string;
}

export class CreateExpenseDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  title!: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsEnum(ExpenseType)
  type!: ExpenseType;

  @IsOptional()
  @IsEnum(ExpensePaymentMode)
  paymentMode?: ExpensePaymentMode;

  @IsOptional()
  @IsString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  payeeName?: string;

  @IsOptional()
  @IsString()
  payeePartnerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  productionLineId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  chequeOrTxnNumber?: string;

  @IsOptional()
  @IsString()
  billReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines!: ExpenseLineDto[];
}

export class UpdateExpenseDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(ExpensePaymentMode)
  paymentMode?: ExpensePaymentMode;

  @IsOptional()
  @IsString()
  expenseDate?: string;

  @IsOptional()
  @IsString()
  payeeName?: string;

  @IsOptional()
  @IsString()
  payeePartnerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  productionLineId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  chequeOrTxnNumber?: string;

  @IsOptional()
  @IsString()
  billReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines?: ExpenseLineDto[];
}

export class ExpenseActionDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListExpenseDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(ExpensePaymentMode)
  paymentMode?: ExpensePaymentMode;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

