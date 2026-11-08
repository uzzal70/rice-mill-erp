'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  const [financialError, setFinancialError] = useState('');
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
    if (financialQuery.data) setFinancial(financialQuery.data);
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
      onSaved(t.created);
    },
    onError: error => setFormError(messageOf(error, t.failed)),
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
      onSaved(t.updated);
    },
    onError: error => setFinancialError(messageOf(error, t.financialRequired)),
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
    onError: error => setStatusError(messageOf(error, t.statusError)),
  });

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    createMutation.mutate();
  }
  function submitCommission(event: FormEvent) {
    event.preventDefault();
    setFinancialError('');
    updateCommissionMutation.mutate();
  }
  function openCommission(broker: Broker) {
    setSelectedBroker(broker);
    setFinancial(null);
    setFinancialError('');
    setCommissionOpen(true);
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;
  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={13}>{t.subtitle}</Typography></Box>
      <Button variant="contained" onClick={() => { setForm(blank); setFormError(''); setOpen(true); }}>{t.add}</Button>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField size="small" fullWidth value={search} placeholder={language === 'bn' ? 'নাম, কোড বা মোবাইল খুঁজুন' : 'Search name, code, or mobile'} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{t.status}</InputLabel>
        <Select label={t.status} value={activeFilter} onChange={event => { setActiveFilter(event.target.value as typeof activeFilter); setPage(1); }}>
          <MenuItem value="all">{t.all}</MenuItem><MenuItem value="true">{t.active}</MenuItem><MenuItem value="false">{t.inactive}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
    {brokersQuery.error && <Alert severity="error">{messageOf(brokersQuery.error, t.failed)}</Alert>}
    {statusError && <Alert severity="error" onClose={() => setStatusError('')}>{statusError}</Alert>}
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      {brokersQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small">
          <TableHead><TableRow>{[t.name, t.code, t.phone, t.status, t.commissionType, t.actions].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {brokers.map(broker => <TableRow key={broker.id} hover>
              <TableCell>{broker.name}</TableCell><TableCell>{broker.code}</TableCell><TableCell>{broker.phone || '—'}</TableCell>
              <TableCell><Chip size="small" color={broker.active ? 'success' : 'default'} label={broker.active ? t.active : t.inactive} /></TableCell>
              <TableCell>{broker.hasCommission ? t.commissionConfigured : t.commissionMissing}</TableCell>
              <TableCell><Stack direction="row" spacing={0.5}>
                <Button size="small" onClick={() => openCommission(broker)}>{t.editCommission}</Button>
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
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{t.add}</DialogTitle>
      <Box component="form" onSubmit={submitCreate}>
        <DialogContent><Stack spacing={2}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField required label={t.name} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
          <TextField required label={t.code} value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value }))} />
          <TextField label={t.phone} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} />
          <FormControl><InputLabel>{t.commissionType}</InputLabel><Select label={t.commissionType} value={form.commissionType} onChange={event => setForm(current => ({ ...current, commissionType: event.target.value as CommissionType }))}>
            {commissionTypes.map(value => <MenuItem key={value} value={value}>{t.typeLabels[value]}</MenuItem>)}
          </Select></FormControl>
          <TextField required type="number" label={t.commissionRate} value={form.commissionRate} onChange={event => setForm(current => ({ ...current, commissionRate: event.target.value }))} inputProps={{ min: '0.0001', step: '0.0001' }} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={createMutation.isPending}>{t.save}</Button></DialogActions>
      </Box>
    </Dialog>
    <Dialog open={commissionOpen} onClose={() => { setCommissionOpen(false); setSelectedBroker(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{t.editCommission} · {selectedBroker?.name}</DialogTitle>
      <Box component="form" onSubmit={submitCommission}>
        <DialogContent><Stack spacing={2}>
          {financialQuery.error && <Alert severity="error">{messageOf(financialQuery.error, t.financialRequired)}</Alert>}
          {financialError && <Alert severity="error">{financialError}</Alert>}
          {financialQuery.isLoading || !financial ? <CircularProgress size={20} /> : <>
            <FormControl><InputLabel>{t.commissionType}</InputLabel><Select label={t.commissionType} value={financial.commissionType ?? 'PER_KG'} onChange={event => setFinancial(current => current ? ({ ...current, commissionType: event.target.value as CommissionType }) : current)}>
              {commissionTypes.map(value => <MenuItem key={value} value={value}>{t.typeLabels[value]}</MenuItem>)}
            </Select></FormControl>
            <TextField required type="number" label={t.commissionRate} value={financial.commissionRate ?? ''} onChange={event => setFinancial(current => current ? ({ ...current, commissionRate: event.target.value }) : current)} inputProps={{ min: '0.0001', step: '0.0001' }} />
          </>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => { setCommissionOpen(false); setSelectedBroker(null); }}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={financialQuery.isLoading || financialQuery.isError || !financial || updateCommissionMutation.isPending}>{t.save}</Button></DialogActions>
      </Box>
    </Dialog>
  </Stack>;
}
