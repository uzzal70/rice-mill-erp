'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '@/lib/api';

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
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CompanyForm>(emptyCompany);
  const [createMode, setCreateMode] = useState(false);
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
    if (companyQuery.data) setValues(formValues(companyQuery.data));
  }, [companyQuery.data]);

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
    },
    onError: error => onError(error instanceof Error ? error.message : t.failed),
  });

  function setField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setValues(current => ({ ...current, [key]: value }));
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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
      {!createMode && companies.length > 1 && <FormControl size="small" sx={{ maxWidth: 420, minWidth: 300 }}>
        <InputLabel>{t.company}</InputLabel>
        <Select label={t.company} value={companyId} onChange={event => onCompanyChanged(event.target.value)}>
          {companies.map(company => <MenuItem key={company.id} value={company.id}>{company.name} · {company.code}</MenuItem>)}
        </Select>
      </FormControl>}
      {canCreateCompany && <Button variant={createMode ? 'outlined' : 'contained'} onClick={() => {
        setCreateMode(current => !current);
        setValues(createMode && companyQuery.data ? formValues(companyQuery.data) : emptyCompany);
      }}>{createMode ? t.cancelCreate : t.createCompany}</Button>}
    </Stack>
    {error && <Alert severity="error">{error instanceof Error ? error.message : t.failed}</Alert>}
    {capabilityError && <Alert severity="error">{capabilityError instanceof Error ? capabilityError.message : t.failed}</Alert>}
    {!createMode && loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t.loading}</Typography></Stack>}
    {!createMode && !companyId && !canCreateCompany && <Alert severity="info">{t.noCompanies}</Alert>}
    {!createMode && !companyId && canCreateCompany && <Alert severity="info">{t.noCompanies}</Alert>}
    {!createMode && !loading && companyId && !companyQuery.data && !error && <Alert severity="info">{t.noCompanies}</Alert>}
    {(createMode || (!loading && companyQuery.data)) && <Box component="form" onSubmit={event => { event.preventDefault(); updateMutation.mutate(); }}>
      <Stack spacing={2}>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.identity}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label={t.name} value={values.name} onChange={event => setField('name', event.target.value)} inputProps={{ maxLength: 160 }} required />
            <TextField label={t.code} value={values.code} onChange={event => setField('code', event.target.value)} inputProps={{ maxLength: 24 }} required />
            <TextField label={t.logoUrl} value={values.logoUrl ?? ''} onChange={event => setField('logoUrl', event.target.value)} type="url" />
            <TextField label={t.registrationNumber} value={values.registrationNumber ?? ''} onChange={event => setField('registrationNumber', event.target.value)} />
            <TextField label={t.tin} value={values.tin ?? ''} onChange={event => setField('tin', event.target.value)} />
            <TextField label={t.bin} value={values.bin ?? ''} onChange={event => setField('bin', event.target.value)} />
          </Box>
        </Paper>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.contact}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label={t.address} value={values.address ?? ''} onChange={event => setField('address', event.target.value)} multiline minRows={2} sx={{ gridColumn: { sm: '1 / -1' } }} />
            <TextField label={t.district} value={values.district ?? ''} onChange={event => setField('district', event.target.value)} />
            <TextField label={t.division} value={values.division ?? ''} onChange={event => setField('division', event.target.value)} />
            <TextField label={t.phone} value={values.phone ?? ''} onChange={event => setField('phone', event.target.value)} />
            <TextField label={t.email} type="email" value={values.email ?? ''} onChange={event => setField('email', event.target.value)} />
            <TextField label={t.website} type="url" value={values.website ?? ''} onChange={event => setField('website', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
          </Box>
        </Paper>
        <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          <Typography className="brand-font" fontWeight={800} mb={2}>{t.financial}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>{t.fiscalYearStart}</InputLabel>
              <Select label={t.fiscalYearStart} value={values.fiscalYearStart} onChange={event => setField('fiscalYearStart', Number(event.target.value))}>
                {t.months.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label={t.currency} value={values.currency} onChange={event => setField('currency', event.target.value.toUpperCase())} inputProps={{ maxLength: 3, minLength: 3 }} required />
          </Box>
        </Paper>
        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={updateMutation.isPending || (!createMode && !companyId) || !values.name.trim() || !values.code.trim()}>
            {updateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : t.save}
          </Button>
        </Stack>
      </Stack>
    </Box>}
  </Stack>;
}
