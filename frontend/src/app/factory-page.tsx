'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, FormControlLabel, InputLabel, MenuItem,
  Paper, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '@/lib/api';

type Factory = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string | null;
  managerName: string | null;
  capacityPerDay: string | null;
  productionType: 'AUTO' | 'PARBOILED' | 'TRADITIONAL' | 'INTEGRATED';
  businessModes: string[];
  active: boolean;
};
type FactoryForm = {
  name: string;
  code: string;
  address: string;
  managerName: string;
  capacityPerDay: string;
  productionType: Factory['productionType'];
  businessModes: string[];
  active: boolean;
};

const emptyForm: FactoryForm = {
  name: '',
  code: '',
  address: '',
  managerName: '',
  capacityPerDay: '',
  productionType: 'AUTO',
  businessModes: [],
  active: true,
};

const productionTypes: Array<{ value: Factory['productionType']; label: { en: string; bn: string } }> = [
  { value: 'AUTO', label: { en: 'Auto', bn: 'অটো' } },
  { value: 'PARBOILED', label: { en: 'Parboiled', bn: 'সেদ্ধ' } },
  { value: 'TRADITIONAL', label: { en: 'Traditional / semi-automatic', bn: 'সনাতন / আধা-স্বয়ংক্রিয়' } },
  { value: 'INTEGRATED', label: { en: 'Integrated', bn: 'সমন্বিত' } },
];

const businessModes: Array<{ value: string; label: { en: string; bn: string } }> = [
  { value: 'PADDY_TRADING', label: { en: 'Paddy trading', bn: 'ধান ব্যবসা' } },
  { value: 'RICE_TRADING', label: { en: 'Rice trading', bn: 'চাল ব্যবসা' } },
  { value: 'WHOLESALE', label: { en: 'Wholesale', bn: 'পাইকারি' } },
  { value: 'RETAIL', label: { en: 'Retail', bn: 'খুচরা' } },
  { value: 'DEALER_DISTRIBUTION', label: { en: 'Dealer distribution', bn: 'ডিলার বিতরণ' } },
  { value: 'TOLL_MILLING', label: { en: 'Toll / commercial milling', bn: 'টোল / বাণিজ্যিক মিলিং' } },
];

const labels = {
  en: {
    title: 'Factory master',
    subtitle: 'Maintain factory identity, manager, capacity, production type and business modes.',
    company: 'Company',
    factories: 'Factories',
    create: 'Add factory',
    edit: 'Edit factory',
    name: 'Factory name',
    code: 'Factory code',
    address: 'Address',
    managerName: 'Manager',
    capacityPerDay: 'Daily capacity (KG)',
    productionType: 'Production type',
    businessModes: 'Business modes',
    status: 'Active',
    active: 'Active',
    inactive: 'Inactive',
    save: 'Save factory',
    cancel: 'Cancel',
    loading: 'Loading factories…',
    empty: 'No factories are configured for this company.',
    failed: 'Could not load factories.',
    saved: 'Factory saved.',
    createFirst: 'Create a factory to configure its production and operational scope.',
  },
  bn: {
    title: 'কারখানা মাস্টার',
    subtitle: 'কারখানার পরিচয়, ব্যবস্থাপক, সক্ষমতা, উৎপাদনের ধরন ও ব্যবসার ধরন নির্ধারণ করুন।',
    company: 'কোম্পানি',
    factories: 'কারখানাসমূহ',
    create: 'কারখানা যোগ',
    edit: 'কারখানা সম্পাদনা',
    name: 'কারখানার নাম',
    code: 'কারখানা কোড',
    address: 'ঠিকানা',
    managerName: 'ব্যবস্থাপক',
    capacityPerDay: 'দৈনিক সক্ষমতা (কেজি)',
    productionType: 'উৎপাদনের ধরন',
    businessModes: 'ব্যবসার ধরন',
    status: 'সক্রিয়',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    save: 'কারখানা সংরক্ষণ',
    cancel: 'বাতিল',
    loading: 'কারখানা লোড হচ্ছে…',
    empty: 'এই কোম্পানির জন্য কোনো কারখানা নেই।',
    failed: 'কারখানার তথ্য লোড করা যায়নি।',
    saved: 'কারখানা সংরক্ষিত হয়েছে।',
    createFirst: 'উৎপাদন ও কার্যক্রম নির্ধারণ করতে একটি কারখানা তৈরি করুন।',
  },
} as const;

