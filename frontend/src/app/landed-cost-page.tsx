'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormGrid } from '@/components/form';

type Component = { id: string; code: string; name: string; type: string; isRequired: boolean };
type LandedCost = { id: string; status: string; quantityKg: string; purchaseCost: string; totalAdditionalCost: string; landedCostTotal: string; landedCostPerKg: string; landedCostPerMon: string; landedCostPerTon: string; components: Array<{ code: string; name: string; amount: string }> | null; purchaseOrder: { supplier: { name: string }; item: { name: string } }; goodsReceipt: { id: string; receiptNumber: string; status: string; quantity: string; landedCost?: { id: string } | null; purchaseInvoice?: { id: string } | null; purchaseOrder: { supplier: { name: string }; item: { name: string } } } };
type Receipt = { id: string; receiptNumber: string; status: string; quantity: string; landedCost?: { id: string } | null; purchaseOrder: { supplier: { name: string }; item: { name: string } } };
type List<T> = { data: T[] };
const types = ['TRANSPORT', 'LOADING', 'UNLOADING', 'COMMISSION', 'DRYING', 'OTHER_DIRECT'];

export function LandedCostPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const toast = useToast();
  const queryClient = useQueryClient();
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [calcErrors, setCalcErrors] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyReceiptId, setBusyReceiptId] = useState('');
  const [busyRowId, setBusyRowId] = useState('');
  const [config, setConfig] = useState({ name: '', code: '', type: 'OTHER_DIRECT', isRequired: false });
  const costs = useQuery({ queryKey: ['landed-costs', companyId, factoryId], queryFn: () => apiRequest<List<LandedCost>>(`/landed-cost?${scope}`), enabled: Boolean(companyId && factoryId) });
  const components = useQuery({ queryKey: ['landed-cost-components', companyId, factoryId], queryFn: () => apiRequest<Component[]>(`/landed-cost/components?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const receipts = useQuery({ queryKey: ['landed-cost-receipts', companyId, factoryId], queryFn: () => apiRequest<List<Receipt>>(`/goods-receipts?${scope}`), enabled: Boolean(companyId && factoryId) });
  const rows = costs.data?.data ?? [];
  const configs = components.data ?? [];
  const eligible = (receipts.data?.data ?? []).filter(r => r.status === 'POSTED' && !r.landedCost);
  const text = { title: bn ? 'ধানের প্রকৃত ক্রয় খরচ' : 'Paddy landed cost', subtitle: bn ? 'পোস্টকৃত GRN অনুযায়ী ক্রয় ও সরাসরি খরচের হিসাব।' : 'Receipt level purchase and direct cost calculation for posted GRNs.', config: bn ? 'খরচের ধরন যোগ করুন' : 'Add cost component', create: bn ? 'খরচ হিসাব' : 'Calculate cost', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'পোস্ট' : 'Post', noRows: bn ? 'কোনো হিসাব নেই' : 'No landed-cost records', save: bn ? 'সংরক্ষণ' : 'Save component', required: bn ? 'আবশ্যক' : 'Required' };

  async function calculate(receipt: Receipt) {
    const validation = validateFormFields(
      configs.map(c => ({
        name: `calc-${receipt.id}-${c.code}`,
        label: `${receipt.receiptNumber} · ${c.name}`,
        value: amounts[`${receipt.id}:${c.code}`] ?? '',
        required: c.isRequired,
        type: 'nonNegativeNumber' as const,
        min: 0,
      })),
      language,
    );
    if (!validation.valid) {
      setCalcErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setError('');
    setCalcErrors({});
    setBusyReceiptId(receipt.id);
    try {
      await apiRequest('/landed-cost', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          goodsReceiptId: receipt.id,
          components: configs.map(c => ({
            code: c.code,
            name: c.name,
            type: c.type,
            amount: amounts[`${receipt.id}:${c.code}`] || '0',
          })),
        }),
      });
      onSaved(bn ? 'খরচ হিসাব তৈরি হয়েছে।' : 'Landed cost calculated.');
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['landed-costs', companyId, factoryId] }), queryClient.invalidateQueries({ queryKey: ['landed-cost-receipts', companyId, factoryId] })]);
    } catch (e) {
      const msg = extractApiError(e, 'Could not calculate landed cost.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyReceiptId('');
    }
  }
  async function transition(row: LandedCost, action: 'approve' | 'post') {
    setBusyRowId(row.id);
    try {
      await apiRequest(`/landed-cost/${encodeURIComponent(row.id)}/${action}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      onSaved(action === 'approve' ? (bn ? 'অনুমোদিত হয়েছে।' : 'Landed cost approved.') : (bn ? 'পোস্ট হয়েছে।' : 'Landed cost posted.'));
      await queryClient.invalidateQueries({ queryKey: ['landed-costs', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not update landed cost.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyRowId('');
    }
  }
  async function addConfig(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'cfgName', label: bn ? 'নাম' : 'Name', value: config.name, required: true },
        { name: 'cfgCode', label: bn ? 'কোড' : 'Code', value: config.code, required: true },
        { name: 'cfgType', label: bn ? 'ধরন' : 'Type', value: config.type, required: true, isSelect: true },
      ],
      language,
    );
    if (!validation.valid) {
      setConfigErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setError('');
    setConfigErrors({});
    setSavingConfig(true);
    try {
      await apiRequest('/landed-cost/components', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...config, name: config.name.trim(), code: config.code.trim().toUpperCase() }) });
      setConfig({ name: '', code: '', type: 'OTHER_DIRECT', isRequired: false });
      onSaved(bn ? 'খরচের উপাদান যোগ হয়েছে।' : 'Cost component added.');
      await queryClient.invalidateQueries({ queryKey: ['landed-cost-components', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not save component.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingConfig(false);
    }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (costs.isLoading || components.isLoading || receipts.isLoading) return <Typography color="text.secondary">{bn ? 'লোড হচ্ছে...' : 'Loading landed costs...'}</Typography>;
  return <Stack spacing={2}>
    {(costs.isError || components.isError || receipts.isError) && <Alert severity="error">{error || 'Unable to load landed-cost data. Financial procurement permission may be required.'}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Typography fontWeight={800}>{text.title}</Typography>
      <Typography color="text.secondary" fontSize={12} mb={2}>{text.subtitle}</Typography>
      <Box component="form" noValidate onSubmit={addConfig} sx={{ mb: 2.5, p: 2, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Typography fontSize={13} fontWeight={700} mb={1.5}>{text.config}</Typography>
        <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
          <AppTextField fieldName="cfgName" required label={bn ? 'নাম' : 'Name'} value={config.name} errorText={configErrors.cfgName} onValueChange={v => { setConfig({ ...config, name: v }); setConfigErrors(p => ({ ...p, cfgName: '' })); }} />
          <AppTextField fieldName="cfgCode" required label="Code" value={config.code} errorText={configErrors.cfgCode} onValueChange={v => { setConfig({ ...config, code: v.toUpperCase() }); setConfigErrors(p => ({ ...p, cfgCode: '' })); }} />
          <AppSelect fieldName="cfgType" label={bn ? 'ধরন' : 'Type'} value={config.type} options={types.map(type => ({ value: type, label: type.replaceAll('_', ' ') }))} errorText={configErrors.cfgType} onChange={v => setConfig({ ...config, type: v })} />
          <AppSelect fieldName="cfgReq" label={text.required} value={String(config.isRequired)} options={[{ value: 'false', label: bn ? 'না' : 'No' }, { value: 'true', label: bn ? 'হ্যাঁ' : 'Yes' }]} onChange={v => setConfig({ ...config, isRequired: v === 'true' })} />
        </FormGrid>
        <Stack direction="row" justifyContent="flex-end" mt={1.5}>
          <Button type="submit" variant="outlined" disabled={savingConfig} startIcon={savingConfig ? <CircularProgress size={15} /> : undefined}>{text.save}</Button>
        </Stack>
      </Box>
      <Stack spacing={1.5}>
        {eligible.map(receipt => (
          <Paper key={receipt.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} mb={1.5}>
              <Typography fontSize={13} fontWeight={700}>
                <Box component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>{receipt.receiptNumber}</Box>
                · {receipt.purchaseOrder.supplier.name} · {receipt.quantity} KG
              </Typography>
              <Button size="small" variant="contained" disabled={busyReceiptId === receipt.id} startIcon={busyReceiptId === receipt.id ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={() => calculate(receipt)}>
                {text.create}
              </Button>
            </Stack>
            <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
              {configs.map(component => {
                const key = `${receipt.id}:${component.code}`;
                const fieldKey = `calc-${receipt.id}-${component.code}`;
                return (
                  <AppTextField
                    key={component.code}
                    fieldName={fieldKey}
                    prefixText="৳"
                    type="number"
                    inputProps={{ min: 0, step: '0.01' }}
                    required={component.isRequired}
                    label={component.name}
                    value={amounts[key] ?? ''}
                    placeholder="0.00"
                    errorText={calcErrors[fieldKey]}
                    onValueChange={v => {
                      setAmounts(prev => ({ ...prev, [key]: v }));
                      setCalcErrors(p => ({ ...p, [fieldKey]: '' }));
                    }}
                  />
                );
              })}
            </FormGrid>
          </Paper>
        ))}
        {!eligible.length && <Alert severity="info">{bn ? 'খরচ হিসাবের জন্য কোনো পোস্টকৃত GRN অপেক্ষমাণ নেই।' : 'No posted GRNs are waiting for a landed-cost calculation.'}</Alert>}
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1150 }}>
        <TableHead><TableRow>{[
          { label: bn ? 'GRN' : 'GRN', align: 'left' },
          { label: bn ? 'সরবরাহকারী' : 'Supplier', align: 'left' },
          { label: bn ? 'ধান' : 'Paddy', align: 'left' },
          { label: 'Purchase', align: 'right' },
          { label: 'Additional', align: 'right' },
          { label: 'Total', align: 'right' },
          { label: '/ KG', align: 'right' },
          { label: '/ Mon', align: 'right' },
          { label: '/ Ton', align: 'right' },
          { label: bn ? 'অবস্থা' : 'Status', align: 'center' },
          { label: bn ? 'কার্যক্রম' : 'Actions', align: 'right' },
        ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map(row => <TableRow key={row.id} hover>
          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.goodsReceipt.receiptNumber}</TableCell>
          <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" fontWeight={600} noWrap title={row.purchaseOrder.supplier.name}>{row.purchaseOrder.supplier.name}</Typography></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.purchaseOrder.item.name}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(row.purchaseCost).toLocaleString()}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(row.totalAdditionalCost).toLocaleString()}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>৳ {Number(row.landedCostTotal).toLocaleString()}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>৳ {Number(row.landedCostPerKg).toFixed(2)}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(row.landedCostPerMon).toFixed(2)}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(row.landedCostPerTon).toFixed(0)}</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} color={row.status === 'POSTED' ? 'success' : 'default'} /></TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={busyRowId === row.id} onClick={() => transition(row, 'approve')}>{text.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={busyRowId === row.id} onClick={() => transition(row, 'post')}>{text.post}</Button> : '—'}</TableCell>
        </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={11} align="center" sx={{ color: 'text.secondary', py: 3 }}>{text.noRows}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
