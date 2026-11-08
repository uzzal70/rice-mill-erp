'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
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
      <Table size="small"><TableHead><TableRow>{[labels.item, labels.location, 'Variety / batch / lot', labels.opening, labels.in, labels.out, labels.balance].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((row, i) => <TableRow key={`${row.item.id}-${row.stack?.id ?? i}`}><TableCell>{row.item.name} <Typography component="span" variant="caption">({row.item.code})</Typography></TableCell><TableCell>{row.stack ? `${row.stack.godown.name} / ${row.stack.code}` : '—'}</TableCell><TableCell>{[row.stack?.varietyName, row.stack?.cropYear, row.stack?.batchNumber, row.stack?.lotNumber].filter(Boolean).join(' · ') || '—'}</TableCell><TableCell>{row.opening} {row.item.baseUnit}</TableCell><TableCell>{row.in} {row.item.baseUnit}</TableCell><TableCell>{row.out} {row.item.baseUnit}</TableCell><TableCell>{row.onHand} {row.item.baseUnit}</TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={7} align="center">{bn ? 'কোনো মজুদ লেজার নেই।' : 'No stock movements recorded.'}</TableCell></TableRow>}</TableBody>
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
      <Table size="small"><TableHead><TableRow>{[labels.number, labels.item, labels.location, 'Book', labels.physical, 'Difference', 'Status', ''].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
        {countRows.map(row => <TableRow key={row.id}><TableCell>{row.countNumber}</TableCell><TableCell>{row.item.name}</TableCell><TableCell>{row.stack.godown.name} / {row.stack.code}</TableCell><TableCell>{row.bookQuantity} {row.unit}</TableCell><TableCell>{row.countedQuantity} {row.unit}</TableCell><TableCell>{row.adjustmentQuantity} {row.unit}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.status === 'DRAFT' && <Button size="small" onClick={() => postCount(row)}>{labels.reconcile}</Button>}</TableCell></TableRow>)}
        {!countRows.length && <TableRow><TableCell colSpan={8} align="center">{bn ? 'স্টক গণনার রেকর্ড নেই।' : 'No stock counts recorded.'}</TableCell></TableRow>}
      </TableBody></Table></Paper>
  </Stack>;
}
