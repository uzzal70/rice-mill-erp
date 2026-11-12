'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppTextField, FormDialog, FormGrid } from '@/components/form';

type QualitySample = {
  id: string;
  sampleNumber: string;
  sampleType: string;
  status: string;
  measurements: Record<string, number>;
  comments: string | null;
  gateEntry: {
    gateNumber: string;
    vehicleNumber: string;
    direction: string;
    partner: { name: string; type: string } | null;
    item: { name: string } | null;
  };
};

const parameters = [
  ['moisturePct', 'Moisture %', 'আর্দ্রতা %'],
  ['foreignMatterPct', 'Foreign matter %', 'বহিরাগত পদার্থ %'],
  ['brokenPct', 'Broken %', 'ভাঙা %'],
  ['damagedPct', 'Damaged %', 'ক্ষতিগ্রস্ত %'],
  ['discoloredPct', 'Discolored %', 'বিবর্ণ %'],
  ['immaturePct', 'Immature %', 'অপরিপক্ব %'],
  ['chalkyPct', 'Chalky %', 'চকি %'],
  ['purityPct', 'Purity %', 'বিশুদ্ধতা %'],
  ['otherPct', 'Other %', 'অন্যান্য %'],
] as const;

const labels = {
  en: {
    title: 'Laboratory quality control',
    subtitle: 'Record incoming paddy test results and decisions with a traceable sample history.',
    refresh: 'Refresh',
    sample: 'Sample no.',
    gate: 'Gate no.',
    vehicle: 'Vehicle',
    counterparty: 'Supplier/customer',
    material: 'Material',
    stage: 'Sample stage',
    status: 'Status',
    result: 'Results',
    actions: 'Actions',
    enterResults: 'Enter results',
    recordResults: 'Record laboratory results',
    comments: 'Comments',
    saveResults: 'Submit results',
    accept: 'Accept',
    reject: 'Reject',
    cancel: 'Cancel',
    noRows: 'No laboratory samples found.',
    loading: 'Loading laboratory samples...',
    loadFailed: 'Could not load quality samples.',
    resultSaved: 'Quality results recorded.',
    decisionSaved: 'Quality decision recorded.',
    policyNote: 'Acceptance and rejection are explicit authorized decisions. Configurable quality deductions and purchase-rate effects are not applied until the calculation policy is configured.',
  },
  bn: {
    title: 'ল্যাবরেটরি মান নিয়ন্ত্রণ',
    subtitle: 'আগমনী ধানের পরীক্ষার ফল ও সিদ্ধান্ত নমুনার ইতিহাসসহ সংরক্ষণ করুন।',
    refresh: 'হালনাগাদ',
    sample: 'নমুনা নম্বর',
    gate: 'গেট নম্বর',
    vehicle: 'যানবাহন',
    counterparty: 'সরবরাহকারী/ক্রেতা',
    material: 'পণ্য',
    stage: 'নমুনার ধাপ',
    status: 'অবস্থা',
    result: 'ফলাফল',
    actions: 'কার্যক্রম',
    enterResults: 'ফল যোগ',
    recordResults: 'ল্যাব ফলাফল লিখুন',
    comments: 'মন্তব্য',
    saveResults: 'ফল জমা দিন',
    accept: 'গ্রহণ',
    reject: 'প্রত্যাখ্যান',
    cancel: 'বাতিল',
    noRows: 'কোনো ল্যাব নমুনা নেই।',
    loading: 'ল্যাব নমুনা লোড হচ্ছে...',
    loadFailed: 'মান পরীক্ষার নমুনা লোড করা যায়নি।',
    resultSaved: 'মান পরীক্ষার ফল সংরক্ষিত হয়েছে।',
    decisionSaved: 'মান পরীক্ষার সিদ্ধান্ত সংরক্ষিত হয়েছে।',
    policyNote: 'গ্রহণ বা প্রত্যাখ্যান অনুমোদিত ব্যবহারকারী নির্ধারণ করেন। কনফিগার করা নীতি না থাকা পর্যন্ত গুণগত কর্তন বা ক্রয়মূল্যের প্রভাব প্রয়োগ করা হয় না।',
  },
};

