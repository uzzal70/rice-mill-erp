'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, queryString } from '@/lib/api';

type ByProduct = {
  id: string;
  name: string;
  code: string;
  byProductType: string | null;
  grade: string | null;
  description: string | null;
  active: boolean;
  hasReferencePrices: boolean;
};
type Activity = { itemId: string; stockKg: string; productionKg: string; salesKg: string };
type ReferencePrices = { purchasePrice: string | null; salesPrice: string | null };
type ByProductForm = {
  name: string;
  code: string;
  byProductTypeChoice: string;
  customType: string;
  grade: string;
  description: string;
  purchasePrice: string;
  salesPrice: string;
  active: boolean;
};

const byProductTypes = [
  { value: 'BRAN', en: 'Bran', bn: 'কুঁড়া' },
  { value: 'HUSK', en: 'Husk', bn: 'তুষ' },
  { value: 'RICE_POLISH', en: 'Rice Polish', bn: 'রাইস পলিশ' },
  { value: 'BROKEN_RICE', en: 'Broken Rice', bn: 'খুদ চাল' },
  { value: 'DUST', en: 'Dust', bn: 'ধুলা' },
  { value: 'WASTE', en: 'Waste', bn: 'বর্জ্য' },
  { value: 'OTHER', en: 'Other', bn: 'অন্যান্য' },
];

const blankForm: ByProductForm = {
  name: '', code: '', byProductTypeChoice: '', customType: '', grade: '', description: '',
  purchasePrice: '', salesPrice: '', active: true,
};

