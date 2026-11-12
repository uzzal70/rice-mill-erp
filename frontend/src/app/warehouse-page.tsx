'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  LinearProgress, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

type Material = { id: string; name: string; kind: string; variety: string | null; cropYear: number | null };
type StackRow = {
  id: string;
  code: string;
  capacityKg: string;
  materialItemId: string | null;
  materialItem: Material | null;
  varietyName: string | null;
  cropYear: number | null;
  batchNumber: string | null;
  lotNumber: string | null;
  receivedAt: string | null;
  onHand: string;
  availableCapacityKg: string;
  occupancyPercent: number;
  ageDays: number | null;
  agingBand: '0_30' | '31_60' | '61_90' | '90_PLUS' | null;
};
type Godown = { id: string; name: string; code: string; active: boolean; stacks: StackRow[] };
type StackForm = {
  godownId: string;
  code: string;
  capacityKg: string;
  materialItemId: string;
  varietyName: string;
  cropYear: string;
  batchNumber: string;
  lotNumber: string;
  receivedAt: string;
};

const blankStack: StackForm = {
  godownId: '', code: '', capacityKg: '', materialItemId: '', varietyName: '',
  cropYear: '', batchNumber: '', lotNumber: '', receivedAt: '',
};

const labels = {
  en: {
    title: 'Godown & stack management',
    subtitle: 'Manage warehouse locations, storage metadata, capacity and stock aging for this factory.',
    addGodown: 'Add godown',
    addStack: 'Add stack',
    editStack: 'Edit stack',
    godown: 'Godown',
    code: 'Code',
    name: 'Name',
    capacity: 'Capacity (KG)',
    material: 'Material',
    noMaterial: 'Not specified',
    variety: 'Variety',
    cropYear: 'Crop year',
    batch: 'Batch',
    lot: 'Lot',
    receivedAt: 'Received date',
    occupancy: 'Occupancy',
    occupied: 'Occupied',
    available: 'Available',
    age: 'Age',
    noAge: 'Date not recorded',
    days: 'days',
    empty: 'No godowns configured for this factory.',
    loading: 'Loading warehouse...',
    save: 'Save',
    cancel: 'Cancel',
    stockAging: 'Stock aging by stack received date',
    stacks: 'stacks',
    failed: 'Could not load warehouse data.',
    noFactory: 'Select a company and factory to manage warehouse locations.',
  },
  bn: {
    title: 'গুদাম ও স্ট্যাক ব্যবস্থাপনা',
    subtitle: 'এই কারখানার গুদাম, সংরক্ষণ তথ্য, ধারণক্ষমতা ও মজুদের বয়স পরিচালনা করুন।',
    addGodown: 'গুদাম যোগ',
    addStack: 'স্ট্যাক যোগ',
    editStack: 'স্ট্যাক সম্পাদনা',
    godown: 'গুদাম',
    code: 'কোড',
    name: 'নাম',
    capacity: 'ধারণক্ষমতা (কেজি)',
    material: 'পণ্য',
    noMaterial: 'উল্লেখ নেই',
    variety: 'জাত',
    cropYear: 'ফসলের বছর',
    batch: 'ব্যাচ',
    lot: 'লট',
    receivedAt: 'গ্রহণের তারিখ',
    occupancy: 'দখল',
    occupied: 'ব্যবহৃত',
    available: 'খালি',
    age: 'বয়স',
    noAge: 'তারিখ নেই',
    days: 'দিন',
    empty: 'এই কারখানায় কোনো গুদাম নেই।',
    loading: 'গুদাম লোড হচ্ছে...',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    stockAging: 'স্ট্যাক গ্রহণের তারিখ অনুযায়ী মজুদের বয়স',
    stacks: 'স্ট্যাক',
    failed: 'গুদামের তথ্য লোড করা যায়নি।',
    noFactory: 'গুদাম পরিচালনার জন্য কোম্পানি ও কারখানা নির্বাচন করুন।',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function dateInput(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function WarehousePage({
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
  const bn = language === 'bn';
  const toast = useToast();
  const queryClient = useQueryClient();
  const [godownOpen, setGodownOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState(false);
  const [editingStack, setEditingStack] = useState<StackRow | null>(null);
  const [godownName, setGodownName] = useState('');
  const [godownCode, setGodownCode] = useState('');
  const [stackValues, setStackValues] = useState<StackForm>(blankStack);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const warehouseQuery = useQuery({
    queryKey: ['warehouse', companyId, factoryId],
    queryFn: () => apiRequest<Godown[]>(`/godowns?${queryString({ companyId, factoryId })}`),
    enabled: Boolean(companyId && factoryId),
  });
  const materialsQuery = useQuery({
    queryKey: ['warehouse-materials', companyId],
    queryFn: () => apiRequest<Material[]>(`/items?${queryString({ companyId, page: 1, pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });

  const godowns = warehouseQuery.data ?? [];
  const materials = materialsQuery.data ?? [];
  const allStacks = useMemo(() => godowns.flatMap(godown => godown.stacks), [godowns]);
  const agingCounts = useMemo(() => allStacks.reduce((result, stack) => {
    if (Number(stack.onHand) > 0 && stack.agingBand) result[stack.agingBand] += 1;
    return result;
  }, { '0_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0 }), [allStacks]);

  useEffect(() => {
    if (!stackValues.godownId && godowns.length) {
      setStackValues(current => ({ ...current, godownId: godowns[0].id }));
    }
  }, [godowns, stackValues.godownId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (godownOpen) {
        return apiRequest('/godowns', {
          method: 'POST',
          body: JSON.stringify({ companyId, factoryId, name: godownName.trim(), code: godownCode.trim().toUpperCase() }),
        });
      }
      const payload = {
        companyId,
        factoryId,
        godownId: stackValues.godownId,
        code: stackValues.code.trim().toUpperCase(),
        capacityKg: stackValues.capacityKg,
        materialItemId: stackValues.materialItemId || null,
        varietyName: stackValues.varietyName.trim() || null,
        cropYear: stackValues.cropYear ? Number(stackValues.cropYear) : null,
        batchNumber: stackValues.batchNumber.trim() || null,
        lotNumber: stackValues.lotNumber.trim() || null,
        receivedAt: stackValues.receivedAt ? new Date(stackValues.receivedAt).toISOString() : null,
      };
      return editingStack
        ? apiRequest(`/stacks/${encodeURIComponent(editingStack.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiRequest('/stacks', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['warehouse', companyId, factoryId] });
      setGodownOpen(false);
      setStackOpen(false);
      setEditingStack(null);
      setGodownName('');
      setGodownCode('');
      setStackValues(blankStack);
      setError('');
      setDialogError('');
      setFieldErrors({});
      onSaved(bn ? 'গুদামের তথ্য সংরক্ষিত হয়েছে।' : 'Warehouse details saved.');
    },
    onError: reason => {
      const msg = extractApiError(reason, t.failed);
      setDialogError(msg);
      toast.error(msg);
    },
  });

  function openNewStack(godownId: string) {
    setEditingStack(null);
    setStackValues({ ...blankStack, godownId });
    setDialogError('');
    setFieldErrors({});
    setStackOpen(true);
  }

  function openEditStack(stack: StackRow, godownId: string) {
    setEditingStack(stack);
    setStackValues({
      godownId,
      code: stack.code,
      capacityKg: stack.capacityKg,
      materialItemId: stack.materialItemId ?? '',
      varietyName: stack.varietyName ?? '',
      cropYear: stack.cropYear?.toString() ?? '',
      batchNumber: stack.batchNumber ?? '',
      lotNumber: stack.lotNumber ?? '',
      receivedAt: dateInput(stack.receivedAt),
    });
    setDialogError('');
    setFieldErrors({});
    setStackOpen(true);
  }

  function submitGodown(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'godownName', label: t.name, value: godownName, required: true },
        { name: 'godownCode', label: t.code, value: godownCode, required: true },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setDialogError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setDialogError('');
    setFieldErrors({});
    mutation.mutate();
  }

  function submitStack(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'godownId', label: t.godown, value: stackValues.godownId, required: true, isSelect: true },
        { name: 'code', label: t.code, value: stackValues.code, required: true },
        { name: 'capacityKg', label: t.capacity, value: stackValues.capacityKg, required: true, type: 'positiveNumber' },
        { name: 'cropYear', label: t.cropYear, value: stackValues.cropYear, type: 'integer', min: 1900, max: 2200 },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setDialogError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setDialogError('');
    setFieldErrors({});
    mutation.mutate();
  }

  if (!companyId || !factoryId) return <Alert severity="info">{t.noFactory}</Alert>;
  if (warehouseQuery.isLoading) return <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t.loading}</Typography></Stack>;

  const activeGodown = godowns.find(row => row.active);

  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={() => { setGodownOpen(true); setDialogError(''); setFieldErrors({}); }}>{t.addGodown}</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (!activeGodown) {
              toast.warning(bn ? 'স্ট্যাক যোগ করার আগে প্রথমে অন্তত একটি সক্রিয় গুদাম তৈরি করুন।' : 'Please create an active Godown first before adding a stack.');
              setGodownOpen(true);
              setDialogError('');
              setFieldErrors({});
              return;
            }
            openNewStack(activeGodown.id);
          }}
        >
          {t.addStack}
        </Button>
      </Stack>
    </Box>
    {(warehouseQuery.error || materialsQuery.error || error) && <Alert severity="error">{error || extractApiError(warehouseQuery.error ?? materialsQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={750} mb={1}>{t.stockAging}</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {(['0_30', '31_60', '61_90', '90_PLUS'] as const).map(band => <Chip key={band} variant="outlined" label={`${band.replace('_', '–').replace('90_PLUS', '90+')} ${t.days}: ${agingCounts[band]} ${t.stacks}`} />)}
      </Stack>
    </Paper>
    {!godowns.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">{t.empty}</Typography></Paper>}
    {godowns.map(godown => <Paper key={godown.id} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="action.hover">
        <Box><Typography fontWeight={800}>{godown.name}</Typography><Typography variant="caption" color="text.secondary">{godown.code}</Typography></Box>
        {godown.active && <Button size="small" variant="contained" onClick={() => openNewStack(godown.id)}>{t.addStack}</Button>}
      </Box>
      <Table size="small" sx={{ minWidth: 1250 }}>
        <TableHead><TableRow>{[
          { label: t.code, align: 'left' },
          { label: t.material, align: 'left' },
          { label: t.variety, align: 'left' },
          { label: t.cropYear, align: 'left' },
          { label: t.batch, align: 'left' },
          { label: t.lot, align: 'left' },
          { label: t.receivedAt, align: 'left' },
          { label: t.occupied, align: 'right' },
          { label: t.capacity, align: 'right' },
          { label: t.available, align: 'right' },
          { label: t.occupancy, align: 'center' },
          { label: t.age, align: 'center' },
          { label: '', align: 'right' },
        ].map((col, idx) => <TableCell key={idx} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{godown.stacks.map(stack => <TableRow key={stack.id} hover>
          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{stack.code}</TableCell>
          <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" fontWeight={600} noWrap title={stack.materialItem?.name ?? t.noMaterial}>{stack.materialItem?.name ?? t.noMaterial}</Typography></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{stack.varietyName ?? stack.materialItem?.variety ?? '—'}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{stack.cropYear ?? stack.materialItem?.cropYear ?? '—'}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{stack.batchNumber ?? '—'}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{stack.lotNumber ?? '—'}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{stack.receivedAt ? new Date(stack.receivedAt).toLocaleDateString(bn ? 'bn-BD' : 'en-BD') : '—'}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{Number(stack.onHand).toLocaleString()} KG</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(stack.capacityKg).toLocaleString()} KG</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(stack.availableCapacityKg).toLocaleString()} KG</TableCell>
          <TableCell align="center" sx={{ minWidth: 140, whiteSpace: 'nowrap' }}><Stack spacing={0.5}><LinearProgress variant="determinate" value={stack.occupancyPercent} color={stack.occupancyPercent >= 90 ? 'warning' : 'primary'} /><Typography variant="caption">{stack.occupancyPercent.toFixed(1)}%</Typography></Stack></TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{stack.ageDays === null ? t.noAge : `${stack.ageDays} ${t.days}`}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => openEditStack(stack, godown.id)}>{bn ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
        </TableRow>)}
          {!godown.stacks.length && <TableRow><TableCell colSpan={13} align="center" sx={{ py: 3, color: 'text.secondary' }}>—</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>)}

    <FormDialog
      open={godownOpen}
      onClose={() => setGodownOpen(false)}
      onSubmit={submitGodown}
      title={t.addGodown}
      error={dialogError}
      onClearError={() => setDialogError('')}
      loading={mutation.isPending}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="xs"
    >
      <FormGrid columns={1}>
        <AppTextField fieldName="godownName" label={t.name} required value={godownName} errorText={fieldErrors.godownName} onValueChange={v => { setGodownName(v); setFieldErrors(p => ({ ...p, godownName: '' })); }} />
        <AppTextField fieldName="godownCode" label={t.code} required value={godownCode} errorText={fieldErrors.godownCode} onValueChange={v => { setGodownCode(v); setFieldErrors(p => ({ ...p, godownCode: '' })); }} />
      </FormGrid>
    </FormDialog>

    <FormDialog
      open={stackOpen}
      onClose={() => setStackOpen(false)}
      onSubmit={submitStack}
      title={editingStack ? t.editStack : t.addStack}
      error={dialogError}
      onClearError={() => setDialogError('')}
      loading={mutation.isPending}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={2}>
        <AppSelect
          fieldName="godownId"
          label={t.godown}
          required
          disabled={Boolean(editingStack)}
          disabledReason={editingStack ? (bn ? 'সম্পাদনার সময় গুদাম পরিবর্তন করা যাবে না।' : 'Godown cannot be changed after stack creation.') : undefined}
          value={stackValues.godownId}
          errorText={fieldErrors.godownId}
          emptyMessage={bn ? 'কোনো সক্রিয় গুদাম নেই' : 'No active godowns'}
          onChange={v => { setStackValues(c => ({ ...c, godownId: v })); setFieldErrors(p => ({ ...p, godownId: '' })); }}
          options={godowns.filter(row => row.active).map(row => ({ value: row.id, label: row.name, badge: row.code }))}
        />
        <AppTextField fieldName="code" label={t.code} required value={stackValues.code} errorText={fieldErrors.code} onValueChange={v => { setStackValues(c => ({ ...c, code: v })); setFieldErrors(p => ({ ...p, code: '' })); }} />
        <AppTextField fieldName="capacityKg" label={t.capacity} unit="KG" required type="number" inputProps={{ min: 0.001, step: 0.001 }} value={stackValues.capacityKg} errorText={fieldErrors.capacityKg} onValueChange={v => { setStackValues(c => ({ ...c, capacityKg: v })); setFieldErrors(p => ({ ...p, capacityKg: '' })); }} />
        <AppAutocomplete
          fieldName="materialItemId"
          label={t.material}
          loading={materialsQuery.isLoading}
          value={stackValues.materialItemId}
          onChange={v => setStackValues(c => ({ ...c, materialItemId: v }))}
          options={materials.map(m => ({ value: m.id, label: m.name, badge: m.kind }))}
          placeholder={t.noMaterial}
          emptyMessage={t.noMaterial}
        />
        <AppTextField fieldName="varietyName" label={t.variety} value={stackValues.varietyName} onValueChange={v => setStackValues(c => ({ ...c, varietyName: v }))} />
        <AppTextField fieldName="cropYear" label={t.cropYear} type="number" inputProps={{ min: 1900, max: 2200 }} value={stackValues.cropYear} errorText={fieldErrors.cropYear} onValueChange={v => { setStackValues(c => ({ ...c, cropYear: v })); setFieldErrors(p => ({ ...p, cropYear: '' })); }} />
        <AppTextField fieldName="batchNumber" label={t.batch} value={stackValues.batchNumber} onValueChange={v => setStackValues(c => ({ ...c, batchNumber: v }))} />
        <AppTextField fieldName="lotNumber" label={t.lot} value={stackValues.lotNumber} onValueChange={v => setStackValues(c => ({ ...c, lotNumber: v }))} />
        <AppTextField fieldName="receivedAt" label={t.receivedAt} type="datetime-local" value={stackValues.receivedAt} onValueChange={v => setStackValues(c => ({ ...c, receivedAt: v }))} />
      </FormGrid>
    </FormDialog>
  </Stack>;
}
