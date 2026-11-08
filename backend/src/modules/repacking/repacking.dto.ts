import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class ListRepackingBatchesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class CreateRepackingBatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 32) batchNumber!: string;
  @IsString() @Length(1, 100) sourceItemId!: string;
  @IsString() @Length(1, 100) outputItemId!: string;
  @IsString() @Length(1, 100) packagingItemId!: string;
  @IsString() @Length(1, 100) sourceStackId!: string;
  @IsString() @Length(1, 100) destinationStackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) inputQuantityKg!: string;
  @Type(() => Number) @IsInt() @Min(1) packageCount!: number;
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}

export class RepackingBatchActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
