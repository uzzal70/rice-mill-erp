import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMachineDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsOptional()
  @IsString()
  productionLineId?: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  machineType!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  serviceIntervalHours?: number;
}

export class RecordMachineLogDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  machineId!: string;

  @IsDateString()
  logDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startHours!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  endHours!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  energyOrFuelConsumed?: number;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SparePartItemDto {
  @IsString()
  partName!: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class CreateMaintenanceTicketDto {
  @IsString()
  companyId!: string;

  @IsString()
  factoryId!: string;

  @IsString()
  machineId!: string;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  labourCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SparePartItemDto)
  spareParts?: SparePartItemDto[];
}

export class CompleteMaintenanceTicketDto {
  @IsDateString()
  completedDate!: string;

  @IsOptional()
  @IsDateString()
  nextServiceDueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalLabourCost?: number;
}

