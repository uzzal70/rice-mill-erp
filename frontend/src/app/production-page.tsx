'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppTextField, FormGrid, FormSection } from '@/components/form';

type Item = { id: string; name: string; kind: string; baseUnit: string; riceType?: string | null };
type StackRow = { id: string; code: string; godown: { name: string } };
type ProductionLine = { id: string; name: string; code: string };
type Output = { itemId: string; stackId: string; quantityKg: string };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; totalOutputKg: string; processLossKg: string; headRiceRecoveryPct: string; totalRiceRecoveryPct: string; byProductRecoveryPct: string; belowStandardRecovery: boolean; inputItem: Item; outputs: Array<{ item: Item; quantityKg: string }> };
type List<T> = { data: T[] };
const localDateTime = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const blank = () => ({ batchNumber: `ML-${Date.now()}`, productionLineId: '', inputItemId: '', inputStackId: '', inputQuantityKg: '', startedAt: localDateTime(new Date(Date.now() - 3_600_000)), completedAt: localDateTime(new Date()), remarks: '', outputs: [{ itemId: '', stackId: '', quantityKg: '' }] as Output[] });

export function ProductionPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const batches = useQuery({ queryKey: ['production-batches', companyId, factoryId], queryFn: () => apiRequest<List<Batch>>(`/production/batches?${scope}`), enabled: Boolean(companyId && factoryId) });
  const items = useQuery({ queryKey: ['production-items', companyId], queryFn: () => apiRequest<List<Item>>(`/items?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`), enabled: Boolean(companyId) });
  const stacks = useQuery({ queryKey: ['production-stacks', companyId, factoryId], queryFn: () => apiRequest<StackRow[]>(`/stacks?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const lines = useQuery({ queryKey: ['production-lines', companyId, factoryId], queryFn: () => apiRequest<ProductionLine[]>(`/production-lines?${queryString({ companyId, factoryId })}`), enabled: Boolean(companyId && factoryId) });
  const t = { title: bn ? 'ধান মাড়াই উৎপাদন' : 'Milling production', batch: bn ? 'ব্যাচ নং' : 'Batch no.', line: bn ? 'উৎপাদন লাইন' : 'Production line', inputItem: bn ? 'ধান' : 'Paddy', inputStack: bn ? 'ইনপুট স্ট্যাক' : 'Input stack', input: bn ? 'ইনপুট KG' : 'Input KG', output: bn ? 'আউটপুট' : 'Output', item: bn ? 'পণ্য' : 'Product', stack: bn ? 'স্ট্যাক' : 'Stack', quantity: bn ? 'পরিমাণ KG' : 'Quantity KG', start: bn ? 'শুরু' : 'Started at', end: bn ? 'শেষ' : 'Completed at', remarks: bn ? 'মন্তব্য' : 'Remarks', create: bn ? 'খসড়া তৈরি' : 'Create draft', approve: bn ? 'অনুমোদন' : 'Approve', post: bn ? 'স্টক পোস্ট' : 'Post stock', loss: bn ? 'প্রক্রিয়া ক্ষতি' : 'Process loss', headRecovery: bn ? 'হেড চাল রিকভারি %' : 'Head rice recovery %', totalRecovery: bn ? 'মোট চাল রিকভারি %' : 'Total rice recovery %', byRecovery: bn ? 'উপজাত রিকভারি %' : 'By-product recovery %', add: bn ? 'আউটপুট যোগ' : 'Add output', warning: bn ? 'স্ট্যান্ডার্ডের চেয়ে রিকভারি কম' : 'Recovery is below the item standard' };
  const itemRows = items.data?.data ?? []; const paddyItems = itemRows.filter(x => x.kind === 'PADDY' && x.baseUnit === 'KG'); const outputItems = itemRows.filter(x => ['RICE', 'BY_PRODUCT', 'OTHER'].includes(x.kind) && x.baseUnit === 'KG'); const stackRows = stacks.data ?? []; const rows = batches.data?.data ?? [];
  function patchOutput(i: number, values: Partial<Output>) { setForm(f => ({ ...f, outputs: f.outputs.map((o, index) => index === i ? { ...o, ...values } : o) })); }
  async function create(event: FormEvent) {
    event.preventDefault();
    const rules: FieldRule[] = [
      { name: 'batchNumber', label: t.batch, value: form.batchNumber, required: true },
      { name: 'inputItemId', label: t.inputItem, value: form.inputItemId, required: true, isSelect: true },
      { name: 'inputStackId', label: t.inputStack, value: form.inputStackId, required: true, isSelect: true },
      { name: 'inputQuantityKg', label: t.input, value: form.inputQuantityKg, required: true, type: 'positiveNumber' },
      { name: 'startedAt', label: t.start, value: form.startedAt, required: true, type: 'date' },
      { name: 'completedAt', label: t.end, value: form.completedAt, required: true, type: 'date' },
    ];
    form.outputs.forEach((o, i) => {
      rules.push(
        { name: `out-${i}-itemId`, label: `${t.output} #${i + 1} ${t.item}`, value: o.itemId, required: true, isSelect: true },
        { name: `out-${i}-stackId`, label: `${t.output} #${i + 1} ${t.stack}`, value: o.stackId, required: true, isSelect: true },
        { name: `out-${i}-quantityKg`, label: `${t.output} #${i + 1} ${t.quantity}`, value: o.quantityKg, required: true, type: 'positiveNumber' },
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
      await apiRequest('/production/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, startedAt: new Date(form.startedAt).toISOString(), completedAt: new Date(form.completedAt).toISOString() }) });
      setForm(blank()); onSaved(bn ? 'উৎপাদন ব্যাচ তৈরি হয়েছে।' : 'Production batch created.'); await qc.invalidateQueries({ queryKey: ['production-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not create production batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    setActionBusyId(row.id);
    try {
      await apiRequest(`/production/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      onSaved(operation === 'approve' ? (bn ? 'অনুমোদিত হয়েছে।' : 'Production batch approved.') : (bn ? 'স্টক পোস্ট হয়েছে।' : 'Production stock posted.'));
      await qc.invalidateQueries({ queryKey: ['production-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not update production batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading || lines.isLoading) return <Typography color="text.secondary">{bn ? 'উৎপাদন ব্যাচ লোড হচ্ছে...' : 'Loading production batches...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError || lines.isError) && <Alert severity="error">{error || 'Unable to load production workflow. Check production, production-line, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" noValidate onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Typography fontWeight={800} mb={2}>{t.title}</Typography>
      <FormGrid columns={{ xs: 1, sm: 2, md: 4 }} gap={1.5}>
        <AppTextField fieldName="batchNumber" required label={t.batch} value={form.batchNumber} errorText={fieldErrors.batchNumber} onValueChange={v => { setForm({ ...form, batchNumber: v }); setFieldErrors(p => ({ ...p, batchNumber: '' })); }} />
        <AppAutocomplete fieldName="productionLineId" label={t.line} value={form.productionLineId} options={(lines.data ?? []).map(line => ({ value: line.id, label: line.name, badge: line.code }))} emptyMessage={bn ? 'কোনো লাইন নেই' : 'No production lines'} onChange={v => setForm({ ...form, productionLineId: v })} />
        <AppAutocomplete fieldName="inputItemId" required label={t.inputItem} value={form.inputItemId} errorText={fieldErrors.inputItemId} options={paddyItems.map(x => ({ value: x.id, label: x.name }))} emptyMessage={bn ? 'কোনো ধান নেই' : 'No paddy items'} onChange={v => { setForm({ ...form, inputItemId: v }); setFieldErrors(p => ({ ...p, inputItemId: '' })); }} />
        <AppAutocomplete fieldName="inputStackId" required label={t.inputStack} value={form.inputStackId} errorText={fieldErrors.inputStackId} options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))} emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'} onChange={v => { setForm({ ...form, inputStackId: v }); setFieldErrors(p => ({ ...p, inputStackId: '' })); }} />
        <AppTextField fieldName="inputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={t.input} value={form.inputQuantityKg} errorText={fieldErrors.inputQuantityKg} onValueChange={v => { setForm({ ...form, inputQuantityKg: v }); setFieldErrors(p => ({ ...p, inputQuantityKg: '' })); }} />
        <AppTextField fieldName="startedAt" required type="datetime-local" label={t.start} value={form.startedAt} errorText={fieldErrors.startedAt} onValueChange={v => { setForm({ ...form, startedAt: v }); setFieldErrors(p => ({ ...p, startedAt: '' })); }} />
        <AppTextField fieldName="completedAt" required type="datetime-local" label={t.end} value={form.completedAt} errorText={fieldErrors.completedAt} onValueChange={v => { setForm({ ...form, completedAt: v }); setFieldErrors(p => ({ ...p, completedAt: '' })); }} />
        <AppTextField fieldName="remarks" label={t.remarks} value={form.remarks} onValueChange={v => setForm({ ...form, remarks: v })} />
      </FormGrid>

      <Box mt={2.5}>
        <FormSection title={t.output} subtitle={bn ? 'প্রতিটি উৎপাদিত চাল/উপজাত এবং তার গন্তব্য স্ট্যাক নির্বাচন করুন' : 'Select each output product, destination stack, and produced weight'}>
          <Stack spacing={1.5}>
            {form.outputs.map((output, i) => (
              <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.5fr 1.5fr 1fr auto' }, gap: 1.5, alignItems: 'start' }}>
                <AppAutocomplete
                  fieldName={`out-${i}-itemId`}
                  required
                  label={t.item}
                  value={output.itemId}
                  errorText={fieldErrors[`out-${i}-itemId`]}
                  options={outputItems.map(x => ({ value: x.id, label: x.name, badge: x.kind === 'RICE' ? (x.riceType ?? 'RICE') : x.kind }))}
                  emptyMessage={bn ? 'কোনো পণ্য নেই' : 'No output products'}
                  onChange={v => { patchOutput(i, { itemId: v }); setFieldErrors(p => ({ ...p, [`out-${i}-itemId`]: '' })); }}
                />
                <AppAutocomplete
                  fieldName={`out-${i}-stackId`}
                  required
                  label={t.stack}
                  value={output.stackId}
                  errorText={fieldErrors[`out-${i}-stackId`]}
                  options={stackRows.map(x => ({ value: x.id, label: `${x.godown.name} / ${x.code}` }))}
                  emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'}
                  onChange={v => { patchOutput(i, { stackId: v }); setFieldErrors(p => ({ ...p, [`out-${i}-stackId`]: '' })); }}
                />
                <AppTextField
                  fieldName={`out-${i}-quantityKg`}
                  required
                  type="number"
                  unit="KG"
                  inputProps={{ min: 0, step: '.001' }}
                  label={t.quantity}
                  value={output.quantityKg}
                  errorText={fieldErrors[`out-${i}-quantityKg`]}
                  onValueChange={v => { patchOutput(i, { quantityKg: v }); setFieldErrors(p => ({ ...p, [`out-${i}-quantityKg`]: '' })); }}
                />
                <IconButton aria-label="Remove output" color="error" disabled={form.outputs.length <= 1} onClick={() => setForm({ ...form, outputs: form.outputs.filter((_, index) => index !== i) })} sx={{ mt: 0.25 }}><DeleteOutlineRoundedIcon /></IconButton>
              </Box>
            ))}
            <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} pt={0.5}>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setForm({ ...form, outputs: [...form.outputs, { itemId: '', stackId: '', quantityKg: '' }] })}>{t.add}</Button>
              <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>{t.create}</Button>
            </Stack>
          </Stack>
        </FormSection>
      </Box>
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
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={actionBusyId === row.id} onClick={() => action(row, 'approve')}>{t.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={actionBusyId === row.id} onClick={() => action(row, 'post')}>{t.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 3 }}>{bn ? 'উৎপাদন ব্যাচ নেই।' : 'No production batches recorded.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
