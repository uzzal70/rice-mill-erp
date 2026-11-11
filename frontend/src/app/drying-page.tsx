'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type Item = { id: string; name: string; kind: string; baseUnit: string };
type StackRow = { id: string; code: string; godown: { name: string } };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; outputQuantityKg: string; lossKg: string; moistureBeforePct: string; moistureAfterPct: string; dryingMethod: string; durationMinutes: number | null; fuelQuantity: string | null; electricityKwh: string | null; labourCost: string | null; item: Item; sourceStack: StackRow; destinationStack: StackRow };
type List<T> = { data: T[] };
const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const dateTime = () => localDateTime(new Date(Date.now() - 3_600_000));
const blank = () => ({ batchNumber: `DR-${Date.now()}`, itemId: '', sourceStackId: '', destinationStackId: '', inputQuantityKg: '', outputQuantityKg: '', moistureBeforePct: '', moistureAfterPct: '', dryingMethod: '', durationMinutes: '', fuelQuantity: '', electricityKwh: '', labourCost: '', startedAt: dateTime(), completedAt: localDateTime(new Date()), remarks: '' });

export function DryingPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['drying-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/drying/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['drying-paddy-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, kind: 'PADDY', active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['drying-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const label = { title: bn ? 'ধান শুকানো' : 'Paddy drying', batch: bn ? 'ব্যাচ নং' : 'Batch no.', item: bn ? 'ধান' : 'Paddy', source: bn ? 'উৎস স্ট্যাক' : 'Source stack', destination: bn ? 'গন্তব্য স্ট্যাক' : 'Destination stack', input: bn ? 'ইনপুট KG' : 'Input KG', output: bn ? 'আউটপুট KG' : 'Output KG', before: bn ? 'শুকানোর আগে আর্দ্রতা %' : 'Moisture before %', after: bn ? 'শুকানোর পর আর্দ্রতা %' : 'Moisture after %', method: bn ? 'শুকানোর পদ্ধতি' : 'Drying method', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', duration: bn ? 'সময় (মিনিট)' : 'Duration (minutes)', fuel: bn ? 'জ্বালানি পরিমাণ' : 'Fuel quantity', power: bn ? 'বিদ্যুৎ kWh' : 'Electricity kWh', labour: bn ? 'শ্রম খরচ' : 'Labour cost', remarks: bn ? 'মন্তব্য' : 'Remarks', create: bn ? 'খসড়া তৈরি' : 'Create draft', loading: bn ? 'শুকানোর ব্যাচ লোড হচ্ছে...' : 'Loading drying batches...', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', loss: bn ? 'শুকানোর ক্ষতি KG' : 'Drying loss KG' };

  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const body = { ...Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')), startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString() };
      await apiRequest('/drying/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...body }) });
      setForm(blank()); onSaved(bn ? 'শুকানোর ব্যাচ তৈরি হয়েছে।' : 'Drying batch created.');
      await qc.invalidateQueries({ queryKey: ['drying-batches', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create drying batch.'); }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    try {
      await apiRequest(`/drying/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      await qc.invalidateQueries({ queryKey: ['drying-batches', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update drying batch.'); }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{label.loading}</Typography>;
  const itemRows = items.data?.data ?? [];
  const stackRows = stacks.data ?? [];
  const rows = batches.data?.data ?? [];
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load drying workflow. Check drying, item and stack permissions.'}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800} mb={2}>{label.title}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1.2}>
        <TextField required size="small" label={label.batch} value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} />
        <TextField required select size="small" SelectProps={{ native: true }} label={label.item} value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })}><option value="" />{itemRows.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={label.source} value={form.sourceStackId} onChange={e => setForm({ ...form, sourceStackId: e.target.value })}><option value="" />{stackRows.map(x => <option key={x.id} value={x.id}>{x.godown.name} / {x.code}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={label.destination} value={form.destinationStackId} onChange={e => setForm({ ...form, destinationStackId: e.target.value })}><option value="" />{stackRows.map(x => <option key={x.id} value={x.id}>{x.godown.name} / {x.code}</option>)}</TextField>
        {[['inputQuantityKg', label.input], ['outputQuantityKg', label.output], ['moistureBeforePct', label.before], ['moistureAfterPct', label.after], ['durationMinutes', label.duration], ['fuelQuantity', label.fuel], ['electricityKwh', label.power], ['labourCost', label.labour]].map(([key, text]) => <TextField key={key} required={['inputQuantityKg', 'outputQuantityKg', 'moistureBeforePct', 'moistureAfterPct'].includes(key)} size="small" type="number" inputProps={{ min: 0, step: key.includes('Pct') ? '.01' : '.001' }} label={text} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} />)}
        <TextField required size="small" label={label.method} value={form.dryingMethod} onChange={e => setForm({ ...form, dryingMethod: e.target.value })} />
        <TextField required size="small" type="datetime-local" label={label.start} value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField required size="small" type="datetime-local" label={label.end} value={form.completedAt} onChange={e => setForm({ ...form, completedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label={label.remarks} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
        <Button type="submit" variant="contained">{label.create}</Button>
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
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" onClick={() => action(row, 'approve')}>{label.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" onClick={() => action(row, 'post')}>{label.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={12} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'শুকানোর ব্যাচ নেই।' : 'No drying batches recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