export function QualityControlPage({ companyId, factoryId, language, onSaved, onError }: {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = labels[language];
  const bn = language === 'bn';
  const toast = useToast();
  const [samples, setSamples] = useState<QualitySample[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const [selected, setSelected] = useState<QualitySample | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function loadSamples() {
    if (!companyId || !factoryId) {
      setSamples([]);
      return;
    }
    setBusy(true);
    try {
      setSamples(await apiRequest<QualitySample[]>(`/quality/samples?${queryString({ companyId, factoryId, page: 1, pageSize: 100 })}`));
    } catch (reason) {
      onError(extractApiError(reason, t.loadFailed));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void loadSamples(); }, [companyId, factoryId]);

  function openResults(sample: QualitySample) {
    setSelected(sample);
    setValues({});
    setComments('');
    setFormError('');
    setFieldErrors({});
  }

  async function submitResults(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const validation = validateFormFields(
      parameters.map(([key, en, bnLabel]) => ({
        name: key,
        label: bn ? bnLabel : en,
        value: values[key] ?? '',
        type: 'nonNegativeNumber' as const,
        min: 0,
        max: 100,
      })),
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    const measurements = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value.trim() !== '')
        .map(([key, value]) => [key, Number(value)]),
    );
    if (Object.keys(measurements).length === 0) {
      const msg = bn ? 'অনুগ্রহ করে অন্তত একটি পরীক্ষার মান (যেমন: আর্দ্রতা %) লিখুন।' : 'Please enter at least one laboratory measurement (e.g. Moisture %) first.';
      setFormError(msg);
      toast.warning(msg);
      focusFieldByName('moisturePct');
      return;
    }
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      await apiRequest(`/quality/samples/${selected.id}/results`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId, ...measurements, comments: comments.trim() }),
      });
      setSelected(null);
      onSaved(t.resultSaved);
      await loadSamples();
    } catch (reason) {
      const msg = extractApiError(reason, t.loadFailed);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function decide(sample: QualitySample, decision: 'ACCEPT' | 'REJECT') {
    setActionBusyId(sample.id);
    try {
      await apiRequest(`/quality/samples/${sample.id}/approve`, { method: 'POST', body: JSON.stringify({ companyId, factoryId, decision }) });
      onSaved(t.decisionSaved);
      await loadSamples();
    } catch (reason) {
      onError(extractApiError(reason, t.loadFailed));
    } finally {
      setActionBusyId('');
    }
  }

  return <Stack spacing={2}>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
        <Box><Typography fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={12}>{t.subtitle}</Typography></Box>
        <Button variant="outlined" onClick={loadSamples} disabled={busy}>{t.refresh}</Button>
      </Stack>
      <Alert severity="info" sx={{ mt: 1.5 }}>{t.policyNote}</Alert>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 1.5 }}>
      {busy ? <Stack alignItems="center" py={5}><CircularProgress size={24} /><Typography mt={1} color="text.secondary">{t.loading}</Typography></Stack>
        : samples.length === 0 ? <Typography textAlign="center" color="text.secondary" py={5}>{t.noRows}</Typography>
          : <Box sx={{ overflowX: 'auto', width: '100%' }}><Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead><TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.sample}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.gate}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.vehicle}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.counterparty}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.material}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.stage}</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{t.status}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.result}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.actions}</TableCell>
            </TableRow></TableHead>
            <TableBody>{samples.map(sample => <TableRow key={sample.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><Typography fontWeight={800} sx={{ fontFamily: 'monospace' }}>{sample.sampleNumber}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{sample.gateEntry.gateNumber}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{sample.gateEntry.vehicleNumber}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={sample.gateEntry.partner?.name ?? '—'}>{sample.gateEntry.partner?.name ?? '—'}</Typography></TableCell>
              <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap title={sample.gateEntry.item?.name ?? '—'}>{sample.gateEntry.item?.name ?? '—'}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{sample.sampleType}</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={sample.status === 'APPROVED' ? 'success' : sample.status === 'REJECTED' ? 'error' : sample.status === 'TESTED' ? 'warning' : 'default'} label={sample.status} /></TableCell>
              <TableCell sx={{ minWidth: 180 }}><Stack spacing={.3}>{parameters.filter(([key]) => sample.measurements[key] !== undefined).map(([key, en, bnLabel]) => <Typography key={key} fontSize={10} noWrap>{bn ? bnLabel : en}: <strong>{sample.measurements[key]}%</strong></Typography>)}</Stack></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Stack direction="row" spacing={.5} justifyContent="flex-end">
                {sample.status === 'SAMPLE' && <Button size="small" variant="contained" onClick={() => openResults(sample)}>{t.enterResults}</Button>}
                {sample.status === 'TESTED' && <>
                  <Button size="small" color="success" variant="contained" disabled={actionBusyId === sample.id} onClick={() => decide(sample, 'ACCEPT')}>{t.accept}</Button>
                  <Button size="small" color="error" variant="outlined" disabled={actionBusyId === sample.id} onClick={() => decide(sample, 'REJECT')}>{t.reject}</Button>
                </>}
              </Stack></TableCell>
            </TableRow>)}</TableBody>
          </Table></Box>}
    </Paper>

    <FormDialog
      open={Boolean(selected)}
      onClose={() => setSelected(null)}
      onSubmit={submitResults}
      title={`${t.recordResults}${selected ? ` · ${selected.sampleNumber}` : ''}`}
      subtitle={bn ? 'অন্তত একটি মানদণ্ডের ফলাফল (%) প্রদান করুন' : 'Enter at least one laboratory test parameter (%)'}
      error={formError}
      onClearError={() => setFormError('')}
      loading={saving}
      submitLabel={t.saveResults}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={3}>
        {parameters.map(([key, english, bangla]) => (
          <AppTextField
            key={key}
            fieldName={key}
            type="number"
            unit="%"
            label={bn ? bangla : english}
            value={values[key] ?? ''}
            errorText={fieldErrors[key]}
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            onValueChange={v => {
              setValues(current => ({ ...current, [key]: v }));
              setFieldErrors(p => ({ ...p, [key]: '' }));
            }}
          />
        ))}
      </FormGrid>
      <AppTextField fieldName="comments" label={t.comments} value={comments} onValueChange={setComments} multiline minRows={2} />
    </FormDialog>
  </Stack>;
}
