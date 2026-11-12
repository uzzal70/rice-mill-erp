export type FieldValueType =
  | 'string'
  | 'number'
  | 'positiveNumber'
  | 'nonNegativeNumber'
  | 'integer'
  | 'email'
  | 'date';

export interface FieldRule {
  name: string;
  label: string;
  value: unknown;
  required?: boolean;
  isSelect?: boolean;
  type?: FieldValueType;
  min?: number;
  max?: number;
  minLength?: number;
  custom?: (value: unknown) => string | null | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  missingLabels: string[];
  firstField: string | null;
  summary: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function focusFieldByName(fieldName: string | null | undefined) {
  if (!fieldName || typeof document === 'undefined') return;
  const escaped =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(fieldName)
      : fieldName.replace(/["\\]/g, '\\$&');
  const container = document.querySelector<HTMLElement>(`[data-field-name="${escaped}"]`);
  if (!container) return;

  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  container.classList.remove('field-nudge');
  void container.offsetWidth;
  container.classList.add('field-nudge');
  window.setTimeout(() => container.classList.remove('field-nudge'), 950);

  const focusable = container.querySelector<HTMLElement>(
    'input:not([disabled]), textarea:not([disabled]), [role="combobox"]:not([aria-disabled="true"]), button:not([disabled])',
  );
  if (focusable) {
    window.setTimeout(() => focusable.focus({ preventScroll: true }), 80);
  }
}

export function validateFormFields(
  rules: FieldRule[],
  language: 'en' | 'bn' = 'en',
): ValidationResult {
  const bn = language === 'bn';
  const errors: Record<string, string> = {};
  const missingLabels: string[] = [];
  let firstField: string | null = null;

  for (const rule of rules) {
    const empty = isBlankValue(rule.value);
    let fieldError = '';

    if (rule.required && empty) {
      fieldError = rule.isSelect
        ? bn
          ? `অনুগ্রহ করে '${rule.label}' নির্বাচন করুন`
          : `Please select ${rule.label}`
        : bn
        ? `অনুগ্রহ করে '${rule.label}' পূরণ করুন`
        : `Please enter ${rule.label}`;
    } else if (!empty) {
      const strVal = String(rule.value).trim();

      if (rule.type === 'email' && !EMAIL_REGEX.test(strVal)) {
        fieldError = bn ? `সঠিক ইমেইল ঠিকানা লিখুন (${rule.label})` : `Enter a valid email address`;
      } else if (rule.minLength !== undefined && strVal.length < rule.minLength) {
        fieldError = bn
          ? `'${rule.label}' কমপক্ষে ${rule.minLength} অক্ষরের হতে হবে`
          : `${rule.label} must be at least ${rule.minLength} characters`;
      } else if (
        rule.type === 'number' ||
        rule.type === 'positiveNumber' ||
        rule.type === 'nonNegativeNumber' ||
        rule.type === 'integer'
      ) {
        const num = Number(strVal);
        if (!Number.isFinite(num)) {
          fieldError = bn ? `'${rule.label}' এ সঠিক সংখ্যা দিন` : `Enter a valid number for ${rule.label}`;
        } else if (rule.type === 'integer' && !Number.isInteger(num)) {
          fieldError = bn ? `'${rule.label}' অবশ্যই পূর্ণ সংখ্যা হতে হবে` : `${rule.label} must be a whole number`;
        } else if (rule.type === 'positiveNumber' && num <= 0) {
          fieldError = bn ? `'${rule.label}' অবশ্যই ০ এর বেশি হতে হবে` : `${rule.label} must be greater than 0`;
        } else if (rule.type === 'nonNegativeNumber' && num < 0) {
          fieldError = bn ? `'${rule.label}' ঋণাত্মক হতে পারবে না` : `${rule.label} cannot be negative`;
        } else if (rule.min !== undefined && num < rule.min) {
          fieldError = bn ? `'${rule.label}' সর্বনিম্ন ${rule.min} হতে হবে` : `${rule.label} must be at least ${rule.min}`;
        } else if (rule.max !== undefined && num > rule.max) {
          fieldError = bn ? `'${rule.label}' সর্বোচ্চ ${rule.max} হতে পারবে` : `${rule.label} cannot exceed ${rule.max}`;
        }
      }

      if (!fieldError && rule.custom) {
        const customErr = rule.custom(rule.value);
        if (customErr) fieldError = customErr;
      }
    } else if (rule.custom) {
      const customErr = rule.custom(rule.value);
      if (customErr) fieldError = customErr;
    }

    if (fieldError) {
      errors[rule.name] = fieldError;
      missingLabels.push(rule.label);
      if (!firstField) firstField = rule.name;
    }
  }

  const valid = missingLabels.length === 0;
  const summary = valid
    ? ''
    : bn
    ? `অনুগ্রহ করে প্রথমে এই ঘরগুলো সঠিকভাবে পূরণ/নির্বাচন করুন: ${missingLabels.join(', ')}`
    : `Please complete the required fields first: ${missingLabels.join(', ')}`;

  return { valid, errors, missingLabels, firstField, summary };
}

