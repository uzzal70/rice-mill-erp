import { IsOptional, IsString, Length } from 'class-validator';

export class FactoryComparisonQueryDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsOptional() @IsString() @Length(1, 100) factoryId?: string;
}
