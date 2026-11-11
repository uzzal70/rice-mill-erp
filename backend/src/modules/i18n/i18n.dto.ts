import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdateUserLanguageDto {
  @IsString()
  @IsIn(['en', 'bn'])
  language: 'en' | 'bn';
}

export class TranslationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['en', 'bn'])
  lang?: 'en' | 'bn';
}

