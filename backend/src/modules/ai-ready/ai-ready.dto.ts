import { AiDomain, AiModelStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';

export class ExtractDatasetDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsEnum(AiDomain)
  domain!: AiDomain;

  @IsOptional()
  @IsNumber()
  @Min(7)
  @Type(() => Number)
  days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class RegisterModelDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsEnum(AiDomain)
  domain!: AiDomain;

  @IsString()
  @Length(1, 100)
  modelName!: string;

  @IsString()
  @Length(1, 50)
  version!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  framework?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  endpointUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  artifactUri?: string;

  @IsOptional()
  @IsObject()
  inputSchema?: Record<string, any>;

  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, any>;

  @IsOptional()
  @IsObject()
  performanceMetric?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PredictDto {
  @IsString()
  @Length(1, 100)
  companyId!: string;

  @IsEnum(AiDomain)
  domain!: AiDomain;

  @IsObject()
  inputFeatures!: Record<string, any>;
}

export class RecordFeedbackDto {
  @IsString()
  @Length(1, 100)
  predictionId!: string;

  @IsObject()
  actualValue!: Record<string, any>;

  @IsBoolean()
  wasAccurate!: boolean;
}

