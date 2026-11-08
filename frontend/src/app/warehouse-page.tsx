'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  return value ? new Date(value).toISOString().slice(0, 16) : '';
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
  const queryClient = useQueryClient();
  const [godownOpen, setGodownOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState(false);
  const [editingStack, setEditingStack] = useState<StackRow | null>(null);
  const [godownName, setGodownName] = useState('');
  const [godownCode, setGodownCode] = useState('');
  const [stackValues, setStackValues] = useState<StackForm>(blankStack);
  const [error, setError] = useState('');

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
      onSaved(language === 'bn' ? 'গুদামের তথ্য সংরক্ষিত হয়েছে।' : 'Warehouse details saved.');
    },
    onError: reason => setError(messageOf(reason, t.failed)),
  });

  function openNewStack(godownId: string) {
    setEditingStack(null);
    setStackValues({ ...blankStack, godownId });
    setError('');
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
    setError('');
    setStackOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    mutation.mutate();
  }

  if (!companyId || !factoryId) return <Alert severity="info">{t.noFactory}</Alert>;
  if (warehouseQuery.isLoading) return <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /><Typography>{t.loading}</Typography></Stack>;

  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => { setGodownOpen(true); setError(''); }}>{t.addGodown}</Button><Button variant="contained" disabled={!godowns.some(row => row.active)} onClick={() => openNewStack(godowns.find(row => row.active)!.id)}>{t.addStack}</Button></Stack>
    </Box>
    {(warehouseQuery.error || materialsQuery.error || error) && <Alert severity="error">{error || messageOf(warehouseQuery.error ?? materialsQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={750} mb={1}>{t.stockAging}</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {(['0_30', '31_60', '61_90', '90_PLUS'] as const).map(band => <Chip key={band} variant="outlined" label={`${band.replace('_', '–').replace('90_PLUS', '90+')} ${t.days}: ${agingCounts[band]} ${t.stacks}`} />)}
      </Stack>
    </Paper>
    {!godowns.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">{t.empty}</Typography></Paper>}
    {godowns.map(godown => <Paper key={godown.id} variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="action.hover">
        <Box><Typography fontWeight={800}>{godown.name}</Typography><Typography variant="caption" color="text.secondary">{godown.code}</Typography></Box>
        {godown.active && <Button size="small" onClick={() => openNewStack(godown.id)}>{t.addStack}</Button>}
      </Box>
      <Table size="small">
        <TableHead><TableRow>{[t.code, t.material, t.variety, t.cropYear, t.batch, t.lot, t.receivedAt, t.occupied, t.capacity, t.available, t.occupancy, t.age].map(label => <TableCell key={label}>{label}</TableCell>)}<TableCell /></TableRow></TableHead>
        <TableBody>{godown.stacks.map(stack => <TableRow key={stack.id} hover>
          <TableCell>{stack.code}</TableCell>
          <TableCell>{stack.materialItem?.name ?? t.noMaterial}</TableCell>
          <TableCell>{stack.varietyName ?? stack.materialItem?.variety ?? '—'}</TableCell>
          <TableCell>{stack.cropYear ?? stack.materialItem?.cropYear ?? '—'}</TableCell>
          <TableCell>{stack.batchNumber ?? '—'}</TableCell>
          <TableCell>{stack.lotNumber ?? '—'}</TableCell>
          <TableCell>{stack.receivedAt ? new Date(stack.receivedAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-BD') : '—'}</TableCell>
          <TableCell>{Number(stack.onHand).toLocaleString()} KG</TableCell>
          <TableCell>{Number(stack.capacityKg).toLocaleString()} KG</TableCell>
          <TableCell>{Number(stack.availableCapacityKg).toLocaleString()} KG</TableCell>
          <TableCell sx={{ minWidth: 140 }}><Stack spacing={0.5}><LinearProgress variant="determinate" value={stack.occupancyPercent} color={stack.occupancyPercent >= 90 ? 'warning' : 'primary'} /><Typography variant="caption">{stack.occupancyPercent.toFixed(1)}%</Typography></Stack></TableCell>
          <TableCell>{stack.ageDays === null ? t.noAge : `${stack.ageDays} ${t.days}`}</TableCell>
          <TableCell><Button size="small" onClick={() => openEditStack(stack, godown.id)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
        </TableRow>)}
          {!godown.stacks.length && <TableRow><TableCell colSpan={13} align="center">—</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>)}

    <Dialog open={godownOpen} onClose={() => setGodownOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>{t.addGodown}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent><Stack spacing={2}>
          <TextField label={t.name} required value={godownName} onChange={event => setGodownName(event.target.value)} />
          <TextField label={t.code} required value={godownCode} onChange={event => setGodownCode(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setGodownOpen(false)}>{t.cancel}</Button><Button type="submit" disabled={mutation.isPending}>{t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={stackOpen} onClose={() => setStackOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editingStack ? t.editStack : t.addStack}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent><Stack spacing={2}>
          <FormControl fullWidth><InputLabel>{t.godown}</InputLabel><Select label={t.godown} required disabled={Boolean(editingStack)} value={stackValues.godownId} onChange={event => setStackValues(current => ({ ...current, godownId: event.target.value }))}>{godowns.filter(row => row.active).map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select></FormControl>
          <TextField label={t.code} required value={stackValues.code} onChange={event => setStackValues(current => ({ ...current, code: event.target.value }))} />
          <TextField label={t.capacity} required type="number" inputProps={{ min: 0.001, step: 0.001 }} value={stackValues.capacityKg} onChange={event => setStackValues(current => ({ ...current, capacityKg: event.target.value }))} />
          <FormControl fullWidth><InputLabel>{t.material}</InputLabel><Select label={t.material} value={stackValues.materialItemId} onChange={event => setStackValues(current => ({ ...current, materialItemId: event.target.value }))}><MenuItem value="">{t.noMaterial}</MenuItem>{materials.map(material => <MenuItem key={material.id} value={material.id}>{material.name}</MenuItem>)}</Select></FormControl>
          <TextField label={t.variety} value={stackValues.varietyName} onChange={event => setStackValues(current => ({ ...current, varietyName: event.target.value }))} />
          <TextField label={t.cropYear} type="number" inputProps={{ min: 1900, max: 2200 }} value={stackValues.cropYear} onChange={event => setStackValues(current => ({ ...current, cropYear: event.target.value }))} />
          <TextField label={t.batch} value={stackValues.batchNumber} onChange={event => setStackValues(current => ({ ...current, batchNumber: event.target.value }))} />
          <TextField label={t.lot} value={stackValues.lotNumber} onChange={event => setStackValues(current => ({ ...current, lotNumber: event.target.value }))} />
          <TextField label={t.receivedAt} type="datetime-local" InputLabelProps={{ shrink: true }} value={stackValues.receivedAt} onChange={event => setStackValues(current => ({ ...current, receivedAt: event.target.value }))} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setStackOpen(false)}>{t.cancel}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <CircularProgress size={18} /> : t.save}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
