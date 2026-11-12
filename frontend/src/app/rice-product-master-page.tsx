'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

type RiceItem = {
  id: string;
  name: string;
  code: string;
  brand: string | null;
  riceType: string;
  variety: string | null;
  grade: string | null;
  headRicePercentage: string;
  brokenPercentage: string;
  defaultPackagingLabel: string | null;
  active: boolean;
};
type RiceForm = {
  name: string;
  code: string;
  brand: string;
  riceTypeChoice: string;
  customRiceType: string;
  variety: string;
  grade: string;
  headRicePercentage: string;
  brokenPercentage: string;
  packagingType: string;
  active: boolean;
};

const riceTypes = [
  { value: 'PARBOILED', en: 'Parboiled', bn: 'সেদ্ধ' },
  { value: 'ATAP', en: 'Atap', bn: 'আতপ' },
  { value: 'MINIKET', en: 'Miniket', bn: 'মিনিকেট' },
  { value: 'NAJIRSHAIL', en: 'Najirshail', bn: 'নাজিরশাইল' },
  { value: 'PREMIUM', en: 'Premium', bn: 'প্রিমিয়াম' },
  { value: 'BROKEN', en: 'Broken', bn: 'খুদ' },
];
const blankForm: RiceForm = {
  name: '', code: '', brand: '', riceTypeChoice: '', customRiceType: '',
  variety: '', grade: '', headRicePercentage: '', brokenPercentage: '', packagingType: '', active: true,
};