function toForm(factory: Factory): FactoryForm {
  return {
    name: factory.name,
    code: factory.code,
    address: factory.address ?? '',
    managerName: factory.managerName ?? '',
    capacityPerDay: factory.capacityPerDay ?? '',
    productionType: factory.productionType,
    businessModes: factory.businessModes,
    active: factory.active,
  };
}

export function FactoryPage({
  companies,
  companyId,
  language,
  onCompanyChanged,
  onSaved,
  onError,
}: {
  companies: Array<{ id: string; name: string; code: string }>;
  companyId: string;
  language: 'en' | 'bn';
  onCompanyChanged: (companyId: string) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = labels[language];
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<FactoryForm>(emptyForm);
  const factoriesQuery = useQuery({
    queryKey: ['factory-master', companyId],
    queryFn: () => apiRequest<Factory[]>(`/factories?companyId=${encodeURIComponent(companyId)}&includeInactive=true`),
    enabled: Boolean(companyId),
  });
  const capabilityQuery = useQuery({
    queryKey: ['factory-create-capability', companyId],
    queryFn: () => apiRequest<{ canCreateFactory: boolean }>(`/factories/capabilities?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId),
  });
  const factories = factoriesQuery.data ?? [];
  const selected = factories.find(factory => factory.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && factories.length) setSelectedId(factories[0].id);
  }, [factories, selectedId]);
  useEffect(() => {
    if (selected) setValues(toForm(selected));
  }, [selected]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...values,
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        address: values.address.trim() || null,
        managerName: values.managerName.trim() || null,
        capacityPerDay: values.capacityPerDay.trim() || null,
        ...(editing ? {} : { companyId }),
      };
      return editing && selected
        ? apiRequest<Factory>(`/factories/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiRequest<Factory>('/factories', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async factory => {
      await queryClient.invalidateQueries({ queryKey: ['factory-master', companyId] });
      setSelectedId(factory.id);
      setValues(toForm(factory));
      setEditing(true);
      onSaved(t.saved);
    },
    onError: error => onError(error instanceof Error ? error.message : t.failed),
  });

  function startCreate() {
    setSelectedId('');
    setEditing(false);
    setValues(emptyForm);
  }

  function setField<K extends keyof FactoryForm>(key: K, value: FactoryForm[K]) {
    setValues(current => ({ ...current, [key]: value }));
  }

  const loading = factoriesQuery.isLoading;
  const error = factoriesQuery.error;
  const capabilityError = capabilityQuery.error && !(capabilityQuery.error instanceof ApiError && capabilityQuery.error.status === 403)
    ? capabilityQuery.error
    : null;
  const canCreateFactory = capabilityQuery.data?.canCreateFactory === true;

  return <Stack spacing={2.5}>
    <Box>
      <Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography>
      <Typography color="text.secondary" fontSize={13} mt={.5}>{t.subtitle}</Typography>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <FormControl size="small" sx={{ minWidth: 280, maxWidth: 480, flex: 1 }}>
        <InputLabel>{t.company}</InputLabel>
        <Select label={t.company} value={companyId} onChange={event => {
          onCompanyChanged(event.target.value);
          setSelectedId('');
          setEditing(false);
        }}>
          {companies.map(company => <MenuItem key={company.id} value={company.id}>{company.name} · {company.code}</MenuItem>)}
        </Select>
      </FormControl>
      {canCreateFactory && <Button variant="contained" disabled={!companyId} onClick={startCreate}>{t.create}</Button>}
    </Stack>
    {error && <Alert severity="error">{error instanceof Error ? error.message : t.failed}</Alert>}
    {capabilityError && <Alert severity="error">{capabilityError instanceof Error ? capabilityError.message : t.failed}</Alert>}
    {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t.loading}</Typography></Stack>}
    {!loading && !factories.length && !editing && <Alert severity="info">{t.empty}{canCreateFactory ? ` ${t.createFirst}` : ''}</Alert>}
    {!loading && factories.length > 0 && !editing && <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography className="brand-font" fontWeight={800} mb={1}>{t.factories}</Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {factories.map(factory => <Chip key={factory.id} clickable
          color={factory.id === selectedId ? 'primary' : 'default'}
          variant={factory.id === selectedId ? 'filled' : 'outlined'}
          onClick={() => { setSelectedId(factory.id); setValues(toForm(factory)); setEditing(false); }}
          label={`${factory.name} · ${factory.code} · ${factory.active ? t.active : t.inactive}`} />)}
      </Stack>
      {selected && <Stack spacing={1.5} mt={2}>
        <Typography fontSize={13}>{selected.address || '—'} · {selected.managerName || '—'}</Typography>
        <Typography fontSize={13}>{selected.productionType} · {selected.capacityPerDay || '—'} KG/day</Typography>
        <Stack direction="row" flexWrap="wrap" gap={.75}>{selected.businessModes.map(mode => <Chip key={mode} size="small" label={mode.replaceAll('_', ' ')} />)}</Stack>
        <Button sx={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>{t.edit}</Button>
      </Stack>}
    </Paper>}
    {(editing || (canCreateFactory && !factories.length && !loading)) && <Paper className="workspace-card" elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      <Typography className="brand-font" fontWeight={800} mb={2}>{selected ? t.edit : t.create}</Typography>
      <Box component="form" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label={t.name} value={values.name} onChange={event => setField('name', event.target.value)} inputProps={{ maxLength: 160 }} required />
            <TextField label={t.code} value={values.code} onChange={event => setField('code', event.target.value)} inputProps={{ maxLength: 24 }} required />
            <TextField label={t.address} value={values.address} onChange={event => setField('address', event.target.value)} multiline minRows={2} />
            <TextField label={t.managerName} value={values.managerName} onChange={event => setField('managerName', event.target.value)} />
            <TextField label={t.capacityPerDay} type="number" value={values.capacityPerDay} onChange={event => setField('capacityPerDay', event.target.value)} inputProps={{ min: 0, step: '.001' }} />
            <FormControl fullWidth>
              <InputLabel>{t.productionType}</InputLabel>
              <Select label={t.productionType} value={values.productionType} onChange={event => setField('productionType', event.target.value as Factory['productionType'])}>
                {productionTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label[language]}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ gridColumn: { sm: '1 / -1' } }}>
              <InputLabel>{t.businessModes}</InputLabel>
              <Select multiple label={t.businessModes} value={values.businessModes}
                onChange={event => setField('businessModes', typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}>
                {businessModes.map(mode => <MenuItem key={mode.value} value={mode.value}>{mode.label[language]}</MenuItem>)}
              </Select>
            </FormControl>
            {editing && <FormControlLabel control={<Switch checked={values.active} onChange={event => setField('active', event.target.checked)} />} label={t.status} />}
          </Box>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            {selected && <Button onClick={() => { setEditing(false); setValues(toForm(selected)); }}>{t.cancel}</Button>}
            <Button type="submit" variant="contained" disabled={mutation.isPending || !companyId || (!editing && !canCreateFactory) || !values.name.trim() || !values.code.trim()}>
              {mutation.isPending ? <CircularProgress size={18} color="inherit" /> : t.save}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>}
  </Stack>;
}
