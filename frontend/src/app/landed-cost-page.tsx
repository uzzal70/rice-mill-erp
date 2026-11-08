'use client';

import { FormEvent, useState } from 'react';
import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type Component = { id: string; code: string; name: string; type: string; isRequired: boolean };
type LandedCost = { id: string; status: string; quantityKg: string; purchaseCost: string; totalAdditionalCost: string; landedCostTotal: string; landedCostPerKg: string; landedCostPerMon: string; landedCostPerTon: string; components: Array<{ code: string; name: string; amount: string }> | null; purchaseOrder: { supplier: { name: string }; item: { name: string } }; goodsReceipt: { id: string; receiptNumber: string; status: string; quantity: string; landedCost?: { id: string } | null; purchaseInvoice?: { id: string } | null; purchaseOrder: { supplier: { name: string }; item: { name: string } } } };
type Receipt = { id: string; receiptNumber: string; status: string; quantity: string; landedCost?: { id: string } | null; purchaseOrder: { supplier: { name: string }; item: { name: string } } };
type List<T> = { data: T[] };
const types = ['TRANSPORT', 'LOADING', 'UNLOADING', 'COMMISSION', 'DRYING', 'OTHER_DIRECT'];

export function LandedCostPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [config, setConfig] = useState({ name: '', code: '', type: 'OTHER_DIRECT', isRequired: false });
  const costs = useQuery({ queryKey: ['landed-costs', companyId, factoryId], queryFn: () => apiRequest<List<LandedCost>>(`/landed-cost?${scope}`), enabled: Boolean(companyId && factoryId) });
  const components = useQuery({ queryKey: ['landed-cost-components', companyId, factoryId], queryFn: () => apiRequest<Component[]>(`/landed-cost/components?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const receipts = useQuery({ queryKey: ['landed-cost-receipts', companyId, factoryId], queryFn: () => apiRequest<List<Receipt>>(`/goods-receipts?${scope}`), enabled: Boolean(companyId && factoryId) });
  const rows = costs.data?.data ?? [];
  const configs = components.data ?? [];
  const eligible = (receipts.data?.data ?? []).filter(r => r.status === 'POSTED' && !r.landedCost);
  const text = { title: bn ? 'ধানের প্রকৃত ক্রয় খরচ' : 'Paddy landed cost', subtitle: bn ? 'পোস্টকৃত GRN অনুযায়ী ক্রয় ও সরাসরি খরচের হিসাব।' : 'Receipt level purchase and direct cost calculation for posted GRNs.', config: bn ? 'খরচের ধরন যোগ করুন' : 'Add cost component', create: bn ? 'খরচ হিসাব' : 'Calculate cost', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'পোস্ট' : 'Post', noRows: bn ? 'কোনো হিসাব নেই' : 'No landed-cost records', save: bn ? 'সংরক্ষণ' : 'Save component', required: bn ? 'আবশ্যক' : 'Required' };

  async function calculate(receipt: Receipt) {
    setError('');
    try {
      await apiRequest('/landed-cost', { method: 'POST', body: JSON.stringify({ companyId, factoryId, goodsReceiptId: receipt.id, components: configs.map(c => ({ code: c.code, name: c.name, type: c.type, amount: amounts[c.code] || '0' })) }) });
      setAmounts({});
      onSaved(bn ? 'খরচ হিসাব তৈরি হয়েছে।' : 'Landed cost calculated.');
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['landed-costs', companyId, factoryId] }), queryClient.invalidateQueries({ queryKey: ['landed-cost-receipts', companyId, factoryId] })]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not calculate landed cost.'); }
  }
  async function transition(row: LandedCost, action: 'approve' | 'post') {
    try {
      await apiRequest(`/landed-cost/${encodeURIComponent(row.id)}/${action}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      await queryClient.invalidateQueries({ queryKey: ['landed-costs', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update landed cost.'); }
  }
  async function addConfig(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      await apiRequest('/landed-cost/components', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...config }) });
      setConfig({ name: '', code: '', type: 'OTHER_DIRECT', isRequired: false });
      await queryClient.invalidateQueries({ queryKey: ['landed-cost-components', companyId, factoryId] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save component.'); }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (costs.isLoading || components.isLoading || receipts.isLoading) return <Typography color="text.secondary">{bn ? 'লোড হচ্ছে...' : 'Loading landed costs...'}</Typography>;
  return <Stack spacing={2}>
    {(costs.isError || components.isError || receipts.isError) && <Alert severity="error">{error || 'Unable to load landed-cost data. Financial procurement permission may be required.'}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Typography fontWeight={800}>{text.title}</Typography><Typography color="text.secondary" fontSize={12} mb={2}>{text.subtitle}</Typography>
      <Stack component="form" onSubmit={addConfig} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" mb={2}>
        <TextField size="small" required label={bn ? 'নাম' : 'Name'} value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} />
        <TextField size="small" required label="Code" value={config.code} onChange={e => setConfig({ ...config, code: e.target.value.toUpperCase() })} />
        <TextField size="small" select SelectProps={{ native: true }} label={bn ? 'ধরন' : 'Type'} value={config.type} onChange={e => setConfig({ ...config, type: e.target.value })}>{types.map(type => <option key={type} value={type}>{type}</option>)}</TextField>
        <TextField size="small" select SelectProps={{ native: true }} label={text.required} value={String(config.isRequired)} onChange={e => setConfig({ ...config, isRequired: e.target.value === 'true' })}><option value="false">{bn ? 'না' : 'No'}</option><option value="true">{bn ? 'হ্যাঁ' : 'Yes'}</option></TextField>
        <Button type="submit" variant="outlined">{text.config}</Button>
      </Stack>
      {eligible.map(receipt => <Stack key={receipt.id} direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ lg: 'center' }} mb={1}>
        <Typography minWidth={200}>{receipt.receiptNumber} · {receipt.purchaseOrder.supplier.name} · {receipt.quantity} KG</Typography>
        {configs.map(component => <TextField key={component.code} size="small" type="number" inputProps={{ min: 0, step: '0.01' }} required={component.isRequired} label={`${component.name}${component.isRequired ? ' *' : ''}`} value={amounts[component.code] ?? '0'} onChange={e => setAmounts({ ...amounts, [component.code]: e.target.value })} sx={{ width: 140 }} />)}
        <Button size="small" variant="contained" onClick={() => calculate(receipt)}>{text.create}</Button>
      </Stack>)}
      {!eligible.length && <Typography color="text.secondary">{bn ? 'খরচ হিসাবের জন্য কোনো পোস্টকৃত GRN অপেক্ষমাণ নেই।' : 'No posted GRNs are waiting for a landed-cost calculation.'}</Typography>}
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small"><TableHead><TableRow>{[bn ? 'GRN' : 'GRN', bn ? 'সরবরাহকারী' : 'Supplier', bn ? 'ধান' : 'Paddy', 'Purchase', 'Additional', 'Total', '/ KG', '/ Mon', '/ Ton', bn ? 'অবস্থা' : 'Status', bn ? 'কার্যক্রম' : 'Actions'].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map(row => <TableRow key={row.id}><TableCell>{row.goodsReceipt.receiptNumber}</TableCell><TableCell>{row.purchaseOrder.supplier.name}</TableCell><TableCell>{row.purchaseOrder.item.name}</TableCell><TableCell>৳{row.purchaseCost}</TableCell><TableCell>৳{row.totalAdditionalCost}</TableCell><TableCell>৳{row.landedCostTotal}</TableCell><TableCell>৳{row.landedCostPerKg}</TableCell><TableCell>৳{row.landedCostPerMon}</TableCell><TableCell>৳{row.landedCostPerTon}</TableCell><TableCell>{row.status}</TableCell><TableCell>{row.status === 'DRAFT' ? <Button size="small" onClick={() => transition(row, 'approve')}>{text.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" onClick={() => transition(row, 'post')}>{text.post}</Button> : '—'}</TableCell></TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={11} align="center">{text.noRows}</TableCell></TableRow>}</TableBody>
      </Table>
    </Paper>
  </Stack>;
}
