import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsString()
  employeeCode!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  nid?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  department!: string;

  @IsString()
  designation!: string;

  @IsDateString()
  joiningDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyWage?: number;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class RecordAttendanceDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsString()
  employeeId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateLoanAdvanceDto {
  @IsString()
  companyId!: string;

  @IsString()
  employeeId!: string;

  @IsString()
  type!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  principalAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyDeduction!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BonusOverrideDto {
  @IsString()
  employeeId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusAmount!: number;
}

export class GeneratePayrollDto {
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsString()
  monthYear!: string; // format YYYY-MM e.g. "2026-11"

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonusOverrideDto)
  bonusOverrides?: BonusOverrideDto[];
}

