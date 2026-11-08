import { Type } from 'class-transformer';
import { ParboilingStageType } from '@prisma/client';
import { ArrayMinSize, IsDateString, IsEnum, IsInt, IsNumber, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

export class CreateParboilingStageDto {
  @IsEnum(ParboilingStageType) stageType!: ParboilingStageType;
  @IsDateString() startedAt!: string;
  @IsDateString() completedAt!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) inputQuantityKg!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) outputQuantityKg!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) moistureBeforePct!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) moistureAfterPct!: number;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) waterQuantity?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,7}(\.\d{1,2})?$/) temperatureC?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,7}(\.\d{1,2})?$/) pressureBar?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) fuelQuantity?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) electricityKwh?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @Matches(/^\d{1,15}(\.\d{1,2})?$/) labourCost?: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
}

export class CreateParboilingBatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) batchNumber!: string;
  @IsString() @Length(1, 100) inputItemId!: string;
  @IsString() @Length(1, 100) outputItemId!: string;
  @IsString() @Length(1, 100) inputStackId!: string;
  @IsString() @Length(1, 100) outputStackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) inputQuantityKg!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) outputQuantityKg!: string;
  @IsDateString() startedAt!: string;
  @IsDateString() completedAt!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
  @ValidateNested({ each: true }) @Type(() => CreateParboilingStageDto) @ArrayMinSize(3) stages!: CreateParboilingStageDto[];
}

export class ListParboilingBatchesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
}

export class ParboilingBatchActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
