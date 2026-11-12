'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppTextField, FormGrid, FormSection } from '@/components/form';

type Item = { id: string; name: string; kind: string; baseUnit: string };
type StackRow = { id: string; code: string; godown: { name: string } };
type Stage = { stageType: string; startedAt: string; completedAt: string; inputQuantityKg: string; outputQuantityKg: string; moistureBeforePct: string; moistureAfterPct: string; waterQuantity: string; temperatureC: string; pressureBar: string; fuelQuantity: string; electricityKwh: string; labourCost: string; remarks: string };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; outputQuantityKg: string; processLossKg: string; inputItem: Item; outputItem: Item; stages: Stage[] };
type List<T> = { data: T[] };
const localDateTime = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const stages = ['SOAKING', 'STEAMING', 'DRYING'];
const blankStage = (type: string, offset: number): Stage => {
  const start = Date.now() - 4 * 3_600_000 + offset * 3_600_000;
  return { stageType: type, startedAt: localDateTime(new Date(start)), completedAt: localDateTime(new Date(start + 3_600_000)), inputQuantityKg: '', outputQuantityKg: '', moistureBeforePct: '', moistureAfterPct: '', waterQuantity: '', temperatureC: '', pressureBar: '', fuelQuantity: '', electricityKwh: '', labourCost: '', remarks: '' };
};
const blank = () => ({ batchNumber: `PB-${Date.now()}`, inputItemId: '', outputItemId: '', inputStackId: '', outputStackId: '', inputQuantityKg: '', outputQuantityKg: '', startedAt: localDateTime(new Date(Date.now() - 4 * 3_600_000)), completedAt: localDateTime(new Date(Date.now() - 1 * 3_600_000)), remarks: '', stages: stages.map(blankStage) });

