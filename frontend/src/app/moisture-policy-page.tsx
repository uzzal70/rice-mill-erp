'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type MoistureSlab = { minExcessPct: string; deductionPct: string };
type MoisturePolicy = {
  id: string;
  name: string;
  factoryId: string | null;
  paddyItemId: string | null;
  supplierPartnerId: string | null;
  active: boolean;
  priority: number;
  allowedMoisturePct: string;
  tolerancePct: string;
  formula: 'DRY_MATTER_CORRECTION' | 'SLAB_PERCENTAGE';
  rateDeductionPct: string;
  slabs: MoistureSlab[];
};
type Option = { id: string; name: string };
type PolicyForm = Omit<MoisturePolicy, 'id' | 'slabs'> & { id?: string; slabs: MoistureSlab[] };

const blank: PolicyForm = {
  name: '',
  factoryId: '',
  paddyItemId: '',
  supplierPartnerId: '',
  active: true,
  priority: 0,
  allowedMoisturePct: '14',
  tolerancePct: '0',
  formula: 'DRY_MATTER_CORRECTION',
  rateDeductionPct: '0',
  slabs: [{ minExcessPct: '0', deductionPct: '0' }],
};

const labels = {
  en: {
    title: 'Moisture calculation policies', subtitle: 'Configure audited purchase deductions. Highest matching numeric priority wins; equal top priorities block purchase creation.',
    add: 'Add policy', edit: 'Edit policy', name: 'Policy name', priority: 'Priority', factory: 'Factory scope', allFactories: 'All factories',
    paddy: 'Paddy variety', allPaddy: 'All paddy varieties', supplier: 'Supplier / farmer', allSuppliers: 'All suppliers',
    allowed: 'Allowed moisture %', tolerance: 'Tolerance %', formula: 'Quantity formula', dry: 'Dry-matter correction',
    slabFormula: 'Slab percentage deduction', rateDeduction: 'Separate rate deduction %', active: 'Active',
    threshold: 'Excess moisture starts at %', quantityDeduction: 'Quantity deduction %', addSlab: 'Add slab', remove: 'Remove',
    save: 'Save policy', cancel: 'Cancel', actions: 'Actions', status: 'Status', scope: 'Scope', noRows: 'No moisture policies configured.',
    noCompany: 'Select a company to configure moisture policies.', permission: 'Financial permission is required to view or change moisture policies.',
    loading: 'Loading moisture policies...', saveError: 'Could not save this moisture policy.', enabled: 'Active', disabled: 'Inactive',
    formulaHelp: 'Dry-matter uses the accepted moisture limit. Slab percentages deduct from physical quantity for the matching excess threshold.',
  },
  bn: {
    title: 'আর্দ্রতা হিসাব নীতি', subtitle: 'ক্রয় কর্তনের নীতি নির্ধারণ করুন। সর্বোচ্চ অগ্রাধিকার কার্যকর; সমান অগ্রাধিকার হলে ক্রয় বন্ধ থাকবে।',
    add: 'নীতি যোগ করুন', edit: 'নীতি সম্পাদনা', name: 'নীতির নাম', priority: 'অগ্রাধিকার', factory: 'কারখানার সীমা', allFactories: 'সব কারখানা',
    paddy: 'ধানের জাত', allPaddy: 'সব ধানের জাত', supplier: 'সরবরাহকারী / কৃষক', allSuppliers: 'সব সরবরাহকারী',
    allowed: 'অনুমোদিত আর্দ্রতা %', tolerance: 'সহনসীমা %', formula: 'পরিমাণের সূত্র', dry: 'শুষ্ক পদার্থ সংশোধন',
    slabFormula: 'স্ল্যাব অনুযায়ী পরিমাণ কর্তন', rateDeduction: 'আলাদা দর কর্তন %', active: 'সক্রিয়',
    threshold: 'অতিরিক্ত আর্দ্রতার শুরু %', quantityDeduction: 'পরিমাণ কর্তন %', addSlab: 'স্ল্যাব যোগ', remove: 'সরান',
    save: 'নীতি সংরক্ষণ', cancel: 'বাতিল', actions: 'কার্যক্রম', status: 'অবস্থা', scope: 'সীমা', noRows: 'কোনো আর্দ্রতা নীতি নেই।',
    noCompany: 'আর্দ্রতা নীতি নির্ধারণে কোম্পানি নির্বাচন করুন।', permission: 'আর্দ্রতা নীতি দেখতে বা পরিবর্তনে আর্থিক অনুমতি প্রয়োজন।',
    loading: 'আর্দ্রতা নীতি লোড হচ্ছে...', saveError: 'আর্দ্রতা নীতি সংরক্ষণ করা যায়নি।', enabled: 'সক্রিয়', disabled: 'নিষ্ক্রিয়',
    formulaHelp: 'শুষ্ক পদার্থ সূত্রে গ্রহণযোগ্য আর্দ্রতা ব্যবহৃত হয়। স্ল্যাব সূত্রে মিলে যাওয়া অতিরিক্ত আর্দ্রতার জন্য ভৌত পরিমাণ থেকে কর্তন হয়।',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function MoisturePolicyPage({
  companyId, factoryId, language, onSaved,
}: {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
}) {
  const t = labels[language];
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PolicyForm>(blank);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const policiesQuery = useQuery({
    queryKey: ['moisture-policies', companyId, factoryId],
    queryFn: () => apiRequest<MoisturePolicy[]>(`/moisture-policies?${queryString({ companyId, factoryId })}`),
    enabled: Boolean(companyId && factoryId),
  });
  const paddyQuery = useQuery({
    queryKey: ['moisture-policy-paddy', companyId],
    queryFn: () => apiRequest<Array<Option & { code: string }>>(`/items?${queryString({ companyId, kind: 'PADDY', active: true, page: 1, pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });
  const partnersQuery = useQuery({
    queryKey: ['moisture-policy-partners', companyId],
    queryFn: () => apiRequest<Array<Option & { type: string }>>(`/partners?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });
  const policies = policiesQuery.data ?? [];
  const paddy = paddyQuery.data ?? [];
  const suppliers = (partnersQuery.data ?? []).filter(row => row.type === 'SUPPLIER' || row.type === 'FARMER');

  function edit(policy?: MoisturePolicy) {
    setError('');
    setForm(policy ? {
      ...policy,
      factoryId: policy.factoryId ?? '',
      paddyItemId: policy.paddyItemId ?? '',
      supplierPartnerId: policy.supplierPartnerId ?? '',
      slabs: policy.slabs.length ? policy.slabs : [{ minExcessPct: '0', deductionPct: '0' }],
    } : { ...blank, slabs: [...blank.slabs] });
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const { id, ...values } = form;
      const payload = {
        ...values,
        companyId,
        factoryId: values.factoryId || null,
        paddyItemId: values.paddyItemId || null,
        supplierPartnerId: values.supplierPartnerId || null,
        slabs: values.formula === 'SLAB_PERCENTAGE' ? values.slabs : [],
      };
      await apiRequest(id ? `/moisture-policies/${encodeURIComponent(id)}` : '/moisture-policies', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await queryClient.invalidateQueries({ queryKey: ['moisture-policies', companyId] });
      setOpen(false);
      onSaved(language === 'bn' ? 'আর্দ্রতা নীতি সংরক্ষিত হয়েছে' : 'Moisture policy saved');
    } catch (reason) {
      setError(messageOf(reason, t.saveError));
    }
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;
  if (policiesQuery.isLoading) return <Typography color="text.secondary">{t.loading}</Typography>;

  return <Stack spacing={2}>
    {policiesQuery.isError && <Alert severity="error">{messageOf(policiesQuery.error, t.permission)}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
        <Box><Typography fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={12}>{t.subtitle}</Typography></Box>
        <Button variant="contained" onClick={() => edit()}>{t.add}</Button>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>{[t.name, t.priority, t.scope, t.formula, t.allowed, t.rateDeduction, t.status, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {policies.map(policy => <TableRow key={policy.id}>
              <TableCell>{policy.name}</TableCell>
              <TableCell>{policy.priority}</TableCell>
              <TableCell>{policy.factoryId ? t.factory : t.allFactories}{policy.paddyItemId ? ` · ${paddy.find(row => row.id === policy.paddyItemId)?.name ?? ''}` : ''}{policy.supplierPartnerId ? ` · ${suppliers.find(row => row.id === policy.supplierPartnerId)?.name ?? ''}` : ''}</TableCell>
              <TableCell>{policy.formula === 'DRY_MATTER_CORRECTION' ? t.dry : t.slabFormula}</TableCell>
              <TableCell>{policy.allowedMoisturePct}% ± {policy.tolerancePct}%</TableCell>
              <TableCell>{policy.rateDeductionPct}%</TableCell>
              <TableCell><Chip size="small" color={policy.active ? 'success' : 'default'} label={policy.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell><Button size="small" onClick={() => edit(policy)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
            </TableRow>)}
            {!policies.length && <TableRow><TableCell colSpan={8} align="center">{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box>
    </Paper>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <Box component="form" onSubmit={save}>
        <DialogTitle>{form.id ? t.edit : t.add}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField required fullWidth label={t.name} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
              <TextField required type="number" inputProps={{ min: 0, step: 1 }} label={t.priority} value={form.priority} onChange={event => setForm({ ...form, priority: Number(event.target.value) })} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth><InputLabel>{t.factory}</InputLabel><Select label={t.factory} value={form.factoryId} onChange={event => setForm({ ...form, factoryId: event.target.value })}><MenuItem value="">{t.allFactories}</MenuItem><MenuItem value={factoryId}>{language === 'bn' ? 'নির্বাচিত কারখানা' : 'Selected factory'}</MenuItem></Select></FormControl>
              <FormControl fullWidth><InputLabel>{t.paddy}</InputLabel><Select label={t.paddy} value={form.paddyItemId} onChange={event => setForm({ ...form, paddyItemId: event.target.value })}><MenuItem value="">{t.allPaddy}</MenuItem>{paddy.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select></FormControl>
              <FormControl fullWidth><InputLabel>{t.supplier}</InputLabel><Select label={t.supplier} value={form.supplierPartnerId} onChange={event => setForm({ ...form, supplierPartnerId: event.target.value })}><MenuItem value="">{t.allSuppliers}</MenuItem>{suppliers.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}</Select></FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField required type="number" inputProps={{ min: 0, max: 99.999, step: 0.001 }} label={t.allowed} value={form.allowedMoisturePct} onChange={event => setForm({ ...form, allowedMoisturePct: event.target.value })} />
              <TextField required type="number" inputProps={{ min: 0, max: 99.999, step: 0.001 }} label={t.tolerance} value={form.tolerancePct} onChange={event => setForm({ ...form, tolerancePct: event.target.value })} />
              <TextField required type="number" inputProps={{ min: 0, max: 99.999, step: 0.0001 }} label={t.rateDeduction} value={form.rateDeductionPct} onChange={event => setForm({ ...form, rateDeductionPct: event.target.value })} />
            </Stack>
            <FormControl fullWidth><InputLabel>{t.formula}</InputLabel><Select label={t.formula} value={form.formula} onChange={event => setForm({ ...form, formula: event.target.value as PolicyForm['formula'] })}><MenuItem value="DRY_MATTER_CORRECTION">{t.dry}</MenuItem><MenuItem value="SLAB_PERCENTAGE">{t.slabFormula}</MenuItem></Select></FormControl>
            <Typography variant="caption" color="text.secondary">{t.formulaHelp}</Typography>
            {form.formula === 'SLAB_PERCENTAGE' && <Stack spacing={1}>
              {form.slabs.map((slab, index) => <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField required type="number" inputProps={{ min: 0, max: 100, step: 0.001 }} label={t.threshold} value={slab.minExcessPct} onChange={event => setForm({ ...form, slabs: form.slabs.map((row, i) => i === index ? { ...row, minExcessPct: event.target.value } : row) })} />
                <TextField required type="number" inputProps={{ min: 0, max: 99.999, step: 0.0001 }} label={t.quantityDeduction} value={slab.deductionPct} onChange={event => setForm({ ...form, slabs: form.slabs.map((row, i) => i === index ? { ...row, deductionPct: event.target.value } : row) })} />
                <Button color="error" disabled={form.slabs.length === 1} onClick={() => setForm({ ...form, slabs: form.slabs.filter((_, i) => i !== index) })}>{t.remove}</Button>
              </Stack>)}
              <Button sx={{ alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, slabs: [...form.slabs, { minExcessPct: '', deductionPct: '0' }] })}>{t.addSlab}</Button>
            </Stack>}
            <FormControlLabel control={<Checkbox checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />} label={t.active} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained">{t.save}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
