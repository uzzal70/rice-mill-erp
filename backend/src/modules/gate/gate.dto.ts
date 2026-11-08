import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { GateDirection, GatePurpose, GateStatus, QualityDecision, QualitySampleType } from '@prisma/client';

export class ListVehiclesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) factoryId?: string;
  @ValidateIf((_, value) => value !== undefined) @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() active?: boolean;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreateVehicleDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(2, 32) vehicleNumber!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) registrationNumber?: string;
  @IsString() @Length(2, 80) vehicleType!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(160) ownerName?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(160) driverName?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) driverMobile?: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() fitnessExpiry?: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() insuranceExpiry?: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() taxTokenExpiry?: string;
}

export class UpdateVehicleDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 32) vehicleNumber?: string;
  @IsOptional() @IsString() @MaxLength(32) registrationNumber?: string | null;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 80) vehicleType?: string;
  @IsOptional() @IsString() @MaxLength(160) ownerName?: string | null;
  @IsOptional() @IsString() @MaxLength(160) driverName?: string | null;
  @IsOptional() @IsString() @MaxLength(32) driverMobile?: string | null;
  @IsOptional() @IsDateString() fitnessExpiry?: string | null;
  @IsOptional() @IsDateString() insuranceExpiry?: string | null;
  @IsOptional() @IsDateString() taxTokenExpiry?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ListVehicleMovementsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) factoryId?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ListGateEntriesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) factoryId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(GateStatus) status?: GateStatus;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(GateDirection) direction?: GateDirection;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class GetGateEntryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class GateAttachmentScopeDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class CreateGateEntryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) gateNumber!: string;
  @IsEnum(GateDirection) direction!: GateDirection;
  @IsEnum(GatePurpose) purpose!: GatePurpose;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) vehicleId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(2, 32) vehicleNumber?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(160) driverName?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(32) driverMobile?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) partnerId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) itemId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(64) challanNumber?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(64) referenceNumber?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
  @ValidateIf((_, value) => value !== undefined) @IsDateString() enteredAt?: string;
}

export class CreateWeighbridgeTicketDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) ticketNumber!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) grossWeight!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) tareWeight!: string;
  @IsDateString() firstWeightAt!: string;
  @IsDateString() secondWeightAt!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}

export class CreateQualitySampleDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) sampleNumber!: string;
  @IsEnum(QualitySampleType) sampleType!: QualitySampleType;
}

export class ListQualitySamplesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Length(1, 100) factoryId?: string;
  @ValidateIf((_, value) => value !== undefined) @IsEnum(QualitySampleType) sampleType?: QualitySampleType;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class SubmitQualityResultsDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) moisturePct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) foreignMatterPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) brokenPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) damagedPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) discoloredPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) immaturePct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) chalkyPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) purityPct?: number;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) otherPct?: number;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) comments?: string;
}

export class ApproveQualitySampleDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsEnum(QualityDecision) decision!: QualityDecision;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) comments?: string;
}

export class CompleteGateEntryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
