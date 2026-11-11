import { Injectable } from '@nestjs/common';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const EN_DICTIONARY: Record<string, string> = {
  workspace: 'Rice Mill ERP',
  tagline: 'Factory operations, clearly in control',
  gate: 'Gate & Quality',
  procurement: 'Paddy Purchases',
  production: 'Milling Production',
  sales: 'Sales Orders',
  accounting: 'Accounting Engine',
  dataIntegrity: 'Data Integrity',
  calculations: 'Calculation Engine',
  backupManagement: 'Backup & Restore',
  headRice: 'Head Rice',
  brokenRice: 'Broken Rice',
  riceBran: 'Rice Bran',
  husk: 'Husk',
  grossWeight: 'Gross Weight',
  tareWeight: 'Tare Weight',
  netWeight: 'Net Weight',
  ratePerMon: 'Rate / Mon (40 KG)',
  currency: 'BDT (৳)',
  success: 'Operation completed successfully.',
  error: 'An unexpected error occurred.',
};

const BN_DICTIONARY: Record<string, string> = {
  workspace: 'রাইস মিল ERP',
  tagline: 'কারখানার কার্যক্রম, পুরোপুরি নিয়ন্ত্রণে',
  gate: 'গেট ও মান নিয়ন্ত্রণ',
  procurement: 'ধান ক্রয়',
  production: 'মাড়াই উৎপাদন',
  sales: 'বিক্রয় আদেশ',
  accounting: 'অ্যাকাউন্টিং ইঞ্জিন',
  dataIntegrity: 'ডেটা অখণ্ডতা সুরক্ষা',
  calculations: 'গণনা ইঞ্জিন',
  backupManagement: 'ডাটাবেজ ব্যাকআপ ও রিস্টোর',
  headRice: 'প্রথম চাল',
  brokenRice: 'খুদ চাল',
  riceBran: 'চালের কুড়া',
  husk: 'তুষ',
  grossWeight: 'মোট ওজন (গ্রস)',
  tareWeight: 'গাড়ির ওজন (টেয়ার)',
  netWeight: 'প্রকৃত ওজন (নিট)',
  ratePerMon: 'দর / মণ (৪০ কেজি)',
  currency: 'টাকা (৳)',
  success: 'কার্যক্রম সফলভাবে সম্পন্ন হয়েছে।',
  error: 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',
};

@Injectable()
export class I18nService {
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English', isDefault: false },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isDefault: true },
    ];
  }

  getTranslations(lang: 'en' | 'bn' = 'bn'): Record<string, string> {
    return lang === 'en' ? EN_DICTIONARY : BN_DICTIONARY;
  }

  translate(key: string, lang: 'en' | 'bn' = 'bn', params?: Record<string, any>): string {
    const dict = lang === 'en' ? EN_DICTIONARY : BN_DICTIONARY;
    let text = dict[key] || EN_DICTIONARY[key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(params[k]));
      });
    }
    return text;
  }

  convertDigitsToBengali(value: number | string): string {
    return String(value).replace(/[0-9]/g, digit => BENGALI_DIGITS[parseInt(digit, 10)]);
  }

  formatCurrency(amount: number, lang: 'en' | 'bn' = 'bn'): string {
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    const prefix = amount < 0 ? '-৳ ' : '৳ ';
    if (lang === 'bn') {
      return `${prefix}${this.convertDigitsToBengali(formatted)}`;
    }
    return `${prefix}${formatted}`;
  }
}

