'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaddyItem | null>(null);
  const [values, setValues] = useState<PaddyForm>(blankForm);
  const [formError, setFormError] = useState('');

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
      onSaved(language === 'bn' ? 'ধানের তথ্য সংরক্ষিত হয়েছে।' : 'Paddy variety saved.');
    },
    onError: reason => setFormError(messageOf(reason, t.failed)),
  });

  function startCreate() {
    setEditing(null);
    setValues(blankForm);
    setFormError('');
    setOpen(true);
  }

  function startEdit(item: PaddyItem) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    mutation.mutate();
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;

  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Button variant="contained" onClick={startCreate}>{t.add}</Button>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField size="small" fullWidth value={search} placeholder={t.search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>{t.filter}</InputLabel><Select label={t.filter} value={activeFilter} onChange={event => { setActiveFilter(event.target.value as typeof activeFilter); setPage(1); }}>
        <MenuItem value="all">{t.all}</MenuItem><MenuItem value="true">{t.activeOnly}</MenuItem><MenuItem value="false">{t.inactiveOnly}</MenuItem>
      </Select></FormControl>
    </Stack>
    {itemsQuery.error && <Alert severity="error">{messageOf(itemsQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small">
          <TableHead><TableRow>{[t.name, t.code, t.variety, t.localName, t.cropYear, t.grade, t.moisture, t.recovery, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => <TableRow key={item.id} hover>
              <TableCell>{item.name}</TableCell><TableCell>{item.code}</TableCell><TableCell>{item.variety}</TableCell>
              <TableCell>{item.localName ?? '—'}</TableCell><TableCell>{item.cropYear ?? '—'}</TableCell><TableCell>{item.grade ?? '—'}</TableCell>
              <TableCell>{Number(item.standardMoisture).toFixed(2)}%</TableCell><TableCell>{Number(item.standardRecovery).toFixed(2)}%</TableCell>
              <TableCell><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
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

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? t.edit : t.add}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent><Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label={t.name} required value={values.name} onChange={event => setValues(current => ({ ...current, name: event.target.value }))} />
          <TextField label={t.code} required value={values.code} onChange={event => setValues(current => ({ ...current, code: event.target.value }))} />
          <TextField label={t.variety} required value={values.variety} onChange={event => setValues(current => ({ ...current, variety: event.target.value }))} />
          <TextField label={t.localName} value={values.localName} onChange={event => setValues(current => ({ ...current, localName: event.target.value }))} />
          <TextField label={t.cropYear} type="number" inputProps={{ min: 1900, max: 2200 }} value={values.cropYear} onChange={event => setValues(current => ({ ...current, cropYear: event.target.value }))} />
          <TextField label={t.grade} value={values.grade} onChange={event => setValues(current => ({ ...current, grade: event.target.value }))} />
          <TextField label={t.moisture} type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.standardMoisture} onChange={event => setValues(current => ({ ...current, standardMoisture: event.target.value }))} />
          <TextField label={t.recovery} type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.standardRecovery} onChange={event => setValues(current => ({ ...current, standardRecovery: event.target.value }))} />
          <TextField label={t.description} multiline minRows={2} value={values.description} onChange={event => setValues(current => ({ ...current, description: event.target.value }))} />
          {editing && <FormControl fullWidth><InputLabel>{t.active}</InputLabel><Select label={t.active} value={values.active ? 'true' : 'false'} onChange={event => setValues(current => ({ ...current, active: event.target.value === 'true' }))}><MenuItem value="true">{t.enabled}</MenuItem><MenuItem value="false">{t.disabled}</MenuItem></Select></FormControl>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={mutation.isPending}>{mutation.isPending ? <CircularProgress size={18} /> : t.save}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
