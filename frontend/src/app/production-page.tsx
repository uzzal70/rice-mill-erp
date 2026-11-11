'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type Item = { id: string; name: string; kind: string; baseUnit: string; riceType?: string | null };
type StackRow = { id: string; code: string; godown: { name: string } };
type ProductionLine = { id: string; name: string; code: string };
type Output = { itemId: string; stackId: string; quantityKg: string };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; totalOutputKg: string; processLossKg: string; headRiceRecoveryPct: string; totalRiceRecoveryPct: string; byProductRecoveryPct: string; belowStandardRecovery: boolean; inputItem: Item; outputs: Array<{ item: Item; quantityKg: string }> };
type List<T> = { data: T[] };
const localDateTime = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const blank = () => ({ batchNumber: `ML-${Date.now()}`, productionLineId: '', inputItemId: '', inputStackId: '', inputQuantityKg: '', startedAt: localDateTime(new Date(Date.now() - 3_600_000)), completedAt: localDateTime(new Date()), remarks: '', outputs: [{ itemId: '', stackId: '', quantityKg: '' }] as Output[] });

export function ProductionPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn'; const qc = useQueryClient(); const [form, setForm] = useState(blank()); const [error, setError] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['production-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/production/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['production-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['production-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const lines = useQuery({ queryKey: ['production-lines', companyId, factoryId], queryFn: () => apiRequest<ProductionLine[]>(`/production-lines?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const t = { title: bn ? 'ধান মাড়াই উৎপাদন' : 'Milling production', batch: bn ? 'ব্যাচ নং' : 'Batch no.', line: bn ? 'উৎপাদন লাইন' : 'Production line', inputItem: bn ? 'ধান' : 'Paddy', inputStack: bn ? 'ইনপুট স্ট্যাক' : 'Input stack', input: bn ? 'ইনপুট KG' : 'Input KG', output: bn ? 'আউটপুট' : 'Output', item: bn ? 'পণ্য' : 'Product', stack: bn ? 'স্ট্যাক' : 'Stack', quantity: bn ? 'পরিমাণ KG' : 'Quantity KG', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', remarks: bn ? 'মন্তব্য' : 'Remarks', create: bn ? 'খসড়া তৈরি' : 'Create draft', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', loss: bn ? 'প্রক্রিয়া ক্ষতি' : 'Process loss', headRecovery: bn ? 'হেড চাল রিকভারি %' : 'Head rice recovery %', totalRecovery: bn ? 'মোট চাল রিকভারি %' : 'Total rice recovery %', byRecovery: bn ? 'উপজাত রিকভারি %' : 'By-product recovery %', add: bn ? 'আউটপুট যোগ' : 'Add output', warning: bn ? 'স্ট্যান্ডার্ডের চেয়ে রিকভারি কম' : 'Recovery is below the item standard' };
  const itemRows = items.data?.data ?? []; const paddyItems = itemRows.filter(x => x.kind === 'PADDY' && x.baseUnit === 'KG'); const outputItems = itemRows.filter(x => ['RICE', 'BY_PRODUCT', 'OTHER'].includes(x.kind) && x.baseUnit === 'KG'); const stackRows = stacks.data ?? []; const rows = batches.data?.data ?? [];
  function patchOutput(i: number, values: Partial<Output>) { setForm(f => ({ ...f, outputs: f.outputs.map((o, index) => index === i ? { ...o, ...values } : o) })); }
  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await apiRequest('/production/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString() }) });
      setForm(blank()); onSaved(bn ? 'উৎপাদন ব্যাচ তৈরি হয়েছে।' : 'Production batch created.'); await qc.invalidateQueries({ queryKey: ['production-batches', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create production batch.'); }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    try { await apiRequest(`/production/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) }); await qc.invalidateQueries({ queryKey: ['production-batches', companyId, factoryId] }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update production batch.'); }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading || lines.isLoading) return <Typography color="text.secondary">{bn ? 'উৎপাদন ব্যাচ লোড হচ্ছে...' : 'Loading production batches...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError || lines.isError) && <Alert severity="error">{error || 'Unable to load production workflow. Check production, production-line, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800} mb={2}>{t.title}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1.2}>
        <TextField required size="small" label={t.batch} value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} />
        <TextField select size="small" SelectProps={{ native: true }} label={t.line} value={form.productionLineId} onChange={e => setForm({ ...form, productionLineId: e.target.value })}><option value="" />{(lines.data ?? []).map(line => <option key={line.id} value={line.id}>{line.name} · {line.code}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={t.inputItem} value={form.inputItemId} onChange={e => setForm({ ...form, inputItemId: e.target.value })}><option value="" />{paddyItems.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={t.inputStack} value={form.inputStackId} onChange={e => setForm({ ...form, inputStackId: e.target.value })}><option value="" />{stackRows.map(x => <option key={x.id} value={x.id}>{x.godown.name} / {x.code}</option>)}</TextField>
        <TextField required size="small" type="number" inputProps={{ min: 0, step: '.001' }} label={t.input} value={form.inputQuantityKg} onChange={e => setForm({ ...form, inputQuantityKg: e.target.value })} />
        <TextField required size="small" type="datetime-local" label={t.start} value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField required size="small" type="datetime-local" label={t.end} value={form.completedAt} onChange={e => setForm({ ...form, completedAt: e.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField size="small" label={t.remarks} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
      </Stack>
      <Typography fontWeight={700} mt={2}>{t.output}</Typography>
      {form.outputs.map((output, i) => <Stack key={i} direction={{ xs: 'column', md: 'row' }} spacing={1} mt={1} alignItems="center">
        <TextField required select fullWidth size="small" SelectProps={{ native: true }} label={t.item} value={output.itemId} onChange={e => patchOutput(i, { itemId: e.target.value })}><option value="" />{outputItems.map(x => <option key={x.id} value={x.id}>{x.name} ({x.kind === 'RICE' ? x.riceType : x.kind})</option>)}</TextField>
        <TextField required select fullWidth size="small" SelectProps={{ native: true }} label={t.stack} value={output.stackId} onChange={e => patchOutput(i, { stackId: e.target.value })}><option value="" />{stackRows.map(x => <option key={x.id} value={x.id}>{x.godown.name} / {x.code}</option>)}</TextField>
        <TextField required fullWidth size="small" type="number" inputProps={{ min: 0, step: '.001' }} label={t.quantity} value={output.quantityKg} onChange={e => patchOutput(i, { quantityKg: e.target.value })} />
        <IconButton aria-label="Remove output" disabled={form.outputs.length <= 1} onClick={() => setForm({ ...form, outputs: form.outputs.filter((_, index) => index !== i) })}><DeleteOutlineRoundedIcon /></IconButton>
      </Stack>)}
      <Stack direction="row" spacing={1} mt={1}><Button startIcon={<AddRoundedIcon />} onClick={() => setForm({ ...form, outputs: [...form.outputs, { itemId: '', stackId: '', quantityKg: '' }] })}>{t.add}</Button><Button type="submit" variant="contained">{t.create}</Button></Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1150 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.batch}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.inputItem}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.input}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.output}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.loss}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.headRecovery}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.totalRecovery}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.byRecovery}</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Status</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}></TableCell>
        </TableRow></TableHead>
        <TableBody>
          {rows.map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.batchNumber}</TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={row.inputItem.name}>{row.inputItem.name}</Typography></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.inputQuantityKg} KG</TableCell>
            <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={row.outputs.map(o => `${o.item.name}: ${o.quantityKg} KG`).join(' · ')}>{row.outputs.map(o => `${o.item.name}: ${o.quantityKg} KG`).join(' · ')}</Typography></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{row.processLossKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.headRiceRecoveryPct}%</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{row.totalRiceRecoveryPct}%</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.byProductRecoveryPct}%</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} color={row.status === 'POSTED' ? 'success' : 'default'} />{row.belowStandardRecovery && <Typography color="warning.main" variant="caption" display="block">{t.warning}</Typography>}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" onClick={() => action(row, 'approve')}>{t.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" onClick={() => action(row, 'post')}>{t.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'উৎপাদন ব্যাচ নেই।' : 'No production batches recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
