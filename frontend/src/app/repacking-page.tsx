'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type Item = { id: string; name: string; code: string; kind: string; baseUnit: string; packagingSpec?: { sizeKg: string; bagType: string | null } | null };
type StackRow = { id: string; code: string; godown: { name: string } };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; packageSizeKg: string; packageCount: number; packedQuantityKg: string; packingLossKg: string; sourceItem: Item; outputItem: Item; packagingItem: Item; sourceStack: StackRow; destinationStack: StackRow };
type List<T> = { data: T[] };
const blank = () => ({ batchNumber: `RP-${Date.now()}`, sourceItemId: '', outputItemId: '', packagingItemId: '', sourceStackId: '', destinationStackId: '', inputQuantityKg: '', packageCount: '', remarks: '' });

export function RepackingPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn'; const qc = useQueryClient(); const [form, setForm] = useState(blank()); const [error, setError] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['repacking-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/repacking/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['repacking-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['repacking-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const text = { title: bn ? 'চাল পুনঃপ্যাক' : 'Rice repacking', batch: bn ? 'ব্যাচ নং' : 'Batch no.', source: bn ? 'বাল্ক চাল' : 'Bulk rice', output: bn ? 'প্যাকেট চাল' : 'Finished rice', package: bn ? 'প্যাকেজিং ব্যাগ' : 'Packaging bag', sourceStack: bn ? 'উৎস স্ট্যাক' : 'Source stack', outputStack: bn ? 'গন্তব্য স্ট্যাক' : 'Destination stack', input: bn ? 'ইনপুট KG' : 'Input KG', count: bn ? 'ব্যাগ সংখ্যা' : 'Bag count', remarks: bn ? 'মন্তব্য' : 'Remarks', create: bn ? 'খসড়া তৈরি' : 'Create draft', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', packed: bn ? 'প্যাকেটজাত KG' : 'Packed KG', loss: bn ? 'প্যাকিং ক্ষতি KG' : 'Packing loss KG', status: bn ? 'অবস্থা' : 'Status', actions: bn ? 'কার্যক্রম' : 'Actions', noRows: bn ? 'পুনঃপ্যাক ব্যাচ নেই।' : 'No repacking batches recorded.' };
  const allItems = items.data?.data ?? [];
  const riceItems = allItems.filter(item => item.kind === 'RICE' && item.baseUnit === 'KG');
  const packages = allItems.filter(item => item.kind === 'PACKAGING' && item.baseUnit === 'PIECE' && item.packagingSpec?.sizeKg);
  const stacksData = stacks.data ?? [];
  const rows = batches.data?.data ?? [];
  const selectedPackage = packages.find(item => item.id === form.packagingItemId);
  const packedKg = useMemo(() => {
    if (!selectedPackage?.packagingSpec || !form.packageCount || !/^\d+$/.test(form.packageCount)) return '';
    return (Number(selectedPackage.packagingSpec.sizeKg) * Number(form.packageCount)).toFixed(3);
  }, [selectedPackage, form.packageCount]);
  const lossKg = form.inputQuantityKg && packedKg ? (Number(form.inputQuantityKg) - Number(packedKg)).toFixed(3) : '';

  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await apiRequest('/repacking/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, packageCount: Number(form.packageCount) }) });
      setForm(blank()); onSaved(bn ? 'পুনঃপ্যাক ব্যাচ তৈরি হয়েছে।' : 'Repacking batch created.');
      await qc.invalidateQueries({ queryKey: ['repacking-batches', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create repacking batch.'); }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    try { await apiRequest(`/repacking/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }); await qc.invalidateQueries({ queryKey: ['repacking-batches', companyId, factoryId] }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update repacking batch.'); }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{bn ? 'পুনঃপ্যাক তথ্য লোড হচ্ছে...' : 'Loading repacking data...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load repacking workflow. Check repacking, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800} mb={2}>{text.title}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1.2}>
        <TextField required size="small" label={text.batch} value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} />
        <TextField required select size="small" SelectProps={{ native: true }} label={text.source} value={form.sourceItemId} onChange={e => setForm({ ...form, sourceItemId: e.target.value })}><option value="" />{riceItems.map(item => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={text.output} value={form.outputItemId} onChange={e => setForm({ ...form, outputItemId: e.target.value })}><option value="" />{riceItems.map(item => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={text.package} value={form.packagingItemId} onChange={e => setForm({ ...form, packagingItemId: e.target.value })}><option value="" />{packages.map(item => <option key={item.id} value={item.id}>{item.name} · {item.packagingSpec?.sizeKg} KG</option>)}</TextField>
        {([['sourceStackId', text.sourceStack], ['destinationStackId', text.outputStack]] as const).map(([key, label]) => <TextField key={key} required select size="small" SelectProps={{ native: true }} label={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}><option value="" />{stacksData.map(stack => <option key={stack.id} value={stack.id}>{stack.godown.name} / {stack.code}</option>)}</TextField>)}
        <TextField required size="small" type="number" inputProps={{ min: 0, step: '.001' }} label={text.input} value={form.inputQuantityKg} onChange={e => setForm({ ...form, inputQuantityKg: e.target.value })} />
        <TextField required size="small" type="number" inputProps={{ min: 1, step: 1 }} label={text.count} value={form.packageCount} onChange={e => setForm({ ...form, packageCount: e.target.value })} />
        <TextField size="small" label={text.remarks} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
        <Button type="submit" variant="contained">{text.create}</Button>
      </Stack>
      <Typography color="text.secondary" fontSize={12} mt={1}>{text.packed}: {packedKg || '—'} KG · {text.loss}: {lossKg || '—'} KG {selectedPackage?.packagingSpec?.bagType ? `· ${selectedPackage.packagingSpec.bagType}` : ''}</Typography>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small"><TableHead><TableRow>{[text.batch, text.source, text.output, text.package, text.input, text.count, text.packed, text.loss, 'Status', text.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
        {rows.map(row => <TableRow key={row.id}><TableCell>{row.batchNumber}</TableCell><TableCell>{row.sourceItem.name} · {row.sourceStack.code}</TableCell><TableCell>{row.outputItem.name} · {row.destinationStack.code}</TableCell><TableCell>{row.packagingItem.name} · {row.packageSizeKg} KG</TableCell><TableCell>{row.inputQuantityKg}</TableCell><TableCell>{row.packageCount}</TableCell><TableCell>{row.packedQuantityKg}</TableCell><TableCell>{row.packingLossKg}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.status === 'DRAFT' ? <Button size="small" onClick={() => action(row, 'approve')}>{text.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" onClick={() => action(row, 'post')}>{text.post}</Button> : '—'}</TableCell></TableRow>)}
        {!rows.length && <TableRow><TableCell colSpan={10} align="center">{text.noRows}</TableCell></TableRow>}
      </TableBody></Table>
    </Paper>
  </Stack>;
}
