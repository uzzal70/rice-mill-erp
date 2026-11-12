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

type PaddyItem = {
  id: string;
  name: string;
  code: string;
  variety: string;
  localName: string | null;
  cropYear: number | null;
  grade: string | null;
  standardMoisture: string;
  standardRecovery: string;
  description: string | null;
  active: boolean;
};
type PaddyForm = {
  name: string;
  code: string;
  variety: string;
  localName: string;
  cropYear: string;
  grade: string;
  standardMoisture: string;
  standardRecovery: string;
  description: string;
  active: boolean;
};

const blankForm: PaddyForm = {
  name: '', code: '', variety: '', localName: '', cropYear: '', grade: '',
  standardMoisture: '', standardRecovery: '', description: '', active: true,
};

const labels = {
  en: {
    title: 'Paddy master',
    subtitle: 'Maintain company-specific paddy varieties and quality baselines used by procurement and production.',
    add: 'Add paddy variety',
    edit: 'Edit paddy variety',
    name: 'Paddy name',
    code: 'Item code',
    variety: 'Variety',
    localName: 'Local name',
    cropYear: 'Crop year',
    grade: 'Grade',
    moisture: 'Standard moisture (%)',
    recovery: 'Standard recovery (%)',
    description: 'Description',
    active: 'Active',
    status: 'Status',
    actions: 'Actions',
    save: 'Save paddy',
    cancel: 'Cancel',
    search: 'Search name, code, variety...',
    filter: 'Status filter',
    all: 'All',
    activeOnly: 'Active',
    inactiveOnly: 'Inactive',
    noRows: 'No paddy varieties found.',
    loading: 'Loading paddy catalog...',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    failed: 'Could not load paddy varieties.',
    noCompany: 'Select a company to manage its paddy catalog.',
    enabled: 'Active',
    disabled: 'Inactive',
  },
  bn: {
    title: 'ধান মাস্টার',
    subtitle: 'ক্রয় ও উৎপাদনে ব্যবহৃত ধানের জাত ও মানদণ্ড পরিচালনা করুন।',
    add: 'ধানের জাত যোগ',
    edit: 'ধানের জাত সম্পাদনা',
    name: 'ধানের নাম',
    code: 'আইটেম কোড',
    variety: 'জাত',
    localName: 'স্থানীয় নাম',
    cropYear: 'ফসলের বছর',
    grade: 'মান',
    moisture: 'মানক আর্দ্রতা (%)',
    recovery: 'মানক রিকভারি (%)',
    description: 'বিবরণ',
    active: 'সক্রিয়',
    status: 'অবস্থা',
    actions: 'কার্যক্রম',
    save: 'ধান সংরক্ষণ',
    cancel: 'বাতিল',
    search: 'নাম, কোড বা জাত খুঁজুন...',
    filter: 'অবস্থা',
    all: 'সব',
    activeOnly: 'সক্রিয়',
    inactiveOnly: 'নিষ্ক্রিয়',
    noRows: 'কোনো ধানের জাত পাওয়া যায়নি।',
    loading: 'ধানের তালিকা লোড হচ্ছে...',
    previous: 'আগের',
    next: 'পরের',
    page: 'পৃষ্ঠা',
    failed: 'ধানের তালিকা লোড করা যায়নি।',
    noCompany: 'ধানের তালিকা পরিচালনার জন্য কোম্পানি নির্বাচন করুন।',
    enabled: 'সক্রিয়',
    disabled: 'নিষ্ক্রিয়',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toForm(item: PaddyItem): PaddyForm {
  return {
    name: item.name,
    code: item.code,
    variety: item.variety,
    localName: item.localName ?? '',
    cropYear: item.cropYear?.toString() ?? '',
    grade: item.grade ?? '',
    standardMoisture: item.standardMoisture,
    standardRecovery: item.standardRecovery,
    description: item.description ?? '',
    active: item.active,
  };
}

export function PaddyMasterPage({
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
  const [editing, setEditing] = useState<PaddyItem | null>(null);
  const [values, setValues] = useState<PaddyForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const itemsQuery = useQuery({
    queryKey: ['paddy-master', companyId, search, activeFilter, page],
    queryFn: () => apiRequest<PaddyItem[]>(`/items?${queryString({
      companyId,
      kind: 'PADDY',
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
        variety: values.variety.trim(),
        localName: values.localName.trim() || null,
        cropYear: values.cropYear ? Number(values.cropYear) : null,
        grade: values.grade.trim() || null,
        standardMoisture: Number(values.standardMoisture),
        standardRecovery: Number(values.standardRecovery),
        description: values.description.trim() || null,
        ...(editing ? { active: values.active } : { kind: 'PADDY', baseUnit: 'KG' }),
      };
      return editing
        ? apiRequest<PaddyItem>(`/items/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiRequest<PaddyItem>('/items', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['paddy-master', companyId] });
      setOpen(false);
      setEditing(null);
      setValues(blankForm);
      setFormError('');
      setFieldErrors({});
      onSaved(language === 'bn' ? 'ধানের তথ্য সংরক্ষিত হয়েছে।' : 'Paddy variety saved.');
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

  function startEdit(item: PaddyItem) {
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
        { name: 'variety', label: t.variety, value: values.variety, required: true },
        { name: 'cropYear', label: t.cropYear, value: values.cropYear, type: 'integer', min: 1900, max: 2200 },
        { name: 'standardMoisture', label: t.moisture, value: values.standardMoisture, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
        { name: 'standardRecovery', label: t.recovery, value: values.standardRecovery, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
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
      <AppTextField fieldName="search" value={search} placeholder={t.search} onValueChange={val => { setSearch(val); setPage(1); }} />
      <Box sx={{ minWidth: 180 }}>
        <AppSelect
          name="filter"
          label={t.filter}
          value={activeFilter}
          onChange={val => { setActiveFilter(val as typeof activeFilter); setPage(1); }}
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
        : <Table size="small" sx={{ minWidth: 950 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.variety, align: 'left' },
            { label: t.localName, align: 'left' },
            { label: t.cropYear, align: 'left' },
            { label: t.grade, align: 'left' },
            { label: t.moisture, align: 'right' },
            { label: t.recovery, align: 'right' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => <TableRow key={item.id} hover>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={item.name}>{item.name}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.code}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.variety}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.localName ?? '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.cropYear ?? '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.grade ?? '—'}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(item.standardMoisture).toFixed(2)}%</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{Number(item.standardRecovery).toFixed(2)}%</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
            </TableRow>)}
            {!rows.length && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
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
        <AppTextField fieldName="variety" label={t.variety} required value={values.variety} errorText={fieldErrors.variety} onValueChange={v => { setValues(c => ({ ...c, variety: v })); setFieldErrors(p => ({ ...p, variety: '' })); }} />
        <AppTextField fieldName="localName" label={t.localName} value={values.localName} onValueChange={v => setValues(c => ({ ...c, localName: v }))} />
        <AppTextField fieldName="cropYear" label={t.cropYear} type="number" inputProps={{ min: 1900, max: 2200 }} value={values.cropYear} errorText={fieldErrors.cropYear} onValueChange={v => { setValues(c => ({ ...c, cropYear: v })); setFieldErrors(p => ({ ...p, cropYear: '' })); }} />
        <AppTextField fieldName="grade" label={t.grade} value={values.grade} onValueChange={v => setValues(c => ({ ...c, grade: v }))} />
        <AppTextField fieldName="standardMoisture" label={t.moisture} unit="%" type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.standardMoisture} errorText={fieldErrors.standardMoisture} onValueChange={v => { setValues(c => ({ ...c, standardMoisture: v })); setFieldErrors(p => ({ ...p, standardMoisture: '' })); }} />
        <AppTextField fieldName="standardRecovery" label={t.recovery} unit="%" type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.standardRecovery} errorText={fieldErrors.standardRecovery} onValueChange={v => { setValues(c => ({ ...c, standardRecovery: v })); setFieldErrors(p => ({ ...p, standardRecovery: '' })); }} />
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <AppTextField fieldName="description" label={t.description} multiline minRows={2} value={values.description} onValueChange={v => setValues(c => ({ ...c, description: v }))} />
        </Box>
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