const labels = {
  en: {
    title: 'By-product master',
    subtitle: 'Maintain rice-mill by-products and inspect stock, production output, and sales movements.',
    add: 'Add by-product',
    edit: 'Edit by-product',
    type: 'By-product type',
    name: 'Product name',
    code: 'Item code',
    custom: 'Custom type',
    choose: 'Select type',
    grade: 'Grade',
    description: 'Description',
    purchasePrice: 'Purchase price / KG',
    salesPrice: 'Sales price / KG',
    stock: 'Current stock (KG)',
    production: 'Produced (KG)',
    sales: 'Net sales movement (KG)',
    prices: 'Reference prices',
    priceSet: 'Configured',
    priceMissing: 'Not configured',
    priceAction: 'Set prices',
    editPrices: 'Edit prices',
    active: 'Active',
    status: 'Status',
    actions: 'Actions',
    save: 'Save by-product',
    savePrices: 'Save prices',
    cancel: 'Cancel',
    search: 'Search name, code, type...',
    filter: 'Status filter',
    all: 'All',
    activeOnly: 'Active',
    inactiveOnly: 'Inactive',
    noRows: 'No by-products found.',
    loading: 'Loading by-product catalog...',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    failed: 'Could not load by-products.',
    noCompany: 'Select a company to manage its by-product catalog.',
    noFactory: 'Select a factory to inspect stock and activity.',
    inventoryPermission: 'Inventory permission is required to view by-product stock activity.',
    enabled: 'Active',
    disabled: 'Inactive',
    permission: 'Reference prices require the appropriate financial permission.',
  },
  bn: {
    title: 'উপজাত পণ্য মাস্টার',
    subtitle: 'চালের উপজাত পণ্য পরিচালনা এবং মজুদ, উৎপাদন ও বিক্রয় মুভমেন্ট দেখুন।',
    add: 'উপজাত পণ্য যোগ',
    edit: 'উপজাত পণ্য সম্পাদনা',
    type: 'উপজাত পণ্যের ধরন',
    name: 'পণ্যের নাম',
    code: 'আইটেম কোড',
    custom: 'নিজস্ব ধরন',
    choose: 'ধরন নির্বাচন করুন',
    grade: 'মান',
    description: 'বিবরণ',
    purchasePrice: 'ক্রয় মূল্য / কেজি',
    salesPrice: 'বিক্রয় মূল্য / কেজি',
    stock: 'বর্তমান মজুদ (কেজি)',
    production: 'উৎপাদন (কেজি)',
    sales: 'নিট বিক্রয় মুভমেন্ট (কেজি)',
    prices: 'রেফারেন্স মূল্য',
    priceSet: 'নির্ধারিত',
    priceMissing: 'নির্ধারিত নয়',
    priceAction: 'মূল্য নির্ধারণ',
    editPrices: 'মূল্য সম্পাদনা',
    active: 'সক্রিয়',
    status: 'অবস্থা',
    actions: 'কার্যক্রম',
    save: 'উপজাত পণ্য সংরক্ষণ',
    savePrices: 'মূল্য সংরক্ষণ',
    cancel: 'বাতিল',
    search: 'নাম, কোড বা ধরন খুঁজুন...',
    filter: 'অবস্থা',
    all: 'সব',
    activeOnly: 'সক্রিয়',
    inactiveOnly: 'নিষ্ক্রিয়',
    noRows: 'কোনো উপজাত পণ্য পাওয়া যায়নি।',
    loading: 'উপজাত পণ্যের তালিকা লোড হচ্ছে...',
    previous: 'আগের',
    next: 'পরের',
    page: 'পৃষ্ঠা',
    failed: 'উপজাত পণ্যের তালিকা লোড করা যায়নি।',
    noCompany: 'উপজাত পণ্যের তালিকা পরিচালনার জন্য কোম্পানি নির্বাচন করুন।',
    noFactory: 'মজুদ ও কার্যক্রম দেখতে কারখানা নির্বাচন করুন।',
    inventoryPermission: 'উপজাত পণ্যের মজুদ কার্যক্রম দেখতে ইনভেন্টরি অনুমতি প্রয়োজন।',
    enabled: 'সক্রিয়',
    disabled: 'নিষ্ক্রিয়',
    permission: 'রেফারেন্স মূল্য দেখতে আর্থিক অনুমতি প্রয়োজন।',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toForm(item: ByProduct): ByProductForm {
  const knownType = byProductTypes.some(type => type.value === item.byProductType);
  return {
    name: item.name,
    code: item.code,
    byProductTypeChoice: knownType ? item.byProductType! : 'CUSTOM',
    customType: knownType ? '' : item.byProductType ?? '',
    grade: item.grade ?? '',
    description: item.description ?? '',
    purchasePrice: '',
    salesPrice: '',
    active: item.active,
  };
}

export function ByProductMasterPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
}) {
  const t = labels[language];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ByProduct | null>(null);
  const [values, setValues] = useState<ByProductForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [priceItem, setPriceItem] = useState<ByProduct | null>(null);
  const [priceValues, setPriceValues] = useState<ReferencePrices>({ purchasePrice: '', salesPrice: '' });
  const [priceError, setPriceError] = useState('');

  const itemsQuery = useQuery({
    queryKey: ['by-product-master', companyId, search, activeFilter, page],
    queryFn: () => apiRequest<ByProduct[]>(`/items?${queryString({
      companyId,
      kind: 'BY_PRODUCT',
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 100,
    })}`),
    enabled: Boolean(companyId),
  });
  const activityQuery = useQuery({
    queryKey: ['by-product-activity', companyId, factoryId, search, activeFilter, page],
    queryFn: () => apiRequest<Activity[]>(`/inventory/by-products?${queryString({
      companyId,
      factoryId,
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 100,
    })}`),
    enabled: Boolean(companyId && factoryId),
  });
  const priceQuery = useQuery({
    queryKey: ['by-product-prices', companyId, priceItem?.id],
    queryFn: () => apiRequest<ReferencePrices>(`/items/${encodeURIComponent(priceItem!.id)}/reference-prices?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId && priceItem),
  });

  useEffect(() => {
    if (priceQuery.data) {
      setPriceValues({
        purchasePrice: priceQuery.data.purchasePrice ?? '',
        salesPrice: priceQuery.data.salesPrice ?? '',
      });
    }
  }, [priceQuery.data]);

  const activityByItem = new Map((activityQuery.data ?? []).map(row => [row.itemId, row]));
  const rows = itemsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const byProductType = values.byProductTypeChoice === 'CUSTOM' ? values.customType.trim() : values.byProductTypeChoice;
      return apiRequest<ByProduct>('/items/by-products', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          kind: 'BY_PRODUCT',
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          byProductType,
          grade: values.grade.trim() || null,
          description: values.description.trim() || null,
          baseUnit: 'KG',
          purchasePrice: values.purchasePrice,
          salesPrice: values.salesPrice,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['by-product-master', companyId] });
      setOpen(false);
      setEditing(null);
      setValues(blankForm);
      onSaved(language === 'bn' ? 'উপজাত পণ্য সংরক্ষিত হয়েছে।' : 'By-product saved.');
    },
    onError: reason => setFormError(messageOf(reason, t.failed)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error(t.failed);
      const byProductType = values.byProductTypeChoice === 'CUSTOM' ? values.customType.trim() : values.byProductTypeChoice;
      return apiRequest<ByProduct>(`/items/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          companyId,
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          byProductType,
          grade: values.grade.trim() || null,
          description: values.description.trim() || null,
          active: values.active,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['by-product-master', companyId] });
      setOpen(false);
      setEditing(null);
      onSaved(language === 'bn' ? 'উপজাত পণ্য হালনাগাদ হয়েছে।' : 'By-product updated.');
    },
    onError: reason => setFormError(messageOf(reason, t.failed)),
  });

  const priceMutation = useMutation({
    mutationFn: () => {
      if (!priceItem) throw new Error(t.failed);
      return apiRequest(`/items/${encodeURIComponent(priceItem.id)}/reference-prices`, {
        method: 'PUT',
        body: JSON.stringify({ companyId, purchasePrice: priceValues.purchasePrice, salesPrice: priceValues.salesPrice }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['by-product-prices', companyId, priceItem?.id] });
      await queryClient.invalidateQueries({ queryKey: ['by-product-master', companyId] });
      setPriceError('');
      setPriceItem(null);
      onSaved(language === 'bn' ? 'রেফারেন্স মূল্য সংরক্ষিত হয়েছে।' : 'Reference prices saved.');
    },
    onError: reason => setPriceError(messageOf(reason, t.permission)),
  });

  function startCreate() {
    setEditing(null);
    setValues(blankForm);
    setFormError('');
    setOpen(true);
  }

  function startEdit(item: ByProduct) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setOpen(true);
  }

  function startPrices(item: ByProduct) {
    setPriceItem(item);
    setPriceValues({ purchasePrice: '', salesPrice: '' });
    setPriceError('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }

  function submitPrices(event: FormEvent) {
    event.preventDefault();
    setPriceError('');
    priceMutation.mutate();
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
    {activityQuery.error && !(activityQuery.error instanceof ApiError && activityQuery.error.status === 403) && <Alert severity="error">{messageOf(activityQuery.error, t.failed)}</Alert>}
    {activityQuery.error instanceof ApiError && activityQuery.error.status === 403 && <Alert severity="info">{t.inventoryPermission}</Alert>}
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small">
          <TableHead><TableRow>{[t.name, t.code, t.type, t.grade, t.stock, t.production, t.sales, t.prices, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => {
              const activity = activityByItem.get(item.id);
              return <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell><TableCell>{item.code}</TableCell><TableCell>{item.byProductType ?? '—'}</TableCell><TableCell>{item.grade ?? '—'}</TableCell>
                <TableCell>{activity ? Number(activity.stockKg).toLocaleString() : '—'}</TableCell>
                <TableCell>{activity ? Number(activity.productionKg).toLocaleString() : '—'}</TableCell>
                <TableCell>{activity ? Number(activity.salesKg).toLocaleString() : '—'}</TableCell>
                <TableCell><Chip size="small" color={item.hasReferencePrices ? 'success' : 'warning'} label={item.hasReferencePrices ? t.priceSet : t.priceMissing} /></TableCell>
                <TableCell><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
                <TableCell><Stack direction="row" spacing={0.5}>
                  <Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button>
                  <Button size="small" onClick={() => startPrices(item)}>{item.hasReferencePrices ? t.editPrices : t.priceAction}</Button>
                </Stack></TableCell>
              </TableRow>;
            })}
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
          <FormControl fullWidth required><InputLabel>{t.type}</InputLabel><Select label={t.type} value={values.byProductTypeChoice} onChange={event => setValues(current => ({ ...current, byProductTypeChoice: event.target.value }))}>
            <MenuItem value="">{t.choose}</MenuItem>
            {byProductTypes.map(type => <MenuItem key={type.value} value={type.value}>{type[language]}</MenuItem>)}
            <MenuItem value="CUSTOM">{t.custom}</MenuItem>
          </Select></FormControl>
          {values.byProductTypeChoice === 'CUSTOM' && <TextField label={t.custom} required value={values.customType} onChange={event => setValues(current => ({ ...current, customType: event.target.value }))} />}
          <TextField label={t.grade} value={values.grade} onChange={event => setValues(current => ({ ...current, grade: event.target.value }))} />
          <TextField label={t.description} multiline minRows={2} value={values.description} onChange={event => setValues(current => ({ ...current, description: event.target.value }))} />
          {!editing && <>
            <TextField label={t.purchasePrice} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={values.purchasePrice} onChange={event => setValues(current => ({ ...current, purchasePrice: event.target.value }))} />
            <TextField label={t.salesPrice} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={values.salesPrice} onChange={event => setValues(current => ({ ...current, salesPrice: event.target.value }))} />
          </>}
          {editing && <FormControl fullWidth><InputLabel>{t.active}</InputLabel><Select label={t.active} value={values.active ? 'true' : 'false'} onChange={event => setValues(current => ({ ...current, active: event.target.value === 'true' }))}><MenuItem value="true">{t.enabled}</MenuItem><MenuItem value="false">{t.disabled}</MenuItem></Select></FormControl>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <CircularProgress size={18} /> : t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(priceItem)} onClose={() => setPriceItem(null)} fullWidth maxWidth="xs">
      <DialogTitle>{t.prices}: {priceItem?.name}</DialogTitle>
      <Box component="form" onSubmit={submitPrices}>
        <DialogContent><Stack spacing={2}>
          {priceError && <Alert severity="error">{priceError}</Alert>}
          {priceQuery.isError && !(priceQuery.error instanceof ApiError && priceQuery.error.status === 403) && <Alert severity="error">{messageOf(priceQuery.error, t.permission)}</Alert>}
          {priceQuery.error instanceof ApiError && priceQuery.error.status === 403 && <Alert severity="info">{t.permission}</Alert>}
          {priceQuery.isLoading && <CircularProgress size={20} />}
          <TextField label={t.purchasePrice} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={priceValues.purchasePrice} onChange={event => setPriceValues(current => ({ ...current, purchasePrice: event.target.value }))} />
          <TextField label={t.salesPrice} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={priceValues.salesPrice} onChange={event => setPriceValues(current => ({ ...current, salesPrice: event.target.value }))} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setPriceItem(null)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={priceMutation.isPending || priceQuery.isLoading || Boolean(priceQuery.error)}>{priceMutation.isPending ? <CircularProgress size={18} /> : t.savePrices}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
