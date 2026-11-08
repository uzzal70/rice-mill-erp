import { IsString, Length } from 'class-validator';

export class ListProductionLinesDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
}

export class CreateProductionLineDto {
  @IsString() @Length(1, 100) companyId!: string;
  @IsString() @Length(1, 100) factoryId!: string;
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(1, 32) code!: string;
}
