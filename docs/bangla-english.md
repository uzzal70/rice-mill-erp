# Bangla + English Localization

## Status
Complete

## 1. Business workflow
- **Purpose and actors**:
  - The Rice Mill ERP operates in Bangladesh where operational floor workers (weighbridge operators, millers, baggers, gatekeepers) require native Bengali (বাংলা), while corporate executives, accountants, tax consultants, and external auditors require English.
  - In strict compliance with Promptdoc #66 (*"Support English and বাংলা. Create translation architecture. Users must be able to switch language. Do not hard-code UI text"*), the system provides a comprehensive bidirectional localization system.
- **Preconditions and source documents**:
  - Supports standard Unicode UTF-8 character encoding throughout PostgreSQL, NestJS REST API, and Next.js frontend.
- **States and transitions**:
  - Language selection persists in client `localStorage` (`rice_mill_language`) and user session preferences.
  - Switching language executes instantaneously across all views without requiring a page refresh or server restart.
- **Approval, posting, cancellation, correction/reversal**:
  - Historical database transaction notes preserve their original input language while system-generated descriptions and reports adapt dynamically to the active language.
- **Company/factory/location and ownership scope**:
  - Mill documents (Weighbridge tickets, Gate passes, Challans, Invoices) support dual-language printing.

## 2. Database entities
- Translations and language codes:
  - Supports ISO 639-1 codes: `en` (English) and `bn` (বাংলা).
  - Default mill language set to `bn` (বাংলা) for industrial accessibility.
- `TaxConfig`, `Item`, `Partner`: Support localized Bengali naming alongside English code identifiers.

## 3. Relationships
- Frontend `I18nProvider` context exposes `useTranslation()` across all view components.
- Backend `I18nService` provides centralized localized strings for API errors and SMS/WhatsApp notifications.

## 4. Calculations & Formatting
1. **Bengali Numeral Conversion**:
   - Transliterates Western Arabic numerals (`0-9`) into Bengali numerals (`০-৯`) for Bengali locale:
     $$12,450.50 \implies \text{১২,৪৫০.৫০}$$
2. **South Asian Currency Formatting**:
   - Formats Bangladeshi Taka with `৳` symbol and South Asian grouping (Crore, Lakh, Thousand):
     $$10,000,000 \implies \text{৳ ১,০০,০০,০০০.০০}$$
3. **Date Localization**:
   - Localizes Gregorian calendar dates into localized `DD/MM/YYYY` format with Bengali digits.

## 5. Accounting impact
- Double-entry accounts display dual English and Bengali names (e.g. `Cash in Hand / নগদ তহবিল`, `Bank Account / ব্যাংক হিসাব`, `Paddy Inventory / ধান মজুদ`).

## 6. Inventory impact
- Item catalog classifies grain types in dual terminology:
  - Head Rice / প্রথম চাল
  - Broken Rice / খুদ চাল
  - Rice Bran / চালের কুড়া
  - Husk / ধানের তুষ

## 7. API
- `GET /i18n/languages`: Returns list of supported languages (`en`, `bn`).
- `GET /i18n/translations?lang=en|bn`: Fetches complete dictionary for client hydration.

## 8. Permissions
- Any authenticated user can toggle their language preference.

## 9. Validation
- Translation keys use structured dotted or camelCase notation (`workspace`, `operations`, `netWeight`).
- Missing keys gracefully fall back to the English dictionary and then the raw key string to prevent UI crashes.

## 10. UI
- Header AppBar persistent language switcher button (`বাংলা` / `English`).
- `I18nProvider` wraps the application in `frontend/src/i18n/i18n-context.tsx`.
- Modules utilize `useTranslation()` hook: `const { t, language, formatNumber, formatCurrency, formatDate } = useTranslation();`.

## 11. Reports
- All 14 printable enterprise A4 documents render with bilingual corporate headers and BSTI/DG Food regulatory terms.

## 12. Tests
- `backend/src/modules/i18n/i18n.service.spec.ts`: Unit tests verifying language support, translation lookups, parameter interpolation, numeral conversion (`0-9` to `০-৯`), and currency formatting.
- `backend/src/modules/i18n/i18n.controller.spec.ts`: Unit tests verifying `/i18n/languages` and `/i18n/translations` endpoints.

## 13. Known limitations & Next steps
- Voice-assisted Bengali speech-to-text input can be explored for floor operators wearing dust masks.

