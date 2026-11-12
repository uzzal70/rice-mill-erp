'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';

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
  const bn = language === 'bn';
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PolicyForm>(blank);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    setFieldErrors({});
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
    const rules: FieldRule[] = [
      { name: 'name', label: t.name, value: form.name, required: true },
      { name: 'priority', label: t.priority, value: form.priority, required: true, type: 'integer', min: 0 },
      { name: 'allowedMoisturePct', label: t.allowed, value: form.allowedMoisturePct, required: true, type: 'nonNegativeNumber', min: 0, max: 99.999 },
      { name: 'tolerancePct', label: t.tolerance, value: form.tolerancePct, required: true, type: 'nonNegativeNumber', min: 0, max: 99.999 },
      { name: 'rateDeductionPct', label: t.rateDeduction, value: form.rateDeductionPct, required: true, type: 'nonNegativeNumber', min: 0, max: 99.999 },
    ];
    if (form.formula === 'SLAB_PERCENTAGE') {
      form.slabs.forEach((slab, idx) => {
        rules.push(
          { name: `slab-${idx}-min`, label: `${t.threshold} #${idx + 1}`, value: slab.minExcessPct, required: true, type: 'nonNegativeNumber', min: 0, max: 100 },
          { name: `slab-${idx}-ded`, label: `${t.quantityDeduction} #${idx + 1}`, value: slab.deductionPct, required: true, type: 'nonNegativeNumber', min: 0, max: 99.999 },
        );
      });
    }
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
      const { id, ...values } = form;
      const payload = {
        ...values,
        name: values.name.trim(),
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
      onSaved(bn ? 'আর্দ্রতা নীতি সংরক্ষিত হয়েছে' : 'Moisture policy saved');
    } catch (reason) {
      const msg = extractApiError(reason, t.saveError);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;
  if (policiesQuery.isLoading) return <Typography color="text.secondary">{t.loading}</Typography>;

  return <Stack spacing={2}>
    {policiesQuery.isError && <Alert severity="error">{extractApiError(policiesQuery.error, t.permission)}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
        <Box><Typography fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={12}>{t.subtitle}</Typography></Box>
        <Button variant="contained" onClick={() => edit()}>{t.add}</Button>
      </Stack>
      <Box sx={{ overflowX: 'auto', width: '100%' }}>
        <Table size="small" sx={{ minWidth: 950 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.priority, align: 'center' },
            { label: t.scope, align: 'left' },
            { label: t.formula, align: 'left' },
            { label: t.allowed, align: 'right' },
            { label: t.rateDeduction, align: 'right' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {policies.map(policy => <TableRow key={policy.id} hover>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={policy.name}>{policy.name}</Typography></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{policy.priority}</TableCell>
              <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={`${policy.factoryId ? t.factory : t.allFactories}${policy.paddyItemId ? ` · ${paddy.find(row => row.id === policy.paddyItemId)?.name ?? ''}` : ''}${policy.supplierPartnerId ? ` · ${suppliers.find(row => row.id === policy.supplierPartnerId)?.name ?? ''}` : ''}`}>{policy.factoryId ? t.factory : t.allFactories}{policy.paddyItemId ? ` · ${paddy.find(row => row.id === policy.paddyItemId)?.name ?? ''}` : ''}{policy.supplierPartnerId ? ` · ${suppliers.find(row => row.id === policy.supplierPartnerId)?.name ?? ''}` : ''}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{policy.formula === 'DRY_MATTER_CORRECTION' ? t.dry : t.slabFormula}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{policy.allowedMoisturePct}% ± {policy.tolerancePct}%</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{policy.rateDeductionPct}%</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={policy.active ? 'success' : 'default'} label={policy.active ? t.enabled : t.disabled} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" onClick={() => edit(policy)}>{bn ? 'সম্পাদনা' : 'Edit'}</Button></TableCell>
            </TableRow>)}
            {!policies.length && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Box>
    </Paper>
    <FormDialog
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={save}
      title={form.id ? t.edit : t.add}
      error={error}
      onClearError={() => setError('')}
      loading={saving}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={2}>
        <AppTextField fieldName="name" required label={t.name} value={form.name} errorText={fieldErrors.name} onValueChange={v => { setForm({ ...form, name: v }); setFieldErrors(p => ({ ...p, name: '' })); }} />
        <AppTextField fieldName="priority" required type="number" inputProps={{ min: 0, step: 1 }} label={t.priority} value={form.priority} errorText={fieldErrors.priority} onValueChange={v => { setForm({ ...form, priority: Number(v) }); setFieldErrors(p => ({ ...p, priority: '' })); }} />
      </FormGrid>

      <FormGrid columns={3}>
        <AppSelect
          fieldName="factoryId"
          label={t.factory}
          value={form.factoryId ?? ''}
          emptyOptionLabel={t.allFactories}
          onChange={v => setForm({ ...form, factoryId: v })}
          options={[
            ...(factoryId ? [{ value: factoryId, label: bn ? 'নির্বাচিত কারখানা' : 'Selected factory' }] : []),
          ]}
        />
        <AppAutocomplete
          fieldName="paddyItemId"
          label={t.paddy}
          loading={paddyQuery.isLoading}
          value={form.paddyItemId ?? ''}
          placeholder={t.allPaddy}
          emptyMessage={t.allPaddy}
          onChange={v => setForm({ ...form, paddyItemId: v })}
          options={paddy.map(row => ({ value: row.id, label: row.name, badge: row.code }))}
        />
        <AppAutocomplete
          fieldName="supplierPartnerId"
          label={t.supplier}
          loading={partnersQuery.isLoading}
          value={form.supplierPartnerId ?? ''}
          placeholder={t.allSuppliers}
          emptyMessage={t.allSuppliers}
          onChange={v => setForm({ ...form, supplierPartnerId: v })}
          options={suppliers.map(row => ({ value: row.id, label: row.name, badge: row.type }))}
        />
      </FormGrid>

      <FormGrid columns={3}>
        <AppTextField fieldName="allowedMoisturePct" required type="number" unit="%" inputProps={{ min: 0, max: 99.999, step: 0.001 }} label={t.allowed} value={form.allowedMoisturePct} errorText={fieldErrors.allowedMoisturePct} onValueChange={v => { setForm({ ...form, allowedMoisturePct: v }); setFieldErrors(p => ({ ...p, allowedMoisturePct: '' })); }} />
        <AppTextField fieldName="tolerancePct" required type="number" unit="%" inputProps={{ min: 0, max: 99.999, step: 0.001 }} label={t.tolerance} value={form.tolerancePct} errorText={fieldErrors.tolerancePct} onValueChange={v => { setForm({ ...form, tolerancePct: v }); setFieldErrors(p => ({ ...p, tolerancePct: '' })); }} />
        <AppTextField fieldName="rateDeductionPct" required type="number" unit="%" inputProps={{ min: 0, max: 99.999, step: 0.0001 }} label={t.rateDeduction} value={form.rateDeductionPct} errorText={fieldErrors.rateDeductionPct} onValueChange={v => { setForm({ ...form, rateDeductionPct: v }); setFieldErrors(p => ({ ...p, rateDeductionPct: '' })); }} />
      </FormGrid>

      <AppSelect
        fieldName="formula"
        label={t.formula}
        value={form.formula}
        helperText={t.formulaHelp}
        onChange={v => setForm({ ...form, formula: v as PolicyForm['formula'] })}
        options={[
          { value: 'DRY_MATTER_CORRECTION', label: t.dry },
          { value: 'SLAB_PERCENTAGE', label: t.slabFormula },
        ]}
      />

      {form.formula === 'SLAB_PERCENTAGE' && (
        <FormSection title={bn ? 'আর্দ্রতা স্ল্যাব তালিকা' : 'Excess Moisture Deduction Slabs'}>
          <Stack spacing={1.5}>
            {form.slabs.map((slab, index) => (
              <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                <AppTextField
                  fieldName={`slab-${index}-min`}
                  required
                  type="number"
                  unit="%"
                  inputProps={{ min: 0, max: 100, step: 0.001 }}
                  label={t.threshold}
                  value={slab.minExcessPct}
                  errorText={fieldErrors[`slab-${index}-min`]}
                  onValueChange={val => {
                    setForm({ ...form, slabs: form.slabs.map((row, i) => i === index ? { ...row, minExcessPct: val } : row) });
                    setFieldErrors(p => ({ ...p, [`slab-${index}-min`]: '' }));
                  }}
                />
                <AppTextField
                  fieldName={`slab-${index}-ded`}
                  required
                  type="number"
                  unit="%"
                  inputProps={{ min: 0, max: 99.999, step: 0.0001 }}
                  label={t.quantityDeduction}
                  value={slab.deductionPct}
                  errorText={fieldErrors[`slab-${index}-ded`]}
                  onValueChange={val => {
                    setForm({ ...form, slabs: form.slabs.map((row, i) => i === index ? { ...row, deductionPct: val } : row) });
                    setFieldErrors(p => ({ ...p, [`slab-${index}-ded`]: '' }));
                  }}
                />
                <Button color="error" variant="outlined" sx={{ minWidth: 90, mt: { sm: 0.25 } }} disabled={form.slabs.length === 1} onClick={() => setForm({ ...form, slabs: form.slabs.filter((_, i) => i !== index) })}>
                  {t.remove}
                </Button>
              </Stack>
            ))}
            <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, slabs: [...form.slabs, { minExcessPct: '', deductionPct: '0' }] })}>
              {t.addSlab}
            </Button>
          </Stack>
        </FormSection>
      )}
      <FormControlLabel control={<Checkbox checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />} label={t.active} />
    </FormDialog>
  </Stack>;
}
