import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateDryingBatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) batchNumber!: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) sourceStackId!: string;
  @IsString() @Length(1, 100) destinationStackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) inputQuantityKg!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) outputQuantityKg!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) moistureBeforePct!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) moistureAfterPct!: number;
  @IsString() @Length(2, 80) dryingMethod!: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) durationMinutes?: number;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) fuelQuantity?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) electricityKwh?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,2})?$/) labourCost?: string;
  @IsDateString() startedAt!: string;
  @IsDateString() completedAt!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}

export class ListDryingBatchesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class DryingBatchActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
