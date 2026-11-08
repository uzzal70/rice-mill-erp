'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest, queryString } from '@/lib/api';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PackagingItem | null>(null);
  const [values, setValues] = useState<PackagingForm>(blankForm);
  const [formError, setFormError] = useState('');
  const [costItem, setCostItem] = useState<PackagingItem | null>(null);
  const [unitCost, setUnitCost] = useState('');
  const [costError, setCostError] = useState('');

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
    onError: reason => setFormError(messageOf(reason, t.failed)),
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
      onSaved(language === 'bn' ? 'প্যাকেজিং হালনাগাদ হয়েছে।' : 'Packaging updated.');
    },
    onError: reason => setFormError(messageOf(reason, t.failed)),
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
      onSaved(language === 'bn' ? 'একক খরচ সংরক্ষিত হয়েছে।' : 'Unit cost saved.');
    },
    onError: reason => setCostError(messageOf(reason, t.financialPermission)),
  });

  function startCreate() {
    setEditing(null);
    setValues(blankForm);
    setFormError('');
    setOpen(true);
  }

  function startEdit(item: PackagingItem) {
    setEditing(item);
    setValues(toForm(item));
    setFormError('');
    setOpen(true);
  }

  function startCostEdit(item: PackagingItem) {
    setCostItem(item);
    setUnitCost('');
    setCostError('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }

  function submitCost(event: FormEvent) {
    event.preventDefault();
    setCostError('');
    costMutation.mutate();
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
    {stockQuery.error && !(stockQuery.error instanceof ApiError && stockQuery.error.status === 403) && <Alert severity="error">{messageOf(stockQuery.error, t.failed)}</Alert>}
    {stockQuery.error instanceof ApiError && stockQuery.error.status === 403 && <Alert severity="info">{t.inventoryPermission}</Alert>}
    {suppliersQuery.error && !suppliersForbidden && <Alert severity="error">{messageOf(suppliersQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {itemsQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small">
          <TableHead><TableRow>{[t.name, t.code, t.bagType, t.size, t.material, t.supplier, t.stock, t.cost, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {items.map(item => {
              const stock = stockById.get(item.id);
              const supplier = item.packagingSpec.supplierPartnerId ? supplierById.get(item.packagingSpec.supplierPartnerId) : null;
              return <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell><TableCell>{item.code}</TableCell><TableCell>{item.packagingSpec.bagType ?? '—'}</TableCell>
                <TableCell>{Number(item.packagingSpec.sizeKg).toLocaleString()} KG</TableCell><TableCell>{item.packagingSpec.material}</TableCell>
                <TableCell>{supplier?.name ?? item.packagingSpec.supplierPartnerId ?? t.noSupplier}</TableCell>
                <TableCell>{stock ? `${Number(stock.stock).toLocaleString()} ${stock.baseUnit}` : '—'}</TableCell>
                <TableCell><Button size="small" onClick={() => startCostEdit(item)}>{t.cost}</Button></TableCell>
                <TableCell><Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? t.enabled : t.disabled} /></TableCell>
                <TableCell><Button size="small" onClick={() => startEdit(item)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
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

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? t.edit : t.add}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent><Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label={t.name} required value={values.name} onChange={event => setValues(current => ({ ...current, name: event.target.value }))} />
          <TextField label={t.code} required value={values.code} onChange={event => setValues(current => ({ ...current, code: event.target.value }))} />
          <TextField label={t.bagType} value={values.bagType} onChange={event => setValues(current => ({ ...current, bagType: event.target.value }))} />
          <TextField label={t.size} required type="number" inputProps={{ min: 0.001, step: 0.001 }} value={values.sizeKg} onChange={event => setValues(current => ({ ...current, sizeKg: event.target.value }))} />
          <TextField label={t.material} required value={values.material} onChange={event => setValues(current => ({ ...current, material: event.target.value }))} />
          {!editing && <TextField label={t.unitCost} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={values.unitCost} onChange={event => setValues(current => ({ ...current, unitCost: event.target.value }))} />}
          <FormControl fullWidth><InputLabel>{t.supplier}</InputLabel><Select label={t.supplier} value={values.supplierPartnerId} onChange={event => setValues(current => ({ ...current, supplierPartnerId: event.target.value }))}><MenuItem value="">{t.noSupplier}</MenuItem>{suppliers.map(supplier => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}</Select></FormControl>
          {suppliersForbidden && <Typography variant="caption" color="text.secondary">{t.noSupplier}</Typography>}
          {editing && <FormControl fullWidth><InputLabel>{t.status}</InputLabel><Select label={t.status} value={values.active ? 'true' : 'false'} onChange={event => setValues(current => ({ ...current, active: event.target.value === 'true' }))}><MenuItem value="true">{t.enabled}</MenuItem><MenuItem value="false">{t.disabled}</MenuItem></Select></FormControl>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? <CircularProgress size={18} /> : t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(costItem)} onClose={() => setCostItem(null)} fullWidth maxWidth="xs">
      <DialogTitle>{t.cost}: {costItem?.name}</DialogTitle>
      <Box component="form" onSubmit={submitCost}>
        <DialogContent><Stack spacing={2}>
          {costError && <Alert severity="error">{costError}</Alert>}
          {costQuery.isError && !(costQuery.error instanceof ApiError && costQuery.error.status === 403) && <Alert severity="error">{messageOf(costQuery.error, t.financialPermission)}</Alert>}
          {costQuery.error instanceof ApiError && costQuery.error.status === 403 && <Alert severity="info">{t.financialPermission}</Alert>}
          {costQuery.isLoading && <CircularProgress size={20} />}
          <TextField label={t.unitCost} required type="number" inputProps={{ min: 0, step: 0.0001 }} value={unitCost} onChange={event => setUnitCost(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setCostItem(null)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={costMutation.isPending || costQuery.isLoading || Boolean(costQuery.error)}>{costMutation.isPending ? <CircularProgress size={18} /> : t.saveCost}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
