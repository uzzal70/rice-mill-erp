import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ListDispatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsOptional() @IsString() @Length(1, 100) salesOrderId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) page = 1;
  @IsOptional() @IsInt() @Type(() => Number) @Min(1) @Max(100) pageSize = 25;
}

export class DispatchLineDto {
  @IsString() @Length(1, 100) salesOrderLineId!: string;
  @IsString() @Length(1, 100) itemId!: string;
  @IsString() @Length(1, 100) stackId!: string;
  @IsOptional() @IsString() @Length(1, 100) packagingItemId?: string;
  @IsOptional() @IsInt() @Type(() => Number) @Min(0) bagCount?: number;
  @IsOptional() @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) grossWeightKg?: string;
  @IsOptional() @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) tareWeightKg?: string;
  @IsString() @Matches(/^\d{1,15}(\.\d{1,3})?$/) netWeightKg!: string;
}

export class CreateDispatchDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(1, 100) salesOrderId!: string;
  @IsString() @Length(2, 32) challanNumber!: string;
  @IsString() @Length(2, 32) gatePassNumber!: string;
  @IsOptional() @IsDateString() dispatchDate?: string;
  @IsString() @Length(2, 50) vehicleNumber!: string;
  @IsString() @Length(2, 100) driverName!: string;
  @IsOptional() @IsString() @MaxLength(32) driverMobile?: string;
  @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DispatchLineDto) lines!: DispatchLineDto[];
}

export class DispatchActionDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}
