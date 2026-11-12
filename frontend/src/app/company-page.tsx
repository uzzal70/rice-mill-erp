'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormGrid } from '@/components/form';

type Company = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  registrationNumber: string | null;
  tin: string | null;
  bin: string | null;
  address: string | null;
  district: string | null;
  division: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  fiscalYearStart: number;
  currency: string;
};

const labels = {
  en: {
    title: 'Company profile',
    subtitle: 'Maintain legal identity, contact details, fiscal year and base currency for this company.',
    company: 'Company',
    createCompany: 'Create company',
    cancelCreate: 'Cancel',
    name: 'Company name',
    code: 'Company code',
    logoUrl: 'Logo URL',
    registrationNumber: 'Registration number',
    tin: 'TIN',
    bin: 'BIN',
    address: 'Address',
    district: 'District',
    division: 'Division',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    fiscalYearStart: 'Fiscal year starts in',
    currency: 'Base currency',
    identity: 'Legal identity',
    contact: 'Contact and address',
    financial: 'Financial defaults',
    save: 'Save company profile',
    saved: 'Company profile saved.',
    loading: 'Loading company profile…',
    failed: 'Could not load company profile.',
    noCompanies: 'No active company is available to your account.',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  bn: {
    title: 'কোম্পানি প্রোফাইল',
    subtitle: 'কোম্পানির আইনগত পরিচয়, যোগাযোগ, অর্থবছর ও মূল মুদ্রা সম্পাদনা করুন।',
    company: 'কোম্পানি',
    createCompany: 'কোম্পানি তৈরি',
    cancelCreate: 'বাতিল',
    name: 'কোম্পানির নাম',
    code: 'কোম্পানি কোড',
    logoUrl: 'লোগো URL',
    registrationNumber: 'নিবন্ধন নম্বর',
    tin: 'TIN',
    bin: 'BIN',
    address: 'ঠিকানা',
    district: 'জেলা',
    division: 'বিভাগ',
    phone: 'ফোন',
    email: 'ইমেইল',
    website: 'ওয়েবসাইট',
    fiscalYearStart: 'অর্থবছর শুরুর মাস',
    currency: 'মূল মুদ্রা',
    identity: 'আইনগত পরিচয়',
    contact: 'যোগাযোগ ও ঠিকানা',
    financial: 'আর্থিক ডিফল্ট',
    save: 'কোম্পানি প্রোফাইল সংরক্ষণ',
    saved: 'কোম্পানি প্রোফাইল সংরক্ষিত হয়েছে।',
    loading: 'কোম্পানি প্রোফাইল লোড হচ্ছে…',
    failed: 'কোম্পানি প্রোফাইল লোড করা যায়নি।',
    noCompanies: 'আপনার অ্যাকাউন্টে কোনো সক্রিয় কোম্পানি নেই।',
    months: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  },
} as const;

type CompanyForm = Omit<Company, 'id'>;

const emptyCompany: CompanyForm = {
  name: '',
  code: '',
  logoUrl: '',
  registrationNumber: '',
  tin: '',
  bin: '',
  address: '',
  district: '',
  division: '',
  phone: '',
  email: '',
  website: '',
  fiscalYearStart: 1,
  currency: 'BDT',
};

function formValues(company: Company): CompanyForm {
  return {
    name: company.name,
    code: company.code,
    logoUrl: company.logoUrl ?? '',
    registrationNumber: company.registrationNumber ?? '',
    tin: company.tin ?? '',
    bin: company.bin ?? '',
    address: company.address ?? '',
    district: company.district ?? '',
    division: company.division ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    website: company.website ?? '',
    fiscalYearStart: company.fiscalYearStart,
    currency: company.currency,
  };
}

export function CompanyPage({
  companies,
  companyId,
  language,
  onCompanyChanged,
  onSaved,
  onError,
  onCompanyCreated,
}: {
  companies: Array<{ id: string; name: string; code: string }>;
  companyId: string;
  language: 'en' | 'bn';
  onCompanyChanged: (companyId: string) => void;
  onSaved: (message: string, company?: Company) => void;
  onError: (message: string) => void;
  onCompanyCreated: (companyId: string) => void;
}) {
  const t = labels[language];
  const toast = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CompanyForm>(emptyCompany);
  const [createMode, setCreateMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const companyQuery = useQuery({
    queryKey: ['company-profile', companyId],
    queryFn: () => apiRequest<Company>(`/companies/${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId),
  });
  const capabilityQuery = useQuery({
    queryKey: ['company-creation-capability'],
    queryFn: () => apiRequest<{ canCreateCompany: boolean }>('/companies/capabilities'),
  });

  useEffect(() => {
    if (!createMode && companyQuery.data) {
      setValues(formValues(companyQuery.data));
      setFieldErrors({});
    }
  }, [companyQuery.data, createMode]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const { name, code, fiscalYearStart, currency, ...optional } = values;
      const clean = Object.fromEntries(
        Object.entries(optional).map(([key, value]) => [key, (value ?? '').trim() || null]),
      );
      const body = JSON.stringify({
        ...clean,
        name: name.trim(),
        code: code.trim(),
        fiscalYearStart,
        currency: currency.trim().toUpperCase(),
      });
      return createMode
        ? apiRequest<Company>('/companies', { method: 'POST', body })
        : apiRequest<Company>(`/companies/${encodeURIComponent(companyId)}`, { method: 'PATCH', body });
    },
    onSuccess: async company => {
      if (createMode) {
        await queryClient.setQueryData(['company-profile', company.id], company);
        onCompanyCreated(company.id);
        setCreateMode(false);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['company-profile', companyId] });
      }
      onSaved(t.saved, createMode ? company : undefined);
      setValues(formValues(company));
      setFieldErrors({});
    },
    onError: error => onError(extractApiError(error, t.failed)),
  });

  function setField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setFieldErrors(current => ({ ...current, [String(key)]: '' }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'name', label: t.name, value: values.name, required: true },
        { name: 'code', label: t.code, value: values.code, required: true },
        { name: 'email', label: t.email, value: values.email ?? '', type: 'email' },
        { name: 'fiscalYearStart', label: t.fiscalYearStart, value: values.fiscalYearStart, required: true, isSelect: true },
        { name: 'currency', label: t.currency, value: values.currency, required: true, minLength: 3 },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setFieldErrors({});
    updateMutation.mutate();
  }

  const loading = companyQuery.isLoading;
  const error = companyQuery.error;
  const capabilityError = capabilityQuery.error && !(capabilityQuery.error instanceof ApiError && capabilityQuery.error.status === 403)
    ? capabilityQuery.error
    : null;
  const canCreateCompany = capabilityQuery.data?.canCreateCompany === true;

  return <Stack spacing={2.5}>
    <Box>
      <Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography>
      <Typography color="text.secondary" fontSize={13} mt={.5}>{t.subtitle}</Typography>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      {!createMode && companies.length > 1 && <Box sx={{ minWidth: { xs: '100%', sm: 320 }, maxWidth: 420 }}>
        <AppSelect
          name="company-selector"
          label={t.company}
          value={companyId}
          options={companies.map(company => ({ value: company.id, label: company.name, badge: company.code }))}
          onChange={onCompanyChanged}
        />
      </Box>}
      {canCreateCompany && <Button variant={createMode ? 'outlined' : 'contained'} onClick={() => {
        setCreateMode(current => !current);
        setFieldErrors({});
        setValues(createMode && companyQuery.data ? formValues(companyQuery.data) : emptyCompany);
      }}>{createMode ? t.cancelCreate : t.createCompany}</Button>}
    </Stack>
    {error && <Alert severity="error">{extractApiError(error, t.failed)}</Alert>}
    {capabilityError && <Alert severity="error">{extractApiError(capabilityError, t.failed)}</Alert>}
    {!createMode && loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t.loading}</Typography></Stack>}
    {!createMode && !companyId && !canCreateCompany && <Alert severity="info">{t.noCompanies}</Alert>}
    {!createMode && !companyId && canCreateCompany && <Alert severity="info">{t.noCompanies}</Alert>}
    {!createMode && !loading && companyId && !companyQuery.data && !error && <Alert severity="info">{t.noCompanies}</Alert>}
    {(createMode || (!loading && companyQuery.data)) && <Box component="form" noValidate onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.identity}</Typography>
          <FormGrid columns={2}>
            <AppTextField fieldName="name" label={t.name} value={values.name} onValueChange={v => setField('name', v)} inputProps={{ maxLength: 160 }} errorText={fieldErrors.name} required />
            <AppTextField fieldName="code" label={t.code} value={values.code} onValueChange={v => setField('code', v)} inputProps={{ maxLength: 24 }} errorText={fieldErrors.code} required />
            <AppTextField fieldName="logoUrl" label={t.logoUrl} value={values.logoUrl ?? ''} onValueChange={v => setField('logoUrl', v)} type="url" />
            <AppTextField fieldName="registrationNumber" label={t.registrationNumber} value={values.registrationNumber ?? ''} onValueChange={v => setField('registrationNumber', v)} />
            <AppTextField fieldName="tin" label={t.tin} value={values.tin ?? ''} onValueChange={v => setField('tin', v)} />
            <AppTextField fieldName="bin" label={t.bin} value={values.bin ?? ''} onValueChange={v => setField('bin', v)} />
          </FormGrid>
        </Paper>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.contact}</Typography>
          <FormGrid columns={2}>
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <AppTextField fieldName="address" label={t.address} value={values.address ?? ''} onValueChange={v => setField('address', v)} multiline minRows={2} />
            </Box>
            <AppTextField fieldName="district" label={t.district} value={values.district ?? ''} onValueChange={v => setField('district', v)} />
            <AppTextField fieldName="division" label={t.division} value={values.division ?? ''} onValueChange={v => setField('division', v)} />
            <AppTextField fieldName="phone" label={t.phone} value={values.phone ?? ''} onValueChange={v => setField('phone', v)} />
            <AppTextField fieldName="email" label={t.email} type="email" value={values.email ?? ''} onValueChange={v => setField('email', v)} errorText={fieldErrors.email} />
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <AppTextField fieldName="website" label={t.website} type="url" value={values.website ?? ''} onValueChange={v => setField('website', v)} />
            </Box>
          </FormGrid>
        </Paper>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.financial}</Typography>
          <FormGrid columns={2}>
            <AppSelect
              fieldName="fiscalYearStart"
              label={t.fiscalYearStart}
              value={String(values.fiscalYearStart)}
              onChange={v => setField('fiscalYearStart', Number(v))}
              options={t.months.map((month, index) => ({ value: String(index + 1), label: month }))}
              errorText={fieldErrors.fiscalYearStart}
              required
            />
            <AppTextField fieldName="currency" label={t.currency} value={values.currency} onValueChange={v => setField('currency', v.toUpperCase())} inputProps={{ maxLength: 3, minLength: 3 }} errorText={fieldErrors.currency} required />
          </FormGrid>
        </Paper>
        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={updateMutation.isPending || (!createMode && !companyId)} startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {t.save}
          </Button>
        </Stack>
      </Stack>
    </Box>}
  </Stack>;
}