const labels = {
  en: {
    title: 'Rice product master',
    subtitle: 'Maintain rice products, brands, types, recovery composition and default packaging labels.',
    add: 'Add rice product',
    edit: 'Edit rice product',
    name: 'Product name',
    code: 'Item code',
    brand: 'Brand',
    riceType: 'Rice type',
    custom: 'Custom type',
    choose: 'Select type',
    variety: 'Variety',
    grade: 'Grade',
    head: 'Head rice (%)',
    broken: 'Broken rice (%)',
    packaging: 'Packaging type / label',
    active: 'Active',
    status: 'Status',
    actions: 'Actions',
    save: 'Save product',
    cancel: 'Cancel',
    search: 'Search name, code, brand, variety...',
    filter: 'Status filter',
    all: 'All',
    activeOnly: 'Active',
    inactiveOnly: 'Inactive',
    noRows: 'No rice products found.',
    loading: 'Loading rice products...',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    failed: 'Could not load rice products.',
    noCompany: 'Select a company to manage its rice catalog.',
    enabled: 'Active',
    disabled: 'Inactive',
  },
  bn: {
    title: 'চাল পণ্য মাস্টার',
    subtitle: 'চাল পণ্য, ব্র্যান্ড, ধরন, চালের গঠন ও প্যাকেজিং লেবেল পরিচালনা করুন।',
    add: 'চাল পণ্য যোগ',
    edit: 'চাল পণ্য সম্পাদনা',
    name: 'পণ্যের নাম',
    code: 'আইটেম কোড',
    brand: 'ব্র্যান্ড',
    riceType: 'চালের ধরন',
    custom: 'নিজস্ব ধরন',
    choose: 'ধরন নির্বাচন করুন',
    variety: 'জাত',
    grade: 'মান',
    head: 'আতপ চাল (%)',
    broken: 'খুদ চাল (%)',
    packaging: 'প্যাকেজিং ধরন / লেবেল',
    active: 'সক্রিয়',
    status: 'অবস্থা',
    actions: 'কার্যক্রম',
    save: 'পণ্য সংরক্ষণ',
    cancel: 'বাতিল',
    search: 'নাম, কোড, ব্র্যান্ড বা জাত খুঁজুন...',
    filter: 'অবস্থা',
    all: 'সব',
    activeOnly: 'সক্রিয়',
    inactiveOnly: 'নিষ্ক্রিয়',
    noRows: 'কোনো চাল পণ্য পাওয়া যায়নি।',
    loading: 'চাল পণ্য লোড হচ্ছে...',
    previous: 'আগের',
    next: 'পরের',
    page: 'পৃষ্ঠা',
    failed: 'চাল পণ্য লোড করা যায়নি।',
    noCompany: 'চালের পণ্য পরিচালনার জন্য কোম্পানি নির্বাচন করুন।',
    enabled: 'সক্রিয়',
    disabled: 'নিষ্ক্রিয়',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toForm(item: RiceItem): RiceForm {
  const knownType = riceTypes.some(type => type.value === item.riceType);
  return {
    name: item.name,
    code: item.code,
    brand: item.brand ?? '',
    riceTypeChoice: knownType ? item.riceType : 'CUSTOM',
    customRiceType: knownType ? '' : item.riceType,
    variety: item.variety ?? '',
    grade: item.grade ?? '',
    headRicePercentage: item.headRicePercentage,
    brokenPercentage: item.brokenPercentage,
    packagingType: item.defaultPackagingLabel ?? '',
    active: item.active,
  };
}

export function RiceProductMasterPage({
  companyId,
  language,
  onSaved,
}: {
  companyId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
}) {
  const t = labels[language];
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RiceItem | null>(null);
  const [values, setValues] = useState<RiceForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const itemsQuery = useQuery({
    queryKey: ['rice-product-master', companyId, search, activeFilter, page],
    queryFn: () => apiRequest<RiceItem[]>(`/items?${queryString({
      companyId,
      kind: 'RICE',
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 100,
    })}`),
    enabled: Boolean(companyId),
  });
  const rows = itemsQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        companyId,
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        brand: values.brand.trim() || null,
        riceType: values.riceTypeChoice === 'CUSTOM' ? values.customRiceType.trim() : values.riceTypeChoice,
        variety: values.variety.trim() || null,
        grade: values.grade.trim() || null,
        headRicePercentage: Number(values.headRicePercentage),
        brokenPercentage: Number(values.brokenPercentage),
        defaultPackagingLabel: values.packagingType.trim() || null,
        ...(editing ? { active: values.active } : { kind: 'RICE', baseUnit: 'KG' }),
      };
      return editing
        ? apiRequest<RiceItem>(`/items/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiRequest<RiceItem>('/items', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rice-product-master', companyId] });
      setOpen(false);
      setEditing(null);
      setValues(blankForm);
      setFormError('');
      setFieldErrors({});
      onSaved(language === 'bn' ? 'চাল পণ্য সংরক্ষিত হয়েছে।' : 'Rice product saved.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.failed);
      setFormError(msg);
      toast.error(msg);
    },
  });

  function startCreate() {
    setEditing(null);
    setValues(blankForm);
    setFormError('');
    setFieldErrors({});
    setOpen(true);
  }

  function startEdit(item: RiceItem) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setFieldErrors({});
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'name', label: t.name, value: values.name, required: true },
        { name: 'code', label: t.code, value: values.code, required: true },
        { name: 'riceTypeChoice', label: t.riceType, value: values.riceTypeChoice, required: true, isSelect: true },
        ...(values.riceTypeChoice === 'CUSTOM'
          ? [{ name: 'customRiceType', label: t.custom, value: values.customRiceType, required: true }]
          : []),
        { name: 'headRicePercentage', label: t.head, value: values.headRicePercentage, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
        { name: 'brokenPercentage', label: t.broken, value: values.brokenPercentage, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setFormError('');
    setFieldErrors({});
    mutation.mutate();
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;

  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Button variant="contained" onClick={startCreate}>{t.add}</Button>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <AppTextField fieldName="search" value={search} placeholder={t.search} onValueChange={v => { setSearch(v); setPage(1); }} />
      <Box sx={{ minWidth: 180 }}>
        <AppSelect
          name="filter"
          label={t.filter}
          value={activeFilter}
          onChange={v => { setActiveFilter(v as typeof activeFilter); setPage(1); }}
          options={[
            { value: 'all', label: t.all },
            { value: 'true', label: t.activeOnly },
            { value: 'false', label: t.inactiveOnly },
          ]}
        />
      </Box>
    </Stack>
    {itemsQuery.error && <Alert severity="error">{extractApiError(itemsQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.brand, align: 'left' },
            { label: t.riceType, align: 'left' },
            { label: t.variety, align: 'left' },
            { label: t.grade, align: 'left' },
            { label: t.head, align: 'right' },
            { label: t.broken, align: 'right' },
            { label: t.packaging, align: 'left' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => <TableRow key={item.id} hover>
              <TableCell sx={{ maxWidth: 190 }}><Typography variant="body2" fontWeight={600} noWrap title={item.name}>{item.name}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.code}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.brand ?? '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.riceType}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.variety ?? '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.grade ?? '—'}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(item.headRicePercentage).toFixed(2)}%</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(item.brokenPercentage).toFixed(2)}%</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.defaultPackagingLabel ?? '—'}</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
            </TableRow>)}
            {!rows.length && <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>}
    </Paper>
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
      <Typography variant="caption">{t.page} {page}</Typography>
      <Button size="small" disabled={page === 1 || itemsQuery.isFetching} onClick={() => setPage(current => current - 1)}>{t.previous}</Button>
      <Button size="small" disabled={rows.length < 100 || itemsQuery.isFetching} onClick={() => setPage(current => current + 1)}>{t.next}</Button>
    </Stack>

    <FormDialog
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={submit}
      title={editing ? t.edit : t.add}
      error={formError}
      onClearError={() => setFormError('')}
      loading={mutation.isPending}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={2}>
        <AppTextField fieldName="name" label={t.name} required value={values.name} errorText={fieldErrors.name} onValueChange={v => { setValues(c => ({ ...c, name: v })); setFieldErrors(p => ({ ...p, name: '' })); }} />
        <AppTextField fieldName="code" label={t.code} required value={values.code} errorText={fieldErrors.code} onValueChange={v => { setValues(c => ({ ...c, code: v })); setFieldErrors(p => ({ ...p, code: '' })); }} />
        <AppTextField fieldName="brand" label={t.brand} value={values.brand} onValueChange={v => setValues(c => ({ ...c, brand: v }))} />
        <AppSelect
          fieldName="riceTypeChoice"
          label={t.riceType}
          required
          value={values.riceTypeChoice}
          emptyOptionLabel={t.choose}
          errorText={fieldErrors.riceTypeChoice}
          onChange={v => { setValues(c => ({ ...c, riceTypeChoice: v })); setFieldErrors(p => ({ ...p, riceTypeChoice: '' })); }}
          options={[
            ...riceTypes.map(type => ({ value: type.value, label: type[language] })),
            { value: 'CUSTOM', label: t.custom },
          ]}
        />
        {values.riceTypeChoice === 'CUSTOM' && (
          <AppTextField fieldName="customRiceType" label={t.custom} required value={values.customRiceType} errorText={fieldErrors.customRiceType} onValueChange={v => { setValues(c => ({ ...c, customRiceType: v })); setFieldErrors(p => ({ ...p, customRiceType: '' })); }} />
        )}
        <AppTextField fieldName="variety" label={t.variety} value={values.variety} onValueChange={v => setValues(c => ({ ...c, variety: v }))} />
        <AppTextField fieldName="grade" label={t.grade} value={values.grade} onValueChange={v => setValues(c => ({ ...c, grade: v }))} />
        <AppTextField fieldName="headRicePercentage" label={t.head} unit="%" type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.headRicePercentage} errorText={fieldErrors.headRicePercentage} onValueChange={v => { setValues(c => ({ ...c, headRicePercentage: v })); setFieldErrors(p => ({ ...p, headRicePercentage: '' })); }} />
        <AppTextField fieldName="brokenPercentage" label={t.broken} unit="%" type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.brokenPercentage} errorText={fieldErrors.brokenPercentage} onValueChange={v => { setValues(c => ({ ...c, brokenPercentage: v })); setFieldErrors(p => ({ ...p, brokenPercentage: '' })); }} />
        <AppTextField fieldName="packagingType" label={t.packaging} value={values.packagingType} onValueChange={v => setValues(c => ({ ...c, packagingType: v }))} />
        {editing && (
          <AppSelect
            fieldName="active"
            label={t.active}
            value={values.active ? 'true' : 'false'}
            onChange={v => setValues(c => ({ ...c, active: v === 'true' }))}
            options={[{ value: 'true', label: t.enabled }, { value: 'false', label: t.disabled }]}
          />
        )}
      </FormGrid>
    </FormDialog>
  </Stack>;
}
