'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

type PackagingSpec = {
  bagType: string | null;
  sizeKg: string;
  material: string;
  supplierPartnerId: string | null;
};
type PackagingItem = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  packagingSpec: PackagingSpec;
};
type PackagingStock = { id: string; stock: string; baseUnit: string };
type Supplier = { id: string; name: string; code: string };
type PackagingForm = {
  name: string;
  code: string;
  bagType: string;
  sizeKg: string;
  material: string;
  supplierPartnerId: string;
  unitCost: string;
  active: boolean;
};
type UnitCost = { packagingSpec: { unitCost: string } | null };

const blankForm: PackagingForm = {
  name: '', code: '', bagType: '', sizeKg: '', material: '', supplierPartnerId: '',
  unitCost: '', active: true,
};

const labels = {
  en: {
    title: 'Packaging master',
    subtitle: 'Configure custom bag sizes, type, material, supplier, unit cost, and factory stock.',
    add: 'Add packaging',
    edit: 'Edit packaging',
    name: 'Packaging name',
    code: 'Item code',
    bagType: 'Bag type',
    size: 'Bag size (KG)',
    material: 'Material',
    supplier: 'Supplier',
    noSupplier: 'No supplier',
    unitCost: 'Unit cost / bag (BDT)',
    stock: 'Stock (bags)',
    status: 'Status',
    actions: 'Actions',
    save: 'Save packaging',
    saveCost: 'Save unit cost',
    cost: 'Unit cost',
    costConfigured: 'Cost set',
    costMissing: 'Set cost',
    cancel: 'Cancel',
    search: 'Search name, code, material...',
    filter: 'Status filter',
    all: 'All',
    activeOnly: 'Active',
    inactiveOnly: 'Inactive',
    noRows: 'No packaging items found.',
    loading: 'Loading packaging catalog...',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    failed: 'Could not load packaging items.',
    noCompany: 'Select a company to manage packaging.',
    noFactory: 'Select a factory to inspect packaging stock.',
    inventoryPermission: 'Inventory permission is required to view packaging stock.',
    financialPermission: 'Financial permission is required to view or change unit cost.',
    enabled: 'Active',
    disabled: 'Inactive',
  },
  bn: {
    title: 'প্যাকেজিং মাস্টার',
    subtitle: 'নিজস্ব ব্যাগের মাপ, ধরন, উপাদান, সরবরাহকারী, একক খরচ ও কারখানার মজুদ নির্ধারণ করুন।',
    add: 'প্যাকেজিং যোগ',
    edit: 'প্যাকেজিং সম্পাদনা',
    name: 'প্যাকেজিং নাম',
    code: 'আইটেম কোড',
    bagType: 'ব্যাগের ধরন',
    size: 'ব্যাগের মাপ (কেজি)',
    material: 'উপাদান',
    supplier: 'সরবরাহকারী',
    noSupplier: 'সরবরাহকারী নেই',
    unitCost: 'প্রতি ব্যাগ খরচ (টাকা)',
    stock: 'মজুদ (ব্যাগ)',
    status: 'অবস্থা',
    actions: 'কার্যক্রম',
    save: 'প্যাকেজিং সংরক্ষণ',
    saveCost: 'একক খরচ সংরক্ষণ',
    cost: 'একক খরচ',
    costConfigured: 'খরচ নির্ধারিত',
    costMissing: 'খরচ দিন',
    cancel: 'বাতিল',
    search: 'নাম, কোড বা উপাদান খুঁজুন...',
    filter: 'অবস্থা',
    all: 'সব',
    activeOnly: 'সক্রিয়',
    inactiveOnly: 'নিষ্ক্রিয়',
    noRows: 'কোনো প্যাকেজিং আইটেম পাওয়া যায়নি।',
    loading: 'প্যাকেজিং তালিকা লোড হচ্ছে...',
    previous: 'আগের',
    next: 'পরের',
    page: 'পৃষ্ঠা',
    failed: 'প্যাকেজিং তালিকা লোড করা যায়নি।',
    noCompany: 'প্যাকেজিং পরিচালনার জন্য কোম্পানি নির্বাচন করুন।',
    noFactory: 'প্যাকেজিং মজুদ দেখতে কারখানা নির্বাচন করুন।',
    inventoryPermission: 'প্যাকেজিং মজুদ দেখতে ইনভেন্টরি অনুমতি প্রয়োজন।',
    financialPermission: 'একক খরচ দেখতে বা পরিবর্তন করতে আর্থিক অনুমতি প্রয়োজন।',
    enabled: 'সক্রিয়',
    disabled: 'নিষ্ক্রিয়',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toForm(item: PackagingItem): PackagingForm {
  return {
    name: item.name,
    code: item.code,
    bagType: item.packagingSpec.bagType ?? '',
    sizeKg: item.packagingSpec.sizeKg,
    material: item.packagingSpec.material,
    supplierPartnerId: item.packagingSpec.supplierPartnerId ?? '',
    unitCost: '',
    active: item.active,
  };
}

export function PackagingMasterPage({
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
  const [editing, setEditing] = useState<PackagingItem | null>(null);
  const [values, setValues] = useState<PackagingForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [costItem, setCostItem] = useState<PackagingItem | null>(null);
  const [unitCost, setUnitCost] = useState('');
  const [costError, setCostError] = useState('');
  const [costFieldError, setCostFieldError] = useState('');

  const itemsQuery = useQuery({
    queryKey: ['packaging-master', companyId, search, activeFilter, page],
    queryFn: () => apiRequest<PackagingItem[]>(`/items?${queryString({
      companyId,
      kind: 'PACKAGING',
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 100,
    })}`),
    enabled: Boolean(companyId),
  });
  const stockQuery = useQuery({
    queryKey: ['packaging-stock', companyId, factoryId, search, activeFilter, page],
    queryFn: () => apiRequest<PackagingStock[]>(`/inventory/packaging-stock?${queryString({
      companyId,
      factoryId,
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 100,
    })}`),
    enabled: Boolean(companyId && factoryId),
  });
  const suppliersQuery = useQuery({
    queryKey: ['packaging-suppliers', companyId],
    queryFn: () => apiRequest<Supplier[]>(`/partners?${queryString({ companyId, type: 'SUPPLIER', active: true, page: 1, pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });
  const costQuery = useQuery({
    queryKey: ['packaging-cost', companyId, costItem?.id],
    queryFn: () => apiRequest<UnitCost>(`/items/${encodeURIComponent(costItem!.id)}/reference-prices?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId && costItem),
  });
  useEffect(() => {
    if (costQuery.data?.packagingSpec) setUnitCost(costQuery.data.packagingSpec.unitCost);
  }, [costQuery.data]);

  const items = itemsQuery.data ?? [];
  const stockById = new Map((stockQuery.data ?? []).map(row => [row.id, row]));
  const suppliers = suppliersQuery.data ?? [];
  const supplierById = new Map(suppliers.map(row => [row.id, row]));
  const suppliersForbidden = suppliersQuery.error instanceof ApiError && suppliersQuery.error.status === 403;

  const createMutation = useMutation({
    mutationFn: () => apiRequest<PackagingItem>('/items/packaging', {
      method: 'POST',
      body: JSON.stringify({
        companyId,
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        bagType: values.bagType.trim() || null,
        sizeKg: values.sizeKg,
        material: values.material.trim(),
        unitCost: values.unitCost,
        supplierPartnerId: values.supplierPartnerId || null,
      }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['packaging-master', companyId] });
      setOpen(false);
      setValues(blankForm);
      setFormError('');
      onSaved(language === 'bn' ? 'প্যাকেজিং সংরক্ষিত হয়েছে।' : 'Packaging saved.');
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
      return apiRequest(`/items/${encodeURIComponent(editing.id)}/packaging`, {
        method: 'PUT',
        body: JSON.stringify({
          companyId,
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          active: values.active,
          bagType: values.bagType.trim() || null,
          sizeKg: values.sizeKg,
          material: values.material.trim(),
          supplierPartnerId: values.supplierPartnerId || null,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['packaging-master', companyId] });
      setOpen(false);
      setEditing(null);
      setFieldErrors({});
      onSaved(language === 'bn' ? 'প্যাকেজিং হালনাগাদ হয়েছে।' : 'Packaging updated.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.failed);
      setFormError(msg);
      toast.error(msg);
    },
  });

  const costMutation = useMutation({
    mutationFn: () => {
      if (!costItem) throw new Error(t.failed);
      return apiRequest(`/items/${encodeURIComponent(costItem.id)}/reference-prices`, {
        method: 'PUT',
        body: JSON.stringify({ companyId, packagingUnitCost: unitCost }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['packaging-cost', companyId, costItem?.id] });
      setCostItem(null);
      setCostError('');
      setCostFieldError('');
      onSaved(language === 'bn' ? 'একক খরচ সংরক্ষিত হয়েছে।' : 'Unit cost saved.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.financialPermission);
      setCostError(msg);
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

  function startEdit(item: PackagingItem) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setFieldErrors({});
    setOpen(true);
  }

  function startCostEdit(item: PackagingItem) {
    setCostItem(item);
    setUnitCost('');
    setCostError('');
    setCostFieldError('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'name', label: t.name, value: values.name, required: true },
        { name: 'code', label: t.code, value: values.code, required: true },
        { name: 'sizeKg', label: t.size, value: values.sizeKg, required: true, type: 'positiveNumber' },
        { name: 'material', label: t.material, value: values.material, required: true },
        ...(!editing ? [{ name: 'unitCost', label: t.unitCost, value: values.unitCost, required: true, type: 'nonNegativeNumber' as const, min: 0 }] : []),
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

  function submitCost(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [{ name: 'costUnitCost', label: t.unitCost, value: unitCost, required: true, type: 'nonNegativeNumber', min: 0 }],
      language,
    );
    if (!validation.valid) {
      setCostFieldError(validation.errors.costUnitCost ?? '');
      setCostError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName('costUnitCost');
      return;
    }
    setCostError('');
    setCostFieldError('');
    costMutation.mutate();
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
    {stockQuery.error && !(stockQuery.error instanceof ApiError && stockQuery.error.status === 403) && <Alert severity="error">{extractApiError(stockQuery.error, t.failed)}</Alert>}
    {stockQuery.error instanceof ApiError && stockQuery.error.status === 403 && <Alert severity="info">{t.inventoryPermission}</Alert>}
    {suppliersQuery.error && !suppliersForbidden && <Alert severity="error">{extractApiError(suppliersQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.bagType, align: 'left' },
            { label: t.size, align: 'right' },
            { label: t.material, align: 'left' },
            { label: t.supplier, align: 'left' },
            { label: t.stock, align: 'right' },
            { label: t.cost, align: 'center' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {items.map(item => {
              const stock = stockById.get(item.id);
              const supplier = item.packagingSpec.supplierPartnerId ? supplierById.get(item.packagingSpec.supplierPartnerId) : null;
              return <TableRow key={item.id} hover>
                <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" fontWeight={600} noWrap title={item.name}>{item.name}</Typography></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.code}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.packagingSpec.bagType ?? '—'}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(item.packagingSpec.sizeKg).toLocaleString()} KG</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.packagingSpec.material}</TableCell>
                <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={supplier?.name ?? item.packagingSpec.supplierPartnerId ?? t.noSupplier}>{supplier?.name ?? item.packagingSpec.supplierPartnerId ?? t.noSupplier}</Typography></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{stock ? `${Number(stock.stock).toLocaleString()} ${stock.baseUnit}` : '—'}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Button size="small" variant="outlined" onClick={() => startCostEdit(item)}>{t.cost}</Button></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
              </TableRow>;
            })}
            {!items.length && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>}
    </Paper>
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
      <Typography variant="caption">{t.page} {page}</Typography>
      <Button size="small" disabled={page === 1 || itemsQuery.isFetching} onClick={() => setPage(current => current - 1)}>{t.previous}</Button>
      <Button size="small" disabled={items.length < 100 || itemsQuery.isFetching} onClick={() => setPage(current => current + 1)}>{t.next}</Button>
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
        <AppTextField fieldName="bagType" label={t.bagType} value={values.bagType} onValueChange={v => setValues(c => ({ ...c, bagType: v }))} />
        <AppTextField fieldName="sizeKg" label={t.size} unit="KG" required type="number" inputProps={{ min: 0.001, step: 0.001 }} value={values.sizeKg} errorText={fieldErrors.sizeKg} onValueChange={v => { setValues(c => ({ ...c, sizeKg: v })); setFieldErrors(p => ({ ...p, sizeKg: '' })); }} />
        <AppTextField fieldName="material" label={t.material} required value={values.material} errorText={fieldErrors.material} onValueChange={v => { setValues(c => ({ ...c, material: v })); setFieldErrors(p => ({ ...p, material: '' })); }} />
        {!editing && (
          <AppTextField fieldName="unitCost" label={t.unitCost} prefixText="৳" required type="number" inputProps={{ min: 0, step: 0.0001 }} value={values.unitCost} errorText={fieldErrors.unitCost} onValueChange={v => { setValues(c => ({ ...c, unitCost: v })); setFieldErrors(p => ({ ...p, unitCost: '' })); }} />
        )}
        <AppAutocomplete
          fieldName="supplierPartnerId"
          label={t.supplier}
          value={values.supplierPartnerId}
          loading={suppliersQuery.isLoading}
          disabled={suppliersForbidden}
          disabledReason={suppliersForbidden ? (language === 'bn' ? 'সরবরাহকারী তালিকা দেখার অনুমতি নেই' : 'Supplier directory access is restricted') : undefined}
          onChange={v => setValues(c => ({ ...c, supplierPartnerId: v }))}
          options={suppliers.map(s => ({ value: s.id, label: s.name }))}
          placeholder={t.noSupplier}
          emptyMessage={t.noSupplier}
        />
        {editing && (
          <AppSelect
            fieldName="active"
            label={t.status}
            value={values.active ? 'true' : 'false'}
            onChange={v => setValues(c => ({ ...c, active: v === 'true' }))}
            options={[{ value: 'true', label: t.enabled }, { value: 'false', label: t.disabled }]}
          />
        )}
      </FormGrid>
    </FormDialog>

    <FormDialog
      open={Boolean(costItem)}
      onClose={() => setCostItem(null)}
      onSubmit={submitCost}
      title={`${t.cost}: ${costItem?.name ?? ''}`}
      error={costError || (costQuery.isError && !(costQuery.error instanceof ApiError && costQuery.error.status === 403) ? extractApiError(costQuery.error, t.financialPermission) : '')}
      onClearError={() => setCostError('')}
      loading={costMutation.isPending}
      submitDisabled={costQuery.isLoading || Boolean(costQuery.error)}
      submitLabel={t.saveCost}
      cancelLabel={t.cancel}
      maxWidth="xs"
    >
      {costQuery.error instanceof ApiError && costQuery.error.status === 403 && <Alert severity="info">{t.financialPermission}</Alert>}
      {costQuery.isLoading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="caption">Loading unit cost...</Typography></Stack>}
      <AppTextField fieldName="costUnitCost" label={t.unitCost} prefixText="৳" required type="number" inputProps={{ min: 0, step: 0.0001 }} value={unitCost} errorText={costFieldError} onValueChange={v => { setUnitCost(v); setCostFieldError(''); }} />
    </FormDialog>
  </Stack>;
}
