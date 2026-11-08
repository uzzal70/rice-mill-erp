'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RiceItem | null>(null);
  const [values, setValues] = useState<RiceForm>(blankForm);
  const [formError, setFormError] = useState('');

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
      onSaved(language === 'bn' ? 'চাল পণ্য সংরক্ষিত হয়েছে।' : 'Rice product saved.');
    },
    onError: reason => setFormError(messageOf(reason, t.failed)),
  });

  function startCreate() {
    setEditing(null);
    setValues(blankForm);
    setFormError('');
    setOpen(true);
  }

  function startEdit(item: RiceItem) {
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
          <TableHead><TableRow>{[t.name, t.code, t.brand, t.riceType, t.variety, t.grade, t.head, t.broken, t.packaging, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => <TableRow key={item.id} hover>
              <TableCell>{item.name}</TableCell><TableCell>{item.code}</TableCell><TableCell>{item.brand ?? '—'}</TableCell>
              <TableCell>{item.riceType}</TableCell><TableCell>{item.variety ?? '—'}</TableCell><TableCell>{item.grade ?? '—'}</TableCell>
              <TableCell>{Number(item.headRicePercentage).toFixed(2)}%</TableCell><TableCell>{Number(item.brokenPercentage).toFixed(2)}%</TableCell>
              <TableCell>{item.defaultPackagingLabel ?? '—'}</TableCell>
              <TableCell><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
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

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? t.edit : t.add}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent><Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label={t.name} required value={values.name} onChange={event => setValues(current => ({ ...current, name: event.target.value }))} />
          <TextField label={t.code} required value={values.code} onChange={event => setValues(current => ({ ...current, code: event.target.value }))} />
          <TextField label={t.brand} value={values.brand} onChange={event => setValues(current => ({ ...current, brand: event.target.value }))} />
          <FormControl fullWidth required><InputLabel>{t.riceType}</InputLabel><Select label={t.riceType} value={values.riceTypeChoice} onChange={event => setValues(current => ({ ...current, riceTypeChoice: event.target.value }))}>
            <MenuItem value="">{t.choose}</MenuItem>
            {riceTypes.map(type => <MenuItem key={type.value} value={type.value}>{type[language]}</MenuItem>)}
            <MenuItem value="CUSTOM">{t.custom}</MenuItem>
          </Select></FormControl>
          {values.riceTypeChoice === 'CUSTOM' && <TextField label={t.custom} required value={values.customRiceType} onChange={event => setValues(current => ({ ...current, customRiceType: event.target.value }))} />}
          <TextField label={t.variety} value={values.variety} onChange={event => setValues(current => ({ ...current, variety: event.target.value }))} />
          <TextField label={t.grade} value={values.grade} onChange={event => setValues(current => ({ ...current, grade: event.target.value }))} />
          <TextField label={t.head} type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.headRicePercentage} onChange={event => setValues(current => ({ ...current, headRicePercentage: event.target.value }))} />
          <TextField label={t.broken} type="number" inputProps={{ min: 0, max: 100, step: 0.01 }} required value={values.brokenPercentage} onChange={event => setValues(current => ({ ...current, brokenPercentage: event.target.value }))} />
          <TextField label={t.packaging} value={values.packagingType} onChange={event => setValues(current => ({ ...current, packagingType: event.target.value }))} />
          {editing && <FormControl fullWidth><InputLabel>{t.active}</InputLabel><Select label={t.active} value={values.active ? 'true' : 'false'} onChange={event => setValues(current => ({ ...current, active: event.target.value === 'true' }))}><MenuItem value="true">{t.enabled}</MenuItem><MenuItem value="false">{t.disabled}</MenuItem></Select></FormControl>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={mutation.isPending}>{mutation.isPending ? <CircularProgress size={18} /> : t.save}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
