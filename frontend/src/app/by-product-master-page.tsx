'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

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
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ByProduct | null>(null);
  const [values, setValues] = useState<ByProductForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [priceItem, setPriceItem] = useState<ByProduct | null>(null);
  const [priceValues, setPriceValues] = useState<ReferencePrices>({ purchasePrice: '', salesPrice: '' });
  const [priceError, setPriceError] = useState('');
  const [priceFieldErrors, setPriceFieldErrors] = useState<Record<string, string>>({});

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
    onError: reason => {
      const msg = extractApiError(reason, t.failed);
      setFormError(msg);
      toast.error(msg);
    },
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
      setFieldErrors({});
      onSaved(language === 'bn' ? 'উপজাত পণ্য হালনাগাদ হয়েছে।' : 'By-product updated.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.failed);
      setFormError(msg);
      toast.error(msg);
    },
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
      setPriceFieldErrors({});
      setPriceItem(null);
      onSaved(language === 'bn' ? 'রেফারেন্স মূল্য সংরক্ষিত হয়েছে।' : 'Reference prices saved.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.permission);
      setPriceError(msg);
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

  function startEdit(item: ByProduct) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setFieldErrors({});
    setOpen(true);
  }

  function startPrices(item: ByProduct) {
    setPriceItem(item);
    setPriceValues({ purchasePrice: '', salesPrice: '' });
    setPriceError('');
    setPriceFieldErrors({});
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'name', label: t.name, value: values.name, required: true },
        { name: 'code', label: t.code, value: values.code, required: true },
        { name: 'byProductTypeChoice', label: t.type, value: values.byProductTypeChoice, required: true, isSelect: true },
        ...(values.byProductTypeChoice === 'CUSTOM'
          ? [{ name: 'customType', label: t.custom, value: values.customType, required: true }]
          : []),
        ...(!editing
          ? [
              { name: 'purchasePrice', label: t.purchasePrice, value: values.purchasePrice, required: true, type: 'nonNegativeNumber' as const, min: 0 },
              { name: 'salesPrice', label: t.salesPrice, value: values.salesPrice, required: true, type: 'nonNegativeNumber' as const, min: 0 },
            ]
          : []),
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
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }

  function submitPrices(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'pricePurchase', label: t.purchasePrice, value: priceValues.purchasePrice ?? '', required: true, type: 'nonNegativeNumber', min: 0 },
        { name: 'priceSales', label: t.salesPrice, value: priceValues.salesPrice ?? '', required: true, type: 'nonNegativeNumber', min: 0 },
      ],
      language,
    );
    if (!validation.valid) {
      setPriceFieldErrors(validation.errors);
      setPriceError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setPriceError('');
    setPriceFieldErrors({});
    priceMutation.mutate();
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
    {activityQuery.error && !(activityQuery.error instanceof ApiError && activityQuery.error.status === 403) && <Alert severity="error">{extractApiError(activityQuery.error, t.failed)}</Alert>}
    {activityQuery.error instanceof ApiError && activityQuery.error.status === 403 && <Alert severity="info">{t.inventoryPermission}</Alert>}
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.type, align: 'left' },
            { label: t.grade, align: 'left' },
            { label: t.stock, align: 'right' },
            { label: t.production, align: 'right' },
            { label: t.sales, align: 'right' },
            { label: t.prices, align: 'center' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {rows.map(item => {
              const activity = activityByItem.get(item.id);
              return <TableRow key={item.id} hover>
                <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" fontWeight={600} noWrap title={item.name}>{item.name}</Typography></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.code}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.byProductType ?? '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.grade ?? '—'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{activity ? `${Number(activity.stockKg).toLocaleString()} KG` : '—'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{activity ? `${Number(activity.productionKg).toLocaleString()} KG` : '—'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{activity ? `${Number(activity.salesKg).toLocaleString()} KG` : '—'}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={item.hasReferencePrices ? 'success' : 'warning'} label={item.hasReferencePrices ? t.priceSet : t.priceMissing} /></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.5} justifyContent="flex-end">
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

    <FormDialog
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={submit}
      title={editing ? t.edit : t.add}
      error={formError}
      onClearError={() => setFormError('')}
      loading={createMutation.isPending || updateMutation.isPending}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={2}>
        <AppTextField fieldName="name" label={t.name} required value={values.name} errorText={fieldErrors.name} onValueChange={v => { setValues(c => ({ ...c, name: v })); setFieldErrors(p => ({ ...p, name: '' })); }} />
        <AppTextField fieldName="code" label={t.code} required value={values.code} errorText={fieldErrors.code} onValueChange={v => { setValues(c => ({ ...c, code: v })); setFieldErrors(p => ({ ...p, code: '' })); }} />
        <AppSelect
          fieldName="byProductTypeChoice"
          label={t.type}
          required
          value={values.byProductTypeChoice}
          emptyOptionLabel={t.choose}
          errorText={fieldErrors.byProductTypeChoice}
          onChange={v => { setValues(c => ({ ...c, byProductTypeChoice: v })); setFieldErrors(p => ({ ...p, byProductTypeChoice: '' })); }}
          options={[
            ...byProductTypes.map(type => ({ value: type.value, label: type[language] })),
            { value: 'CUSTOM', label: t.custom },
          ]}
        />
        {values.byProductTypeChoice === 'CUSTOM' && (
          <AppTextField fieldName="customType" label={t.custom} required value={values.customType} errorText={fieldErrors.customType} onValueChange={v => { setValues(c => ({ ...c, customType: v })); setFieldErrors(p => ({ ...p, customType: '' })); }} />
        )}
        <AppTextField fieldName="grade" label={t.grade} value={values.grade} onValueChange={v => setValues(c => ({ ...c, grade: v }))} />
        {!editing && <>
          <AppTextField fieldName="purchasePrice" label={t.purchasePrice} prefixText="৳" type="number" inputProps={{ min: 0, step: 0.0001 }} required value={values.purchasePrice} errorText={fieldErrors.purchasePrice} onValueChange={v => { setValues(c => ({ ...c, purchasePrice: v })); setFieldErrors(p => ({ ...p, purchasePrice: '' })); }} />
          <AppTextField fieldName="salesPrice" label={t.salesPrice} prefixText="৳" type="number" inputProps={{ min: 0, step: 0.0001 }} required value={values.salesPrice} errorText={fieldErrors.salesPrice} onValueChange={v => { setValues(c => ({ ...c, salesPrice: v })); setFieldErrors(p => ({ ...p, salesPrice: '' })); }} />
        </>}
        {editing && (
          <AppSelect
            fieldName="active"
            label={t.active}
            value={values.active ? 'true' : 'false'}
            onChange={v => setValues(c => ({ ...c, active: v === 'true' }))}
            options={[{ value: 'true', label: t.enabled }, { value: 'false', label: t.disabled }]}
          />
        )}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          <AppTextField fieldName="description" label={t.description} multiline minRows={2} value={values.description} onValueChange={v => setValues(c => ({ ...c, description: v }))} />
        </Box>
      </FormGrid>
    </FormDialog>

    <FormDialog
      open={Boolean(priceItem)}
      onClose={() => setPriceItem(null)}
      onSubmit={submitPrices}
      title={`${t.prices}: ${priceItem?.name ?? ''}`}
      error={priceError || (priceQuery.isError && !(priceQuery.error instanceof ApiError && priceQuery.error.status === 403) ? extractApiError(priceQuery.error, t.permission) : '')}
      onClearError={() => setPriceError('')}
      loading={priceMutation.isPending}
      submitDisabled={priceQuery.isLoading || Boolean(priceQuery.error)}
      submitLabel={t.savePrices}
      cancelLabel={t.cancel}
      maxWidth="xs"
    >
      {priceQuery.error instanceof ApiError && priceQuery.error.status === 403 && <Alert severity="info">{t.permission}</Alert>}
      {priceQuery.isLoading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="caption">Loading current prices...</Typography></Stack>}
      <FormGrid columns={1}>
        <AppTextField fieldName="pricePurchase" label={t.purchasePrice} prefixText="৳" type="number" inputProps={{ min: 0, step: 0.0001 }} required value={priceValues.purchasePrice ?? ''} errorText={priceFieldErrors.pricePurchase} onValueChange={v => { setPriceValues(c => ({ ...c, purchasePrice: v })); setPriceFieldErrors(p => ({ ...p, pricePurchase: '' })); }} />
        <AppTextField fieldName="priceSales" label={t.salesPrice} prefixText="৳" type="number" inputProps={{ min: 0, step: 0.0001 }} required value={priceValues.salesPrice ?? ''} errorText={priceFieldErrors.priceSales} onValueChange={v => { setPriceValues(c => ({ ...c, salesPrice: v })); setFieldErrors(p => ({ ...p, priceSales: '' })); }} />
      </FormGrid>
    </FormDialog>
  </Stack>;
}
