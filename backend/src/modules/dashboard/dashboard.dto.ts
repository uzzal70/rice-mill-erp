import { IsOptional, IsString, Length } from 'class-validator';

export class FactoryComparisonQueryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string;
}

export class OwnerDashboardQueryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string;
}

export class ManagementAnalyticsQueryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string;
  @IsOptional() @IsString() days?: string;
}
