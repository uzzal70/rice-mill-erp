import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ApprovalActionType {
  SUBMIT = 'SUBMIT',
  REVIEW = 'REVIEW',
  APPROVE = 'APPROVE',
  POST = 'POST',
  LOCK = 'LOCK',
  REJECT = 'REJECT',
  RETURN_FOR_CORRECTION = 'RETURN_FOR_CORRECTION',
}

export class CreateApprovalRequestDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  entityNumber: string;

  @IsString()
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  factoryId?: string;
}

export class TransitionApprovalDto {
  @IsEnum(ApprovalActionType)
  action: ApprovalActionType;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsOptional()
  @IsString()
  actorRole?: string;
}

