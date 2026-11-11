import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @IsString()
  vehicleNumber: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsString()
  vehicleType: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverMobile?: string;

  @IsOptional()
  @IsDateString()
  fitnessExpiry?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsDateString()
  taxTokenExpiry?: string;
}

export class CreateVehicleTripDto {
  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsString()
  tripNumber: string;

  @IsString()
  driverName: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsDateString()
  tripDate: string;

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startOdometer: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  endOdometer: number;

  @IsOptional()
  @IsString()
  cargoDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cargoWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tollOtherCost?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateFuelLogDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  factoryId?: string;

  @IsOptional()
  @IsString()
  machineId?: string;

  @IsDateString()
  logDate: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantityLiters: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePerLiter: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  odometerReading?: number;

  @IsOptional()
  @IsString()
  fillingStation?: string;

  @IsOptional()
  @IsString()
  invoiceOrSlipNumber?: string;

  @IsOptional()
  @IsString()
  driverOrOperator?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateVehicleMaintenanceDto {
  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  maintenanceType?: string;

  @IsDateString()
  serviceDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  odometerReading?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsString()
  serviceCenter?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  nextServiceDueKm?: number;
}

