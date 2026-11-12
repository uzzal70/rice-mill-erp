'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppTextField, FormGrid, FormSection } from '@/components/form';

type Item = { id: string; name: string; code: string; kind: string; baseUnit: string; packagingSpec?: { sizeKg: string; bagType: string | null } | null };
type StackRow = { id: string; code: string; godown: { name: string } };
type Batch = { id: string; batchNumber: string; status: string; inputQuantityKg: string; packageSizeKg: string; packageCount: number; packedQuantityKg: string; packingLossKg: string; sourceItem: Item; outputItem: Item; packagingItem: Item; sourceStack: StackRow; destinationStack: StackRow };
type List<T> = { data: T[] };
const blank = () => ({ batchNumber: `RP-${Date.now()}`, sourceItemId: '', outputItemId: '', packagingItemId: '', sourceStackId: '', destinationStackId: '', inputQuantityKg: '', packageCount: '', remarks: '' });

export function RepackingPage({ companyId, factoryId, language, onSaved }: { companyId: string; factoryId: string; language: 'en' | 'bn'; onSaved: (message: string) => void }) {
  const bn = language === 'bn';
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
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
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'batchNumber', label: text.batch, value: form.batchNumber, required: true },
        { name: 'sourceItemId', label: text.source, value: form.sourceItemId, required: true, isSelect: true },
        { name: 'outputItemId', label: text.output, value: form.outputItemId, required: true, isSelect: true },
        { name: 'packagingItemId', label: text.package, value: form.packagingItemId, required: true, isSelect: true },
        { name: 'sourceStackId', label: text.sourceStack, value: form.sourceStackId, required: true, isSelect: true },
        { name: 'destinationStackId', label: text.outputStack, value: form.destinationStackId, required: true, isSelect: true },
        { name: 'inputQuantityKg', label: text.input, value: form.inputQuantityKg, required: true, type: 'positiveNumber' },
        { name: 'packageCount', label: text.count, value: form.packageCount, required: true, type: 'integer', min: 1 },
      ],
      language,
    );
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
      await apiRequest('/repacking/batches', { method: 'POST', body: JSON.stringify({ companyId, factoryId, ...form, packageCount: Number(form.packageCount) }) });
      setForm(blank()); onSaved(bn ? 'পুনঃপ্যাক ব্যাচ তৈরি হয়েছে।' : 'Repacking batch created.');
      await qc.invalidateQueries({ queryKey: ['repacking-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not create repacking batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }
  async function action(row: Batch, operation: 'approve' | 'post') {
    setActionBusyId(row.id);
    try {
      await apiRequest(`/repacking/batches/${encodeURIComponent(row.id)}/${operation}`, { method: 'POST', body: JSON.stringify({ companyId, factoryId }) });
      onSaved(operation === 'approve' ? (bn ? 'অনুমোদিত হয়েছে।' : 'Batch approved.') : (bn ? 'স্টক পোস্ট হয়েছে।' : 'Stock posted.'));
      await qc.invalidateQueries({ queryKey: ['repacking-batches', companyId, factoryId] });
    } catch (e) {
      const msg = extractApiError(e, 'Could not update repacking batch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }
  if (!companyId || !factoryId) return <Alert severity="info">{bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.'}</Alert>;
  if (batches.isLoading || items.isLoading || stacks.isLoading) return <Typography color="text.secondary">{bn ? 'পুনঃপ্যাক তথ্য লোড হচ্ছে...' : 'Loading repacking data...'}</Typography>;
  return <Stack spacing={2}>
    {(batches.isError || items.isError || stacks.isError) && <Alert severity="error">{error || 'Unable to load repacking workflow. Check repacking, item and stack permissions.'}</Alert>}{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper component="form" noValidate onSubmit={create} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
      <Typography fontWeight={800} mb={2}>{text.title}</Typography>
      <Stack spacing={2}>
        <FormGrid columns={{ xs: 1, sm: 2, md: 3 }} gap={1.5}>
          <AppTextField fieldName="batchNumber" required label={text.batch} value={form.batchNumber} errorText={fieldErrors.batchNumber} onValueChange={v => { setForm({ ...form, batchNumber: v }); setFieldErrors(p => ({ ...p, batchNumber: '' })); }} />
          <AppAutocomplete fieldName="sourceItemId" required label={text.source} value={form.sourceItemId} errorText={fieldErrors.sourceItemId} options={riceItems.map(item => ({ value: item.id, label: item.name, badge: item.code }))} emptyMessage={bn ? 'কোনো চাল পণ্য নেই' : 'No rice products'} onChange={v => { setForm({ ...form, sourceItemId: v }); setFieldErrors(p => ({ ...p, sourceItemId: '' })); }} />
          <AppAutocomplete fieldName="outputItemId" required label={text.output} value={form.outputItemId} errorText={fieldErrors.outputItemId} options={riceItems.map(item => ({ value: item.id, label: item.name, badge: item.code }))} emptyMessage={bn ? 'কোনো চাল পণ্য নেই' : 'No rice products'} onChange={v => { setForm({ ...form, outputItemId: v }); setFieldErrors(p => ({ ...p, outputItemId: '' })); }} />
          <AppAutocomplete fieldName="sourceStackId" required label={text.sourceStack} value={form.sourceStackId} errorText={fieldErrors.sourceStackId} options={stacksData.map(stack => ({ value: stack.id, label: `${stack.godown.name} / ${stack.code}` }))} emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'} onChange={v => { setForm({ ...form, sourceStackId: v }); setFieldErrors(p => ({ ...p, sourceStackId: '' })); }} />
          <AppAutocomplete fieldName="destinationStackId" required label={text.outputStack} value={form.destinationStackId} errorText={fieldErrors.destinationStackId} options={stacksData.map(stack => ({ value: stack.id, label: `${stack.godown.name} / ${stack.code}` }))} emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'} onChange={v => { setForm({ ...form, destinationStackId: v }); setFieldErrors(p => ({ ...p, destinationStackId: '' })); }} />
          <AppAutocomplete fieldName="packagingItemId" required label={text.package} value={form.packagingItemId} errorText={fieldErrors.packagingItemId} options={packages.map(item => ({ value: item.id, label: item.name, badge: `${item.packagingSpec?.sizeKg} KG` }))} emptyMessage={bn ? 'কোনো প্যাকেজিং ব্যাগ নেই' : 'No packaging bags found'} onChange={v => { setForm({ ...form, packagingItemId: v }); setFieldErrors(p => ({ ...p, packagingItemId: '' })); }} />
        </FormGrid>

        <FormSection title={bn ? 'ওজন ও প্যাকেজিং সংখ্যা' : 'Input Weight & Package Count'}>
          <FormGrid columns={{ xs: 1, sm: 3 }} gap={1.5}>
            <AppTextField fieldName="inputQuantityKg" required type="number" unit="KG" inputProps={{ min: 0, step: '.001' }} label={text.input} value={form.inputQuantityKg} errorText={fieldErrors.inputQuantityKg} onValueChange={v => { setForm({ ...form, inputQuantityKg: v }); setFieldErrors(p => ({ ...p, inputQuantityKg: '' })); }} />
            <AppTextField
              fieldName="packageCount"
              required
              type="number"
              unit="PCS"
              inputProps={{ min: 1, step: 1 }}
              label={text.count}
              value={form.packageCount}
              errorText={fieldErrors.packageCount}
              prerequisite={{
                met: Boolean(form.packagingItemId),
                message: bn ? 'ব্যাগ সংখ্যা দেওয়ার আগে প্রথমে প্যাকেজিং ব্যাগ নির্বাচন করুন।' : 'Please select a Packaging bag first before entering bag count.',
                focusField: 'packagingItemId',
              }}
              onValueChange={v => { setForm({ ...form, packageCount: v }); setFieldErrors(p => ({ ...p, packageCount: '' })); }}
            />
            <AppTextField fieldName="remarks" label={text.remarks} value={form.remarks} onValueChange={v => setForm({ ...form, remarks: v })} />
          </FormGrid>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} mt={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" color="primary" variant="outlined" label={`${text.packed}: ${packedKg || '0.000'} KG`} />
              <Chip size="small" color={lossKg && Number(lossKg) < 0 ? 'error' : 'default'} variant="outlined" label={`${text.loss}: ${lossKg || '0.000'} KG`} />
              {selectedPackage?.packagingSpec?.bagType && <Chip size="small" variant="outlined" label={selectedPackage.packagingSpec.bagType} />}
            </Stack>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>{text.create}</Button>
          </Stack>
        </FormSection>
      </Stack>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1150 }}>
        <TableHead><TableRow>{[
          { label: text.batch, align: 'left' },
          { label: text.source, align: 'left' },
          { label: text.output, align: 'left' },
          { label: text.package, align: 'left' },
          { label: text.input, align: 'right' },
          { label: text.count, align: 'right' },
          { label: text.packed, align: 'right' },
          { label: text.loss, align: 'right' },
          { label: 'Status', align: 'center' },
          { label: text.actions, align: 'right' },
        ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.batchNumber}</TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={`${row.sourceItem.name} · ${row.sourceStack.code}`}>{row.sourceItem.name} · {row.sourceStack.code}</Typography></TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={`${row.outputItem.name} · ${row.destinationStack.code}`}>{row.outputItem.name} · {row.destinationStack.code}</Typography></TableCell>
            <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={`${row.packagingItem.name} · ${row.packageSizeKg} KG`}>{row.packagingItem.name} · {row.packageSizeKg} KG</Typography></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.inputQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.packageCount}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{row.packedQuantityKg} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{row.packingLossKg} KG</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={row.status} color={row.status === 'POSTED' ? 'success' : 'default'} /></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{row.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={actionBusyId === row.id} onClick={() => action(row, 'approve')}>{text.approve}</Button> : row.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={actionBusyId === row.id} onClick={() => action(row, 'post')}>{text.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!rows.length && <TableRow><TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 3 }}>{text.noRows}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  </Stack>;
}
