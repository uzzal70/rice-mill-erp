import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class MobileSummaryQueryDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsOptional()
  @IsString()
  factoryId?: string;
}

export class MobileQuickApproveDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  entityType: 'PURCHASE_ORDER' | 'EXPENSE' | 'PRODUCTION_BATCH' | 'STOCK_ADJUSTMENT';

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  note?: string;
}

