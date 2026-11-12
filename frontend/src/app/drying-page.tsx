'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppTextField, FormGrid, FormSection } from '@/components/form';

type Item = { id: string; name: string; kind: string; baseUnit: string };
type StackRow = { id: string; code: string; godown: { name: string } };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; outputQuantityKg: string; lossKg: string; moistureBeforePct: string; moistureAfterPct: string; dryingMethod: string; durationMinutes: number | null; fuelQuantity: string | null; electricityKwh: string | null; labourCost: string | null; item: Item; sourceStack: StackRow; destinationStack: StackRow };
type List<T> = { data: T[] };
const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const dateTime = () => localDateTime(new Date(Date.now() - 3_600_000));
const blank = () => ({ batchNumber: `DR-${Date.now()}`, itemId: '', sourceStackId: '', destinationStackId: '', inputQuantityKg: '', outputQuantityKg: '', moistureBeforePct: '', moistureAfterPct: '', dryingMethod: '', durationMinutes: '', fuelQuantity: '', electricityKwh: '', labourCost: '', startedAt: dateTime(), completedAt: localDateTime(new Date()), remarks: '' });

export function DryingPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['drying-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/drying/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['drying-paddy-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, kind: 'PADDY', active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['drying-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const label = { title: bn ? 'ধান শুকানো' : 'Paddy drying', batch: bn ? 'ব্যাচ নং' : 'Batch no.', item: bn ? 'ধান' : 'Paddy', source: bn ? 'উৎস স্ট্যাক' : 'Source stack', destination: bn ? 'গন্তব্য স্ট্যাক' : 'Destination stack', input: bn ? 'ইনপুট KG' : 'Input KG', output: bn ? 'আউটপুট KG' : 'Output KG', before: bn ? 'শুকানোর আগে আর্দ্রতা %' : 'Moisture before %', after: bn ? 'শুকানোর পর আর্দ্রতা %' : 'Moisture after %', method: bn ? 'শুকানোর পদ্ধতি' : 'Drying method', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', duration: bn ? 'সময় (মিনিট)' : 'Duration (minutes)', fuel: bn ? 'জ্বালানি পরিমাণ' : 'Fuel quantity', power: bn ? 'বিদ্যুৎ kWh' : 'Electricity kWh', labour: bn ? 'শ্রম খরচ' : 'Labour cost', remarks: bn ? 'মন্তব্য' : 'Remarks', create: bn ? 'খসড়া তৈরি' : 'Create draft', loading: bn ? 'শুকানোর ব্যাচ লোড হচ্ছে...' : 'Loading drying batches...', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', loss: bn ? 'শুকানোর ক্ষতি KG' : 'Drying loss KG' };

  async function create(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'batchNumber', label: label.batch, value: form.batchNumber, required: true },
        { name: 'itemId', label: label.item, value: form.itemId, required: true, isSelect: true },
        { name: 'sourceStackId', label: label.source, value: form.sourceStackId, required: true, isSelect: true },
        { name: 'destinationStackId', label: label.destination, value: form.destinationStackId, required: true, isSelect: true },
        { name: 'inputQuantityKg', label: label.input, value: form.inputQuantityKg, required: true, type: 'positiveNumber' },
        { name: 'outputQuantityKg', label: label.output, value: form.outputQuantityKg, required: true, type: 'positiveNumber' },
        { name: 'moistureBeforePct', label: label.before, value: form.moistureBeforePct, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
        { name: 'moistureAfterPct', label: label.after, value: form.moistureAfterPct, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
        { name: 'dryingMethod', label: label.method, value: form.dryingMethod, required: true },
        { name: 'startedAt', label: label.start, value: form.startedAt, required: true, type: 'date' },
        { name: 'completedAt', label: label.end, value: form.completedAt, required: true, type: 'date' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setError('');
    setFieldErrors({});
    setSaving(true);
    try {
      const body = { ...Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')), startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString() };
      await apiRequest('/drying/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...body }) });
      setForm(blank()); onSaved(bn ? 'শুকানোর ব্যাচ তৈরি হয়েছে।' : 'Drying batch created.');
      await qc.invalidateQueries({ queryKey: ['drying-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not create drying batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    setActionBusyId(row.id);
    try {
      await apiRequest(`/drying/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      onSaved(operation === 'approve' ? (bn ? 'অনুমোদিত হয়েছে।' : 'Batch approved.') : (bn ? 'স্টক পোস্ট হয়েছে।' : 'Stock posted.'));
      await qc.invalidateQueries({ queryKey: ['drying-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not update drying batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{label.loading}</Typography>;
  const itemRows = items.data?.data ?? [];
  const stackRows = stacks.data ?? [];
  const rows = batches.data?.data ?? [];
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load drying workflow. Check drying, item and stack permissions.'}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" noValidate onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Typography fontWeight={800} mb={2}>{label.title}</Typography>
      <Stack spacing={2}>
        <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
          <AppTextField fieldName="batchNumber" required label={label.batch} value={form.batchNumber} errorText={fieldErrors.batchNumber} onValueChange={v => { setForm({ ...form, batchNumber: v }); setFieldErrors(p => ({ ...p, batchNumber: '' })); }} />
          <AppAutocomplete
            fieldName="itemId"
            required
            label={label.item}
            value={form.itemId}
            errorText={fieldErrors.itemId}
            options={itemRows.map(x => ({ value: x.id, label: x.name }))}
            emptyMessage={bn ? 'কোনো সক্রিয় ধান পাওয়া যায়নি' : 'No active paddy varieties'}
            onChange={v => { setForm({ ...form, itemId: v }); setFieldErrors(p => ({ ...p, itemId: '' })); }}
          />
          <AppAutocomplete
            fieldName="sourceStackId"
            required
            label={label.source}
            value={form.sourceStackId}
            errorText={fieldErrors.sourceStackId}
            options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))}
            emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks found'}
            onChange={v => { setForm({ ...form, sourceStackId: v }); setFieldErrors(p => ({ ...p, sourceStackId: '' })); }}
          />
          <AppAutocomplete
            fieldName="destinationStackId"
            required
            label={label.destination}
            value={form.destinationStackId}
            errorText={fieldErrors.destinationStackId}
            options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))}
            emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks found'}
            onChange={v => { setForm({ ...form, destinationStackId: v }); setFieldErrors(p => ({ ...p, destinationStackId: '' })); }}
          />
        </FormGrid>

        <FormSection title={bn ? 'ওজন, আর্দ্রতা ও প্রক্রিয়ার বিবরণ' : 'Weight, Moisture & Process Metrics'}>
          <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
            <AppTextField fieldName="inputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={label.input} value={form.inputQuantityKg} errorText={fieldErrors.inputQuantityKg} onValueChange={v => { setForm({ ...form, inputQuantityKg: v }); setFieldErrors(p => ({ ...p, inputQuantityKg: '' })); }} />
            <AppTextField fieldName="outputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={label.output} value={form.outputQuantityKg} errorText={fieldErrors.outputQuantityKg} onValueChange={v => { setForm({ ...form, outputQuantityKg: v }); setFieldErrors(p => ({ ...p, outputQuantityKg: '' })); }} />
            <AppTextField fieldName="moistureBeforePct" required type="number" unit="%" inputProps={{ min: 0, max: 100, step: '.01' }} label={label.before} value={form.moistureBeforePct} errorText={fieldErrors.moistureBeforePct} onValueChange={v => { setForm({ ...form, moistureBeforePct: v }); setFieldErrors(p => ({ ...p, moistureBeforePct: '' })); }} />
            <AppTextField fieldName="moistureAfterPct" required type="number" unit="%" inputProps={{ min: 0, max: 100, step: '.01' }} label={label.after} value={form.moistureAfterPct} errorText={fieldErrors.moistureAfterPct} onValueChange={v => { setForm({ ...form, moistureAfterPct: v }); setFieldErrors(p => ({ ...p, moistureAfterPct: '' })); }} />
            <AppTextField fieldName="dryingMethod" required label={label.method} placeholder="Sun / Mechanical Dryer" value={form.dryingMethod} errorText={fieldErrors.dryingMethod} onValueChange={v => { setForm({ ...form, dryingMethod: v }); setFieldErrors(p => ({ ...p, dryingMethod: '' })); }} />
            <AppTextField fieldName="startedAt" required type="datetime-local" label={label.start} value={form.startedAt} errorText={fieldErrors.startedAt} onValueChange={v => { setForm({ ...form, startedAt: v }); setFieldErrors(p => ({ ...p, startedAt: '' })); }} />
            <AppTextField fieldName="completedAt" required type="datetime-local" label={label.end} value={form.completedAt} errorText={fieldErrors.completedAt} onValueChange={v => { setForm({ ...form, completedAt: v }); setFieldErrors(p => ({ ...p, completedAt: '' })); }} />
            <AppTextField fieldName="durationMinutes" type="number" unit="min" inputProps={{ min: 0, step: 1 }} label={label.duration} value={form.durationMinutes} onValueChange={v => setForm({ ...form, durationMinutes: v })} />
            <AppTextField fieldName="fuelQuantity" type="number" inputProps={{ min: 0, step: '.001' }} label={label.fuel} value={form.fuelQuantity} onValueChange={v => setForm({ ...form, fuelQuantity: v })} />
            <AppTextField fieldName="electricityKwh" type="number" unit="kWh" inputProps={{ min: 0, step: '.001' }} label={label.power} value={form.electricityKwh} onValueChange={v => setForm({ ...form, electricityKwh: v })} />
            <AppTextField fieldName="labourCost" type="number" prefixText="৳" inputProps={{ min: 0, step: '.01' }} label={label.labour} value={form.labourCost} onValueChange={v => setForm({ ...form, labourCost: v })} />
            <AppTextField fieldName="remarks" label={label.remarks} value={form.remarks} onValueChange={v => setForm({ ...form, remarks: v })} />
          </FormGrid>
        </FormSection>

        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>{label.create}</Button>
        </Stack>
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1150 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{label.batch}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{label.item}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{label.source}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{label.destination}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{label.input}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{label.output}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{label.loss}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{label.before}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{label.after}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{label.method}</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Status</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}></TableCell>
        </TableRow></TableHead>
        <TableBody>
          {rows.map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.batchNumber}</TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={row.item.name}>{row.item.name}</Typography></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.sourceStack.code}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.destinationStack.code}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.inputQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.outputQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{row.lossKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.moistureBeforePct}%</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.moistureAfterPct}%</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.dryingMethod}</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} color={row.status === 'POSTED' ? 'success' : 'default'} /></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={actionBusyId === row.id} onClick={() => action(row, 'approve')}>{label.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={actionBusyId === row.id} onClick={() => action(row, 'post')}>{label.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={12} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'শুকানোর ব্যাচ নেই।' : 'No drying batches recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
