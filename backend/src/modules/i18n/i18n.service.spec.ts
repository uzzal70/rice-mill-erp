import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';

describe('I18nService (#66 Bangla + English)', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  it('should return supported languages including English and Bengali with Bengali as default', () => {
    const langs = service.getSupportedLanguages();
    expect(langs.length).toBe(2);
    expect(langs.some(l => l.code === 'en')).toBe(true);
    expect(langs.some(l => l.code === 'bn' && l.isDefault)).toBe(true);
  });

  it('should return English translation dictionary when lang=en', () => {
    const dict = service.getTranslations('en');
    expect(dict.workspace).toBe('Rice Mill ERP');
    expect(dict.headRice).toBe('Head Rice');
  });

  it('should return Bengali translation dictionary when lang=bn', () => {
    const dict = service.getTranslations('bn');
    expect(dict.workspace).toBe('রাইস মিল ERP');
    expect(dict.headRice).toBe('প্রথম চাল');
    expect(dict.brokenRice).toBe('খুদ চাল');
  });

  it('should translate keys with parameter interpolation', () => {
    const translated = service.translate('greeting', 'en');
    expect(translated).toBe('greeting'); // fallback to key

    const paramStr = service.translate('workspace', 'bn', { test: '123' });
    expect(paramStr).toBe('রাইস মিল ERP');
  });

  it('should convert standard numeric digits to Bengali script (0-9 -> ০-৯)', () => {
    expect(service.convertDigitsToBengali(1234567890)).toBe('১২৩৪৫৬৭৮৯০');
    expect(service.convertDigitsToBengali('40.5 KG')).toBe('৪০.৫ KG');
  });

  it('should format currency correctly in English and Bengali', () => {
    expect(service.formatCurrency(50000, 'en')).toBe('৳ 50,000.00');
    expect(service.formatCurrency(50000, 'bn')).toBe('৳ ৫০,০০০.০০');
  });
});

