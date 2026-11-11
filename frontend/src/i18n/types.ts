export type Language = 'en' | 'bn';

export interface TranslationParams {
  [key: string]: string | number;
}

export type TranslationDictionary = Record<string, string>;

