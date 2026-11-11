'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type Item = { id: string; name: string; code: string; baseUnit: string };
type StackChoice = { id: string; code: string; godown: { name: string } };
type Row = { item: Item; stack: (StackChoice & { batchNumber?: string | null; lotNumber?: string | null; varietyName?: string | null; cropYear?: number | null }) | null; opening: string; in: string; out: string; onHand: string };
type Count = { id: string; countNumber: string; status: string; bookQuantity: string; countedQuantity: string; adjustmentQuantity: string; unit: string; reason: string; item: Item; stack: StackChoice };
type List<T> = { data: T[] };

export function StockLedgerPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ itemId: '', stackId: '', countedQuantity: '', reason: '', countNumber: `SC-${Date.now()}` });
  const [error, setError] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const ledger = useQuery({ queryKey: ['inventory-ledger', companyId, factoryId], queryFn: () => apiRequest<List<Row>>(`/inventory/stock?${scope}`), enabled: Boolean(companyId && factoryId) });
  const counts = useQuery({ queryKey: ['stock-counts', companyId, factoryId], queryFn: () => apiRequest<List<Count>>(`/inventory/stock-counts?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['stock-count-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['stock-count-stacks', companyId, factoryId], queryFn: () => apiRequest<StackChoice[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const rows = ledger.data?.data ?? [];
  const countRows = counts.data?.data ?? [];
  const itemRows = items.data?.data ?? [];
  const stackRows = stacks.data ?? [];
  const labels = { title: bn ? 'মজুদ লেজার' : 'Stock ledger', opening: bn ? 'প্রারম্ভিক' : 'Opening', in: bn ? 'প্রবেশ' : 'In', out: bn ? 'বাহির' : 'Out', balance: bn ? 'ব্যালেন্স' : 'Balance', location: bn ? 'গুদাম / স্ট্যাক' : 'Godown / stack', item: bn ? 'পণ্য' : 'Item', count: bn ? 'স্টক গণনা' : 'Stock count', number: bn ? 'গণনা নং' : 'Count no.', physical: bn ? 'গণিত পরিমাণ' : 'Counted quantity', reason: bn ? 'কারণ' : 'Reason', record: bn ? 'গণনা নথিভুক্ত' : 'Record count', reconcile: bn ? 'সমন্বয় পোস্ট' : 'Post reconciliation', pending: bn ? 'অপেক্ষমাণ গণনা' : 'Pending counts' };

  async function recordCount(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await apiRequest('/inventory/stock-counts', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form }) });
      setForm({ itemId: '', stackId: '', countedQuantity: '', reason: '', countNumber: `SC-${Date.now()}` });
      onSaved(bn ? 'স্টক গণনা নথিভুক্ত হয়েছে।' : 'Stock count recorded.');
      await queryClient.invalidateQueries({ queryKey: ['stock-counts', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record stock count.'); }
  }
  async function postCount(row: Count) {
    setError('');
    try {
      await apiRequest(`/inventory/stock-counts/${encodeURIComponent(row.id)}/post`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['stock-counts', companyId, factoryId] }), queryClient.invalidateQueries({ queryKey: ['inventory-ledger', companyId, factoryId] })]);
      onSaved(bn ? 'স্টক গণনা সমন্বয় পোস্ট হয়েছে।' : 'Stock count reconciliation posted.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not post reconciliation.'); }
  }

  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (ledger.isLoading || counts.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{bn ? 'মজুদ লেজার লোড হচ্ছে...' : 'Loading stock ledger...'}</Typography>;
  return <Stack spacing={2}>
    {(ledger.isError || counts.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load stock ledger. Check inventory permissions.'}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Typography fontWeight={800} mb={1}>{labels.title}</Typography>
      <Table size="small" sx={{ minWidth: 950 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{labels.item}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{labels.location}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>Variety / batch / lot</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{labels.opening}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{labels.in}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{labels.out}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{labels.balance}</TableCell>
        </TableRow></TableHead>
        <TableBody>{rows.map((row, i) => <TableRow key={`${row.item.id}-${row.stack?.id ?? i}`} hover>
          <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" fontWeight={600} noWrap title={row.item.name}>{row.item.name}</Typography> <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>({row.item.code})</Typography></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.stack ? `${row.stack.godown.name} / ${row.stack.code}` : '—'}</TableCell>
          <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={[row.stack?.varietyName, row.stack?.cropYear, row.stack?.batchNumber, row.stack?.lotNumber].filter(Boolean).join(' · ') || '—'}>{[row.stack?.varietyName, row.stack?.cropYear, row.stack?.batchNumber, row.stack?.lotNumber].filter(Boolean).join(' · ') || '—'}</Typography></TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.opening} {row.item.baseUnit}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'success.main', fontWeight: 600 }}>+{row.in} {row.item.baseUnit}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>-{row.out} {row.item.baseUnit}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{row.onHand} {row.item.baseUnit}</TableCell>
        </TableRow>)}{!rows.length && <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'কোনো মজুদ লেজার নেই।' : 'No stock movements recorded.'}</TableCell></TableRow>}</TableBody>
      </Table>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800} mb={1}>{labels.count}</Typography>
      <Stack component="form" onSubmit={recordCount} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
        <TextField required size="small" label={labels.number} value={form.countNumber} onChange={e => setForm({ ...form, countNumber: e.target.value })} />
        <TextField required select size="small" SelectProps={{ native: true }} label={labels.item} value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })}><option value="" />{itemRows.map(item => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</TextField>
        <TextField required select size="small" SelectProps={{ native: true }} label={labels.location} value={form.stackId} onChange={e => setForm({ ...form, stackId: e.target.value })}><option value="" />{stackRows.map(stack => <option key={stack.id} value={stack.id}>{stack.godown.name} / {stack.code}</option>)}</TextField>
        <TextField required size="small" type="number" inputProps={{ min: 0, step: '.001' }} label={labels.physical} value={form.countedQuantity} onChange={e => setForm({ ...form, countedQuantity: e.target.value })} />
        <TextField required size="small" label={labels.reason} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
        <Button type="submit" variant="contained">{labels.record}</Button>
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Typography fontWeight={800} mb={1}>{labels.pending}</Typography>
      <Table size="small" sx={{ minWidth: 900 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{labels.number}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{labels.item}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{labels.location}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Book</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{labels.physical}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Difference</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>Status</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}></TableCell>
        </TableRow></TableHead>
        <TableBody>
          {countRows.map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.countNumber}</TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={row.item.name}>{row.item.name}</Typography></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.stack.godown.name} / {row.stack.code}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.bookQuantity} {row.unit}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.countedQuantity} {row.unit}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{row.adjustmentQuantity} {row.unit}</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} /></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' && <Button size="small" variant="contained" onClick={() => postCount(row)}>{labels.reconcile}</Button>}</TableCell>
          </TableRow>)}
          {!countRows.length && <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'স্টক গণনার রেকর্ড নেই।' : 'No stock counts recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
