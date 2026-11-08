import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsInt, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

export class CreateProductionOutputDto {
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) stackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) quantityKg!: string;
}

export class CreateProductionBatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '') @IsString() @Length(1, 100) productionLineId?: string;
  @IsString() @Length(2, 32) batchNumber!: string;
  @IsString() @Length(1, 100) inputItemId!: string;
  @IsString() @Length(1, 100) inputStackId!: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) inputQuantityKg!: string;
  @IsDateString() startedAt!: string;
  @IsDateString() completedAt!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(1000) remarks?: string;
  @ValidateNested({ each: true }) @Type(() => CreateProductionOutputDto) @ArrayMinSize(1) outputs!: CreateProductionOutputDto[];
}

export class ListProductionBatchesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(100) search?: string;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ValidateIf((_, value) => value !== undefined) @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
}

export class ProductionBatchActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
