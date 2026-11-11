import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min } from 'class-validator';

export class CreateBackupDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsIn(['DATABASE', 'FILES', 'FULL'])
  type: 'DATABASE' | 'FILES' | 'FULL';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRetentionPolicyDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsInt()
  @Min(1)
  dailyRetentionDays: number;

  @IsInt()
  @Min(1)
  weeklyRetentionWeeks: number;

  @IsInt()
  @Min(1)
  monthlyRetentionMonths: number;
}

