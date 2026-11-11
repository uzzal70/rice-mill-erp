import { Test, TestingModule } from '@nestjs/testing';
import { I18nController } from './i18n.controller';
import { I18nService } from './i18n.service';

describe('I18nController (#66 Bangla + English)', () => {
  let controller: I18nController;
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [I18nController],
      providers: [I18nService],
    }).compile();

    controller = module.get<I18nController>(I18nController);
    service = module.get<I18nService>(I18nService);
  });

  it('should list supported languages', () => {
    const res = controller.getSupportedLanguages();
    expect(res.length).toBe(2);
  });

  it('should fetch translation dictionary for specified language', () => {
    const en = controller.getTranslations({ lang: 'en' });
    expect(en.language).toBe('en');
    expect(en.translations.workspace).toBe('Rice Mill ERP');

    const bn = controller.getTranslations({ lang: 'bn' });
    expect(bn.language).toBe('bn');
    expect(bn.translations.workspace).toBe('রাইস মিল ERP');
  });
});

