'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  const bn = language === 'bn'; const qc = useQueryClient(); const [form, setForm] = useState(blank()); const [error, setError] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['parboiling-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/parboiling/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['parboiling-paddy-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, kind: 'PADDY', active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['parboiling-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const t = { title: bn ? 'সিদ্ধকরণ' : 'Parboiling', batch: bn ? 'ব্যাচ নং' : 'Batch no.', inputItem: bn ? 'কাঁচা ধান' : 'Raw paddy', outputItem: bn ? 'সিদ্ধ ধান' : 'Parboiled paddy', inputStack: bn ? 'ইনপুট স্ট্যাক' : 'Input stack', outputStack: bn ? 'আউটপুট স্ট্যাক' : 'Output stack', input: bn ? 'মোট ইনপুট KG' : 'Total input KG', output: bn ? 'মোট আউটপুট KG' : 'Total output KG', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', create: bn ? 'খসড়া তৈরি' : 'Create draft', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', stages: bn ? 'প্রক্রিয়া ধাপ' : 'Process stages', stage: bn ? 'ধাপ' : 'Stage', moistureBefore: bn ? 'আগের আর্দ্রতা %' : 'Moisture before %', moistureAfter: bn ? 'পরের আর্দ্রতা %' : 'Moisture after %', stageInput: bn ? 'ইনপুট KG' : 'Input KG', stageOutput: bn ? 'আউটপুট KG' : 'Output KG', status: bn ? 'অবস্থা' : 'Status', remarks: bn ? 'মন্তব্য' : 'Remarks', fields: ['Water', 'Temperature °C', 'Pressure bar', 'Fuel', 'Electricity kWh', 'Labour cost'] };
  const itemRows = items.data?.data ?? []; const stackRows = stacks.data ?? []; const rows = batches.data?.data ?? [];
  function patchStage(i: number, values: Partial<Stage>) { setForm(current => ({ ...current, stages: current.stages.map((s, index) => index === i ? { ...s, ...values } : s) })); }
  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const stagesBody = form.stages.map(s => ({ ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== '')), startedAt: new Date(s.startedAt).toISOString(), completedAt: new Date(s.completedAt).toISOString(), moistureBeforePct: Number(s.moistureBeforePct), moistureAfterPct: Number(s.moistureAfterPct) }));
      await apiRequest('/parboiling/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString(), stages: stagesBody }) });
      setForm(blank()); onSaved(bn ? 'সিদ্ধকরণ ব্যাচ তৈরি হয়েছে।' : 'Parboiling batch created.'); await qc.invalidateQueries({ queryKey: ['parboiling-batches', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create parboiling batch.'); }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    try { await apiRequest(`/parboiling/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }); await qc.invalidateQueries({ queryKey: ['parboiling-batches', companyId, factoryId] }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update parboiling batch.'); }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{bn ? 'সিদ্ধকরণ ব্যাচ লোড হচ্ছে...' : 'Loading parboiling batches...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load parboiling workflow. Check parboiling, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800} mb={2}>{t.title}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1.2}>
        <TextField required size="small" label={t.batch} value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} />
        {([['inputItemId', t.inputItem], ['outputItemId', t.outputItem]] as const).map(([key, title]) => <TextField key={key} required select size="small" SelectProps={{ native: true }} label={title} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}><option value="" />{itemRows.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</TextField>)}
        {([['inputStackId', t.inputStack], ['outputStackId', t.outputStack]] as const).map(([key, title]) => <TextField key={key} required select size="small" SelectProps={{ native: true }} label={title} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}><option value="" />{stackRows.map(x => <option key={x.id} value={x.id}>{x.godown.name} / {x.code}</option>)}</TextField>)}
        {([['inputQuantityKg', t.input], ['outputQuantityKg', t.output]] as const).map(([key, title]) => <TextField key={key} required size="small" type="number" inputProps={{ min: 0, step: '.001' }} label={title} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />)}
        <TextField required size="small" type="datetime-local" label={t.start} value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField required size="small" type="datetime-local" label={t.end} value={form.completedAt} onChange={e => setForm({ ...form, completedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label={t.remarks} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
      </Stack>
      <Typography fontWeight={700} mt={2} mb={1}>{t.stages}</Typography>
      <Stack spacing={1.5}>{form.stages.map((s, i) => <Paper key={s.stageType} variant="outlined" sx={{ p: 1.5 }}><Typography fontWeight={700} mb={1}>{s.stageType}</Typography><Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1}>
        <TextField required size="small" type="datetime-local" label={t.start} value={s.startedAt} onChange={e => patchStage(i, { startedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField required size="small" type="datetime-local" label={t.end} value={s.completedAt} onChange={e => patchStage(i, { completedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        {([['inputQuantityKg', t.stageInput], ['outputQuantityKg', t.stageOutput], ['moistureBeforePct', t.moistureBefore], ['moistureAfterPct', t.moistureAfter], ['waterQuantity', t.fields[0]], ['temperatureC', t.fields[1]], ['pressureBar', t.fields[2]], ['fuelQuantity', t.fields[3]], ['electricityKwh', t.fields[4]], ['labourCost', t.fields[5]]] as const).map(([key, label]) => <TextField key={key} required={['inputQuantityKg', 'outputQuantityKg', 'moistureBeforePct', 'moistureAfterPct'].includes(key)} size="small" type="number" inputProps={{ min: 0, step: key.includes('Pct') ? '.01' : '.001' }} label={label} value={s[key]} onChange={e => patchStage(i, { [key]: e.target.value })} />)}
        <TextField size="small" label={t.remarks} value={s.remarks} onChange={e => patchStage(i, { remarks: e.target.value })} />
      </Stack></Paper>)}</Stack><Button type="submit" variant="contained" sx={{ mt: 2 }}>{t.create}</Button>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}><Table size="small"><TableHead><TableRow>{[t.batch, t.inputItem, t.outputItem, t.input, t.output, 'Loss KG', 'Stages', t.status, ''].map(x => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>
      {rows.map(row => <TableRow key={row.id}><TableCell>{row.batchNumber}</TableCell><TableCell>{row.inputItem.name}</TableCell><TableCell>{row.outputItem.name}</TableCell><TableCell>{row.inputQuantityKg}</TableCell><TableCell>{row.outputQuantityKg}</TableCell><TableCell>{row.processLossKg}</TableCell><TableCell>{row.stages.map(s => `${s.stageType}: ${s.inputQuantityKg}→${s.outputQuantityKg} KG`).join(' · ')}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.status === 'DRAFT' ? <Button size="small" onClick={() => action(row, 'approve')}>{t.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" onClick={() => action(row, 'post')}>{t.post}</Button> : '—'}</TableCell></TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={9} align="center">{bn ? 'সিদ্ধকরণ ব্যাচ নেই।' : 'No parboiling batches recorded.'}</TableCell></TableRow>}
    </TableBody></Table></Paper>
  </Stack>;
}
