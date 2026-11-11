import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { I18nService } from './i18n.service';
import { TranslationQueryDto } from './i18n.dto';

@ApiTags('Internationalization (Bangla + English)')
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('languages')
  @ApiOperation({ summary: 'List supported system languages' })
  getSupportedLanguages() {
    return this.i18nService.getSupportedLanguages();
  }

  @Get('translations')
  @ApiOperation({ summary: 'Fetch translation dictionary for English or Bangla' })
  getTranslations(@Query() query: TranslationQueryDto) {
    const lang = query.lang || 'bn';
    return {
      language: lang,
      translations: this.i18nService.getTranslations(lang),
    };
  }
}