export function ParboilingPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['parboiling-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/parboiling/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['parboiling-paddy-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, kind: 'PADDY', active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['parboiling-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const t = { title: bn ? 'সিদ্ধকরণ' : 'Parboiling', batch: bn ? 'ব্যাচ নং' : 'Batch no.', inputItem: bn ? 'কাঁচা ধান' : 'Raw paddy', outputItem: bn ? 'সিদ্ধ ধান' : 'Parboiled paddy', inputStack: bn ? 'ইনপুট স্ট্যাক' : 'Input stack', outputStack: bn ? 'আউটপুট স্ট্যাক' : 'Output stack', input: bn ? 'মোট ইনপুট KG' : 'Total input KG', output: bn ? 'মোট আউটপুট KG' : 'Total output KG', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', create: bn ? 'খসড়া তৈরি' : 'Create draft', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', stages: bn ? 'প্রক্রিয়া ধাপ' : 'Process stages', stage: bn ? 'ধাপ' : 'Stage', moistureBefore: bn ? 'আগের আর্দ্রতা %' : 'Moisture before %', moistureAfter: bn ? 'পরের আর্দ্রতা %' : 'Moisture after %', stageInput: bn ? 'ইনপুট KG' : 'Input KG', stageOutput: bn ? 'আউটপুট KG' : 'Output KG', status: bn ? 'অবস্থা' : 'Status', remarks: bn ? 'মন্তব্য' : 'Remarks', fields: ['Water', 'Temperature °C', 'Pressure bar', 'Fuel', 'Electricity kWh', 'Labour cost'] };
  const itemRows = items.data?.data ?? []; const stackRows = stacks.data ?? []; const rows = batches.data?.data ?? [];
  function patchStage(i: number, values: Partial<Stage>) { setForm(current => ({ ...current, stages: current.stages.map((s, index) => index === i ? { ...s, ...values } : s) })); }
  async function create(event: FormEvent) {
    event.preventDefault();
    const rules: FieldRule[] = [
      { name: 'batchNumber', label: t.batch, value: form.batchNumber, required: true },
      { name: 'inputItemId', label: t.inputItem, value: form.inputItemId, required: true, isSelect: true },
      { name: 'outputItemId', label: t.outputItem, value: form.outputItemId, required: true, isSelect: true },
      { name: 'inputStackId', label: t.inputStack, value: form.inputStackId, required: true, isSelect: true },
      { name: 'outputStackId', label: t.outputStack, value: form.outputStackId, required: true, isSelect: true },
      { name: 'inputQuantityKg', label: t.input, value: form.inputQuantityKg, required: true, type: 'positiveNumber' },
      { name: 'outputQuantityKg', label: t.output, value: form.outputQuantityKg, required: true, type: 'positiveNumber' },
      { name: 'startedAt', label: t.start, value: form.startedAt, required: true, type: 'date' },
      { name: 'completedAt', label: t.end, value: form.completedAt, required: true, type: 'date' },
    ];
    form.stages.forEach((s, i) => {
      rules.push(
        { name: `stage-${i}-startedAt`, label: `${s.stageType} ${t.start}`, value: s.startedAt, required: true, type: 'date' },
        { name: `stage-${i}-completedAt`, label: `${s.stageType} ${t.end}`, value: s.completedAt, required: true, type: 'date' },
        { name: `stage-${i}-inputQuantityKg`, label: `${s.stageType} ${t.stageInput}`, value: s.inputQuantityKg, required: true, type: 'positiveNumber' },
        { name: `stage-${i}-outputQuantityKg`, label: `${s.stageType} ${t.stageOutput}`, value: s.outputQuantityKg, required: true, type: 'positiveNumber' },
        { name: `stage-${i}-moistureBeforePct`, label: `${s.stageType} ${t.moistureBefore}`, value: s.moistureBeforePct, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
        { name: `stage-${i}-moistureAfterPct`, label: `${s.stageType} ${t.moistureAfter}`, value: s.moistureAfterPct, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
      );
    });
    const validation = validateFormFields(rules, language);
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
      const stagesBody = form.stages.map(s => ({ ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== '')), startedAt: new Date(s.startedAt).toISOString(), completedAt: new Date(s.completedAt).toISOString(), moistureBeforePct: Number(s.moistureBeforePct), moistureAfterPct: Number(s.moistureAfterPct) }));
      await apiRequest('/parboiling/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString(), stages: stagesBody }) });
      setForm(blank()); onSaved(bn ? 'সিদ্ধকরণ ব্যাচ তৈরি হয়েছে।' : 'Parboiling batch created.'); await qc.invalidateQueries({ queryKey: ['parboiling-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not create parboiling batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    setActionBusyId(row.id);
    try {
      await apiRequest(`/parboiling/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      onSaved(operation === 'approve' ? (bn ? 'অনুমোদিত হয়েছে।' : 'Batch approved.') : (bn ? 'স্টক পোস্ট হয়েছে।' : 'Stock posted.'));
      await qc.invalidateQueries({ queryKey: ['parboiling-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not update parboiling batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{bn ? 'সিদ্ধকরণ ব্যাচ লোড হচ্ছে...' : 'Loading parboiling batches...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load parboiling workflow. Check parboiling, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" noValidate onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Typography fontWeight={800} mb={2}>{t.title}</Typography>
      <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
        <AppTextField fieldName="batchNumber" required label={t.batch} value={form.batchNumber} errorText={fieldErrors.batchNumber} onValueChange={v => { setForm({ ...form, batchNumber: v }); setFieldErrors(p => ({ ...p, batchNumber: '' })); }} />
        <AppAutocomplete fieldName="inputItemId" required label={t.inputItem} value={form.inputItemId} errorText={fieldErrors.inputItemId} options={itemRows.map(x => ({ value: x.id, label: x.name }))} emptyMessage={bn ? 'কোনো ধান পাওয়া যায়নি' : 'No paddy items'} onChange={v => { setForm({ ...form, inputItemId: v }); setFieldErrors(p => ({ ...p, inputItemId: '' })); }} />
        <AppAutocomplete fieldName="outputItemId" required label={t.outputItem} value={form.outputItemId} errorText={fieldErrors.outputItemId} options={itemRows.map(x => ({ value: x.id, label: x.name }))} emptyMessage={bn ? 'কোনো ধান পাওয়া যায়নি' : 'No paddy items'} onChange={v => { setForm({ ...form, outputItemId: v }); setFieldErrors(p => ({ ...p, outputItemId: '' })); }} />
        <AppAutocomplete fieldName="inputStackId" required label={t.inputStack} value={form.inputStackId} errorText={fieldErrors.inputStackId} options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))} emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'} onChange={v => { setForm({ ...form, inputStackId: v }); setFieldErrors(p => ({ ...p, inputStackId: '' })); }} />
        <AppAutocomplete fieldName="outputStackId" required label={t.outputStack} value={form.outputStackId} errorText={fieldErrors.outputStackId} options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))} emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'} onChange={v => { setForm({ ...form, outputStackId: v }); setFieldErrors(p => ({ ...p, outputStackId: '' })); }} />
        <AppTextField fieldName="inputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={t.input} value={form.inputQuantityKg} errorText={fieldErrors.inputQuantityKg} onValueChange={v => { setForm({ ...form, inputQuantityKg: v }); setFieldErrors(p => ({ ...p, inputQuantityKg: '' })); }} />
        <AppTextField fieldName="outputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={t.output} value={form.outputQuantityKg} errorText={fieldErrors.outputQuantityKg} onValueChange={v => { setForm({ ...form, outputQuantityKg: v }); setFieldErrors(p => ({ ...p, outputQuantityKg: '' })); }} />
        <AppTextField fieldName="startedAt" required type="datetime-local" label={t.start} value={form.startedAt} errorText={fieldErrors.startedAt} onValueChange={v => { setForm({ ...form, startedAt: v }); setFieldErrors(p => ({ ...p, startedAt: '' })); }} />
        <AppTextField fieldName="completedAt" required type="datetime-local" label={t.end} value={form.completedAt} errorText={fieldErrors.completedAt} onValueChange={v => { setForm({ ...form, completedAt: v }); setFieldErrors(p => ({ ...p, completedAt: '' })); }} />
        <Box sx={{ gridColumn: { md: 'span 3' } }}>
          <AppTextField fieldName="remarks" label={t.remarks} value={form.remarks} onValueChange={v => setForm({ ...form, remarks: v })} />
        </Box>
      </FormGrid>
      <Typography fontWeight={700} mt={2.5} mb={1.5}>{t.stages}</Typography>
      <Stack spacing={1.5}>{form.stages.map((s, i) => (
        <FormSection key={s.stageType} title={s.stageType}>
          <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
            <AppTextField fieldName={`stage-${i}-startedAt`} required type="datetime-local" label={t.start} value={s.startedAt} errorText={fieldErrors[`stage-${i}-startedAt`]} onValueChange={v => { patchStage(i, { startedAt: v }); setFieldErrors(p => ({ ...p, [`stage-${i}-startedAt`]: '' })); }} />
            <AppTextField fieldName={`stage-${i}-completedAt`} required type="datetime-local" label={t.end} value={s.completedAt} errorText={fieldErrors[`stage-${i}-completedAt`]} onValueChange={v => { patchStage(i, { completedAt: v }); setFieldErrors(p => ({ ...p, [`stage-${i}-completedAt`]: '' })); }} />
            {([['inputQuantityKg', t.stageInput, 'KG'], ['outputQuantityKg', t.stageOutput, 'KG'], ['moistureBeforePct', t.moistureBefore, '%'], ['moistureAfterPct', t.moistureAfter, '%'], ['waterQuantity', t.fields[0], 'L'], ['temperatureC', t.fields[1], '°C'], ['pressureBar', t.fields[2], 'bar'], ['fuelQuantity', t.fields[3], ''], ['electricityKwh', t.fields[4], 'kWh'], ['labourCost', t.fields[5], '৳']] as const).map(([key, labelText, unitText]) => {
              const req = ['inputQuantityKg', 'outputQuantityKg', 'moistureBeforePct', 'moistureAfterPct'].includes(key);
              const errKey = `stage-${i}-${key}`;
              return (
                <AppTextField
                  key={key}
                  fieldName={errKey}
                  required={req}
                  type="number"
                  unit={unitText && unitText !== '৳' ? unitText : undefined}
                  prefixText={unitText === '৳' ? '৳' : undefined}
                  inputProps={{ min: 0, step: key.includes('Pct') ? '.01' : '.001' }}
                  label={labelText}
                  value={s[key]}
                  errorText={fieldErrors[errKey]}
                  onValueChange={v => {
                    patchStage(i, { [key]: v });
                    setFieldErrors(p => ({ ...p, [errKey]: '' }));
                  }}
                />
              );
            })}
            <AppTextField fieldName={`stage-${i}-remarks`} label={t.remarks} value={s.remarks} onValueChange={v => patchStage(i, { remarks: v })} />
          </FormGrid>
        </FormSection>
      ))}</Stack>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>{t.create}</Button>
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1050 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.batch}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.inputItem}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.outputItem}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.input}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.output}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Loss KG</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>Stages</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{t.status}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}></TableCell>
        </TableRow></TableHead>
        <TableBody>
          {rows.map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.batchNumber}</TableCell>
            <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap title={row.inputItem.name}>{row.inputItem.name}</Typography></TableCell>
            <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap title={row.outputItem.name}>{row.outputItem.name}</Typography></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.inputQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.outputQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{row.processLossKg} KG</TableCell>
            <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={row.stages.map(s => `${s.stageType}: ${s.inputQuantityKg}→${s.outputQuantityKg} KG`).join(' · ')}>{row.stages.map(s => `${s.stageType}: ${s.inputQuantityKg}→${s.outputQuantityKg} KG`).join(' · ')}</Typography></TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} color={row.status === 'POSTED' ? 'success' : 'default'} /></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={actionBusyId === row.id} onClick={() => action(row, 'approve')}>{t.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={actionBusyId === row.id} onClick={() => action(row, 'post')}>{t.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={9} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'সিদ্ধকরণ ব্যাচ নেই।' : 'No parboiling batches recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
