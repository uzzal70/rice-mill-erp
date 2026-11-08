import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { BrokerCommissionType, PartnerType } from '@prisma/client';

export class ListPartnersDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(PartnerType) type?: PartnerType;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListPartnerLedgerDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreatePartnerDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsEnum(PartnerType) type!: PartnerType;
  @IsString() @Length(2, 160) name!: string;
  @IsString() @Length(1, 32) code!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(160) businessName?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) phone?: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsEmail() email?: string | null;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(500) address?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) nid?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) tin?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) bin?: string;
}

export class CreateBrokerDto extends CreatePartnerDto {
  @IsEnum(BrokerCommissionType) commissionType!: BrokerCommissionType;
  @IsString() @Matches(/^\d+(\.\d{1,4})?$/) commissionRate!: string;
}

export class UpdatePartnerDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 160) name?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 32) code?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(160) businessName?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) phone?: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsEmail() email?: string | null;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(500) address?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) nid?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) tin?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) bin?: string;
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() active?: boolean;
}

export class PartnerFinancialDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(100) bankName?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(64) bankAccount?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @MaxLength(32) paymentMethod?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @IsString() @Matches(/^\d+(\.\d{1,2})?$/) creditLimit?: string | null;
  @ValidateIf((_, value) => value !== undefined && value !== null) @Type(() => Number) @IsInt() @Min(0) @Max(3650) paymentTermsDays?: number | null;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^-?\d+(\.\d{1,2})?$/) openingBalance?: string;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(BrokerCommissionType) commissionType?: BrokerCommissionType;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d+(\.\d{1,4})?$/) commissionRate?: string;
}
