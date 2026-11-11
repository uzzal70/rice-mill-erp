'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, TranslationParams } from './types';
import { enTranslations } from './en';
import { bnTranslations } from './bn';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: TranslationParams) => string;
  formatNumber: (num: number | string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('bn'); // Default to Bangla for mill floor operators

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rice_mill_language') as Language;
      if (saved === 'en' || saved === 'bn') {
        setLanguageState(saved);
      }
    } catch {
      // safe fallback if localStorage not accessible
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('rice_mill_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const dictionary = useMemo(() => {
    return language === 'bn' ? bnTranslations : enTranslations;
  }, [language]);

  const t = (key: string, params?: TranslationParams): string => {
    let str = dictionary[key] || enTranslations[key] || key;
    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(params[k]));
      });
    }
    return str;
  };

  const formatNumber = (num: number | string): string => {
    const str = typeof num === 'number' ? num.toLocaleString('en-US') : String(num);
    if (language !== 'bn') return str;
    return str.replace(/[0-9]/g, digit => BENGALI_DIGITS[parseInt(digit, 10)]);
  };

  const formatCurrency = (amount: number): string => {
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    const prefix = amount < 0 ? '-৳ ' : '৳ ';
    if (language === 'bn') {
      const bnDigits = formatted.replace(/[0-9]/g, digit => BENGALI_DIGITS[parseInt(digit, 10)]);
      return `${prefix}${bnDigits}`;
    }
    return `${prefix}${formatted}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    if (language === 'bn') {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return formatNumber(`${day}/${month}/${year}`);
    }
    return d.toLocaleDateString('en-GB');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    formatNumber,
    formatCurrency,
    formatDate,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

