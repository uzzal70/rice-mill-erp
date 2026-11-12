'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';

type Broker = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  active: boolean;
  hasCommission: boolean;
};
type CommissionType = 'PER_KG' | 'PER_MON' | 'PER_TON' | 'PERCENTAGE' | 'FIXED_AMOUNT';
type BrokerFinancial = { id: string; type: 'BROKER'; commissionType: CommissionType | null; commissionRate: string | null };
type BrokerForm = { name: string; code: string; phone: string; commissionType: CommissionType; commissionRate: string };
const blank: BrokerForm = { name: '', code: '', phone: '', commissionType: 'PER_KG', commissionRate: '' };
const commissionTypes: CommissionType[] = ['PER_KG', 'PER_MON', 'PER_TON', 'PERCENTAGE', 'FIXED_AMOUNT'];

const labels = {
  en: {
    title: 'Broker master', subtitle: 'Maintain brokers and their protected commission terms.',
    add: 'Add broker', editCommission: 'Commission terms', name: 'Broker name', code: 'Broker code',
    phone: 'Mobile', commissionType: 'Commission basis', commissionRate: 'Commission rate',
    status: 'Status', active: 'Active', inactive: 'Inactive', actions: 'Actions',
    save: 'Save', cancel: 'Cancel', loading: 'Loading brokers...', noRows: 'No brokers found.',
    failed: 'Could not load brokers.', noCompany: 'Select a company to manage brokers.',
    all: 'All statuses', page: 'Page', previous: 'Previous', next: 'Next', activate: 'Activate', deactivate: 'Deactivate',
    typeLabels: { PER_KG: 'Per KG', PER_MON: 'Per Mon', PER_TON: 'Per Ton', PERCENTAGE: 'Percentage', FIXED_AMOUNT: 'Fixed amount' },
    commissionConfigured: 'Configured', commissionMissing: 'Not configured',
    created: 'Broker created.', updated: 'Broker updated.', statusError: 'Could not change broker status.', financialRequired: 'Financial permission is required to view or change commission terms.',
  },
  bn: {
    title: 'ব্রোকার মাস্টার', subtitle: 'ব্রোকার ও সুরক্ষিত কমিশন শর্ত পরিচালনা করুন।',
    add: 'ব্রোকার যোগ', editCommission: 'কমিশন শর্ত', name: 'ব্রোকারের নাম', code: 'ব্রোকার কোড',
    phone: 'মোবাইল', commissionType: 'কমিশনের ভিত্তি', commissionRate: 'কমিশনের হার',
    status: 'অবস্থা', active: 'সক্রিয়', inactive: 'নিষ্ক্রিয়', actions: 'কার্যক্রম',
    save: 'সংরক্ষণ', cancel: 'বাতিল', loading: 'ব্রোকার লোড হচ্ছে...', noRows: 'কোনো ব্রোকার পাওয়া যায়নি।',
    failed: 'ব্রোকার লোড করা যায়নি।', noCompany: 'ব্রোকার পরিচালনায় কোম্পানি নির্বাচন করুন।',
    all: 'সব অবস্থা', page: 'পৃষ্ঠা', previous: 'আগে', next: 'পরে', activate: 'সক্রিয় করুন', deactivate: 'নিষ্ক্রিয় করুন',
    typeLabels: { PER_KG: 'প্রতি কেজি', PER_MON: 'প্রতি মণ', PER_TON: 'প্রতি টন', PERCENTAGE: 'শতাংশ', FIXED_AMOUNT: 'নির্দিষ্ট অঙ্ক' },
    commissionConfigured: 'নির্ধারিত', commissionMissing: 'নির্ধারিত নয়',
    created: 'ব্রোকার তৈরি হয়েছে।', updated: 'ব্রোকার হালনাগাদ হয়েছে।', statusError: 'ব্রোকারের অবস্থা পরিবর্তন করা যায়নি।', financialRequired: 'কমিশন শর্ত দেখতে বা পরিবর্তনে আর্থিক অনুমতি প্রয়োজন।',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function BrokerMasterPage({
  companyId,
  language,
  onSaved,
}: {
  companyId: string;
  language: 'en' | 'bn';
  onSaved: (message: string) => void;
}) {
  const t = labels[language];
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [form, setForm] = useState<BrokerForm>(blank);
  const [financial, setFinancial] = useState<BrokerFinancial | null>(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [financialError, setFinancialError] = useState('');
  const [financialFieldError, setFinancialFieldError] = useState('');
  const [statusError, setStatusError] = useState('');
  const brokersQuery = useQuery({
    queryKey: ['broker-master', companyId, search, activeFilter, page],
    queryFn: () => apiRequest<Broker[]>(`/partners?${queryString({
      companyId, type: 'BROKER', search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter, page, pageSize: 50,
    })}`),
    enabled: Boolean(companyId),
  });
  const financialQuery = useQuery({
    queryKey: ['broker-financial', companyId, selectedBroker?.id],
    queryFn: () => apiRequest<BrokerFinancial>(`/partners/${encodeURIComponent(selectedBroker!.id)}/financial?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId && selectedBroker),
  });
  useEffect(() => {
    if (financialQuery.data) {
      setFinancial({
        ...financialQuery.data,
        commissionType: financialQuery.data.commissionType ?? 'PER_KG',
      });
    }
  }, [financialQuery.data]);
  const brokers = brokersQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['broker-master', companyId] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest('/partners/brokers', {
      method: 'POST',
      body: JSON.stringify({
        companyId, type: 'BROKER', name: form.name.trim(), code: form.code.trim().toUpperCase(),
        phone: form.phone.trim() || undefined, commissionType: form.commissionType, commissionRate: form.commissionRate,
      }),
    }),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
      setForm(blank);
      setFieldErrors({});
      onSaved(t.created);
    },
    onError: error => {
      const msg = extractApiError(error, t.failed);
      setFormError(msg);
      toast.error(msg);
    },
  });
  const updateCommissionMutation = useMutation({
    mutationFn: () => {
      if (!selectedBroker || !financial?.commissionType || financial.commissionRate == null) throw new Error(t.financialRequired);
      return apiRequest(`/partners/${encodeURIComponent(selectedBroker.id)}/financial`, {
        method: 'PUT',
        body: JSON.stringify({
          companyId,
          commissionType: financial.commissionType,
          commissionRate: financial.commissionRate,
        }),
      });
    },
    onSuccess: async () => {
      await invalidate();
      setCommissionOpen(false);
      setSelectedBroker(null);
      setFinancialFieldError('');
      onSaved(t.updated);
    },
    onError: error => {
      const msg = extractApiError(error, t.financialRequired);
      setFinancialError(msg);
      toast.error(msg);
    },
  });
  const statusMutation = useMutation({
    mutationFn: (broker: Broker) => apiRequest(`/partners/${encodeURIComponent(broker.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ companyId, active: !broker.active }),
    }),
    onSuccess: async () => {
      await invalidate();
      onSaved(t.updated);
    },
    onError: error => {
      const msg = extractApiError(error, t.statusError);
      setStatusError(msg);
      toast.error(msg);
    },
  });

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'name', label: t.name, value: form.name, required: true },
        { name: 'code', label: t.code, value: form.code, required: true },
        { name: 'commissionType', label: t.commissionType, value: form.commissionType, required: true, isSelect: true },
        { name: 'commissionRate', label: t.commissionRate, value: form.commissionRate, required: true, type: 'positiveNumber' },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setFormError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setFormError('');
    setFieldErrors({});
    createMutation.mutate();
  }
  function submitCommission(event: FormEvent) {
    event.preventDefault();
    const validation = validateFormFields(
      [{ name: 'finCommissionRate', label: t.commissionRate, value: financial?.commissionRate ?? '', required: true, type: 'positiveNumber' }],
      language,
    );
    if (!validation.valid) {
      setFinancialFieldError(validation.errors.finCommissionRate ?? '');
      setFinancialError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName('finCommissionRate');
      return;
    }
    setFinancialError('');
    setFinancialFieldError('');
    updateCommissionMutation.mutate();
  }
  function openCommission(broker: Broker) {
    setSelectedBroker(broker);
    setFinancial(null);
    setFinancialError('');
    setFinancialFieldError('');
    setCommissionOpen(true);
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;
  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Button variant="contained" onClick={() => { setForm(blank); setFormError(''); setFieldErrors({}); setOpen(true); }}>{t.add}</Button>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <AppTextField fieldName="search" value={search} placeholder={language === 'bn' ? 'নাম, কোড বা মোবাইল খুঁজুন' : 'Search name, code, or mobile'} onValueChange={v => { setSearch(v); setPage(1); }} />
      <Box sx={{ minWidth: 160 }}>
        <AppSelect
          name="filter"
          label={t.status}
          value={activeFilter}
          onChange={v => { setActiveFilter(v as typeof activeFilter); setPage(1); }}
          options={[
            { value: 'all', label: t.all },
            { value: 'true', label: t.active },
            { value: 'false', label: t.inactive },
          ]}
        />
      </Box>
    </Stack>
    {brokersQuery.error && <Alert severity="error">{extractApiError(brokersQuery.error, t.failed)}</Alert>}
    {statusError && <Alert severity="error" onClose={() => setStatusError('')}>{statusError}</Alert>}
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {brokersQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small" sx={{ minWidth: 850 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.phone, align: 'left' },
            { label: t.status, align: 'center' },
            { label: t.commissionType, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {brokers.map(broker => <TableRow key={broker.id} hover>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={broker.name}>{broker.name}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{broker.code}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{broker.phone || '—'}</TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={broker.active ? 'success' : 'default'} label={broker.active ? t.active : t.inactive} /></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{broker.hasCommission ? <Chip size="small" variant="outlined" color="success" label={t.commissionConfigured} /> : <Chip size="small" variant="outlined" color="warning" label={t.commissionMissing} />}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Button size="small" variant="outlined" onClick={() => openCommission(broker)}>{t.editCommission}</Button>
                <Button size="small" color={broker.active ? 'warning' : 'success'} disabled={statusMutation.isPending} onClick={() => { setStatusError(''); statusMutation.mutate(broker); }}>{broker.active ? t.deactivate : t.activate}</Button>
              </Stack></TableCell>
            </TableRow>)}
            {!brokers.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>}
    </Paper>
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
      <Typography variant="caption">{t.page} {page}</Typography>
      <Button size="small" disabled={page === 1 || brokersQuery.isFetching} onClick={() => setPage(current => current - 1)}>{t.previous}</Button>
      <Button size="small" disabled={brokers.length < 50 || brokersQuery.isFetching} onClick={() => setPage(current => current + 1)}>{t.next}</Button>
    </Stack>
    <FormDialog
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={submitCreate}
      title={t.add}
      error={formError}
      onClearError={() => setFormError('')}
      loading={createMutation.isPending}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="sm"
    >
      <FormGrid columns={2}>
        <AppTextField fieldName="name" required label={t.name} value={form.name} errorText={fieldErrors.name} onValueChange={v => { setForm(c => ({ ...c, name: v })); setFieldErrors(p => ({ ...p, name: '' })); }} />
        <AppTextField fieldName="code" required label={t.code} value={form.code} errorText={fieldErrors.code} onValueChange={v => { setForm(c => ({ ...c, code: v })); setFieldErrors(p => ({ ...p, code: '' })); }} />
        <AppTextField fieldName="phone" label={t.phone} placeholder="01XXXXXXXXX" value={form.phone} onValueChange={v => setForm(c => ({ ...c, phone: v }))} />
        <AppSelect
          fieldName="commissionType"
          label={t.commissionType}
          required
          value={form.commissionType}
          onChange={v => { setForm(c => ({ ...c, commissionType: v as CommissionType })); setFieldErrors(p => ({ ...p, commissionType: '' })); }}
          options={commissionTypes.map(v => ({ value: v, label: t.typeLabels[v] }))}
          errorText={fieldErrors.commissionType}
        />
        <AppTextField fieldName="commissionRate" required type="number" label={t.commissionRate} value={form.commissionRate} errorText={fieldErrors.commissionRate} inputProps={{ min: '0.0001', step: '0.0001' }} onValueChange={v => { setForm(c => ({ ...c, commissionRate: v })); setFieldErrors(p => ({ ...p, commissionRate: '' })); }} />
      </FormGrid>
    </FormDialog>
    <FormDialog
      open={commissionOpen}
      onClose={() => { setCommissionOpen(false); setSelectedBroker(null); }}
      onSubmit={submitCommission}
      title={`${t.editCommission} · ${selectedBroker?.name ?? ''}`}
      error={financialError || (financialQuery.error ? extractApiError(financialQuery.error, t.financialRequired) : '')}
      onClearError={() => setFinancialError('')}
      loading={updateCommissionMutation.isPending}
      submitDisabled={financialQuery.isLoading || financialQuery.isError || !financial}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="sm"
    >
      {financialQuery.isLoading || !financial ? (
        <Stack direction="row" spacing={1} alignItems="center" py={2}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">Loading commission terms...</Typography>
        </Stack>
      ) : (
        <FormGrid columns={2}>
          <AppSelect
            fieldName="finCommissionType"
            label={t.commissionType}
            required
            value={financial.commissionType ?? 'PER_KG'}
            onChange={v => setFinancial(c => c ? ({ ...c, commissionType: v as CommissionType }) : c)}
            options={commissionTypes.map(v => ({ value: v, label: t.typeLabels[v] }))}
          />
          <AppTextField
            fieldName="finCommissionRate"
            required
            type="number"
            label={t.commissionRate}
            value={financial.commissionRate ?? ''}
            errorText={financialFieldError}
            inputProps={{ min: '0.0001', step: '0.0001' }}
            onValueChange={v => { setFinancial(c => c ? ({ ...c, commissionRate: v }) : c); setFinancialFieldError(''); }}
          />
        </FormGrid>
      )}
    </FormDialog>
  </Stack>;
}
