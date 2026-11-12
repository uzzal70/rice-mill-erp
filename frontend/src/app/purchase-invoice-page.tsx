'use client';

import { FormEvent, useState } from 'react';
import {
  Alert, Box, Button, Chip, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';

type PurchaseInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  physicalQuantityKg: string;
  payableQuantityKg: string;
  adjustedUnitRate: string;
  grossAmount: string;
  qualityDeductionAmount: string;
  netSupplierPayable: string;
  transportCost: string;
  loadingCost: string;
  unloadingCost: string;
  otherCost: string;
  status: string;
  supplier: { name: string };
  goodsReceipt: { receiptNumber: string; purchaseOrder: { orderNumber: string; item: { name: string } } };
};
type GoodsReceipt = {
  id: string;
  receiptNumber: string;
  status: string;
  quantity: string;
  purchaseInvoice?: { id: string } | null;
  purchaseOrder: { orderNumber: string; supplier: { name: string }; item: { name: string } };
};
type ListResult<T> = { data: T[] };
type InvoiceForm = {
  invoiceNumber: string;
  invoiceDate: string;
  qualityDeductionAmount: string;
  transportCost: string;
  loadingCost: string;
  unloadingCost: string;
  otherCost: string;
};

const emptyForm = (): InvoiceForm => ({
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  qualityDeductionAmount: '0',
  transportCost: '0',
  loadingCost: '0',
  unloadingCost: '0',
  otherCost: '0',
});

const labels = {
  en: {
    title: 'Purchase invoices', subtitle: 'One supplier invoice per posted GRN. Manual quality deduction reduces supplier payable; other costs are captured separately.',
    loading: 'Loading purchase invoices...', noCompany: 'Select a company and factory to view invoices.',
    receipt: 'Posted GRN', invoice: 'Invoice no.', date: 'Invoice date', supplier: 'Supplier', paddy: 'Paddy',
    physical: 'Physical KG', payable: 'Payable KG', rate: 'Adjusted rate / KG', gross: 'Gross amount',
    qualityDeduction: 'Quality deduction', netPayable: 'Net supplier payable', transport: 'Transport cost',
    loadingCost: 'Loading cost', unloading: 'Unloading cost', otherCost: 'Other cost', separateCosts: 'Separate operating costs',
    status: 'Status', actions: 'Actions', create: 'Create invoice', editTitle: 'Create invoice for posted GRN',
    save: 'Save draft', cancel: 'Cancel', approve: 'Approve', post: 'Post invoice',
    noEligible: 'No posted GRNs are waiting for an invoice.', noInvoices: 'No purchase invoices found.',
    forbidden: 'Financial permission is required to manage purchase invoices.', saved: 'Purchase invoice created.',
    costsHelp: 'Captured as separate costs; they do not increase or reduce supplier payable.',
    invalidDeduction: 'Quality deduction must be lower than the moisture-adjusted gross amount.',
  },
  bn: {
    title: 'ক্রয় ইনভয়েস', subtitle: 'প্রতিটি পোস্টকৃত GRN-এর জন্য একটি সরবরাহকারী ইনভয়েস। মানজনিত কর্তন প্রদেয় কমায়; অন্যান্য খরচ আলাদাভাবে সংরক্ষিত হয়।',
    loading: 'ক্রয় ইনভয়েস লোড হচ্ছে...', noCompany: 'ইনভয়েস দেখতে কোম্পানি ও কারখানা নির্বাচন করুন।',
    receipt: 'পোস্টকৃত GRN', invoice: 'ইনভয়েস নং', date: 'ইনভয়েস তারিখ', supplier: 'সরবরাহকারী', paddy: 'ধান',
    physical: 'ভৌত কেজি', payable: 'প্রদেয় কেজি', rate: 'সমন্বিত দর / কেজি', gross: 'মোট মূল্য',
    qualityDeduction: 'মানজনিত কর্তন', netPayable: 'নিট সরবরাহকারী প্রদেয়', transport: 'পরিবহন খরচ',
    loadingCost: 'লোডিং খরচ', unloading: 'আনলোডিং খরচ', otherCost: 'অন্যান্য খরচ', separateCosts: 'আলাদা পরিচালন খরচ',
    status: 'অবস্থা', actions: 'কার্যক্রম', create: 'ইনভয়েস তৈরি', editTitle: 'পোস্টকৃত GRN-এর ইনভয়েস তৈরি',
    save: 'খসড়া সংরক্ষণ', cancel: 'বাতিল', approve: 'অনুমোদন', post: 'ইনভয়েস পোস্ট',
    noEligible: 'ইনভয়েসের অপেক্ষায় কোনো পোস্টকৃত GRN নেই।', noInvoices: 'কোনো ক্রয় ইনভয়েস নেই।',
    forbidden: 'ক্রয় ইনভয়েস পরিচালনায় আর্থিক অনুমতি প্রয়োজন।', saved: 'ক্রয় ইনভয়েস তৈরি হয়েছে।',
    costsHelp: 'আলাদা খরচ হিসেবে সংরক্ষিত; সরবরাহকারী প্রদেয় বৃদ্ধি বা হ্রাস করে না।',
    invalidDeduction: 'মানজনিত কর্তন আর্দ্রতা-সমন্বিত মোট মূল্যের চেয়ে কম হতে হবে।',
  },
} as const;

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function money(value: string) {
  return `৳ ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PurchaseInvoicePage({
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
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });
  const invoicesQuery = useQuery({
    queryKey: ['purchase-invoices', companyId, factoryId],
    queryFn: () => apiRequest<ListResult<PurchaseInvoice>>(`/purchase-invoices?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });
  const receiptsQuery = useQuery({
    queryKey: ['purchase-invoice-grns', companyId, factoryId],
    queryFn: () => apiRequest<ListResult<GoodsReceipt>>(`/goods-receipts?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });
  const invoices = invoicesQuery.data?.data ?? [];
  const eligibleReceipts = (receiptsQuery.data?.data ?? []).filter(row => row.status === 'POSTED' && !row.purchaseInvoice);

  function startInvoice(row: GoodsReceipt) {
    setDialogError('');
    setFieldErrors({});
    setForm(emptyForm());
    setReceipt(row);
  }

  async function createInvoice(event: FormEvent) {
    event.preventDefault();
    if (!receipt) return;
    const validation = validateFormFields(
      [
        { name: 'invoiceNumber', label: t.invoice, value: form.invoiceNumber, required: true },
        { name: 'invoiceDate', label: t.date, value: form.invoiceDate, required: true, type: 'date' },
        { name: 'qualityDeductionAmount', label: t.qualityDeduction, value: form.qualityDeductionAmount, required: true, type: 'nonNegativeNumber', min: 0 },
        { name: 'transportCost', label: t.transport, value: form.transportCost, type: 'nonNegativeNumber', min: 0 },
        { name: 'loadingCost', label: t.loadingCost, value: form.loadingCost, type: 'nonNegativeNumber', min: 0 },
        { name: 'unloadingCost', label: t.unloading, value: form.unloadingCost, type: 'nonNegativeNumber', min: 0 },
        { name: 'otherCost', label: t.otherCost, value: form.otherCost, type: 'nonNegativeNumber', min: 0 },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setDialogError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setDialogError('');
    setFieldErrors({});
    setSaving(true);
    try {
      await apiRequest('/purchase-invoices', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          goodsReceiptId: receipt.id,
          ...form,
          invoiceNumber: form.invoiceNumber.trim(),
        }),
      });
      setReceipt(null);
      onSaved(t.saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-invoices', companyId, factoryId] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-invoice-grns', companyId, factoryId] }),
      ]);
    } catch (reason) {
      const msg = extractApiError(reason, t.invalidDeduction);
      setDialogError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function action(invoice: PurchaseInvoice, operation: 'approve' | 'post') {
    setError('');
    setActionBusyId(invoice.id);
    try {
      await apiRequest(`/purchase-invoices/${encodeURIComponent(invoice.id)}/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      onSaved(operation === 'approve' ? (bn ? 'ইনভয়েস অনুমোদিত হয়েছে।' : 'Invoice approved.') : (bn ? 'ইনভয়েস পোস্ট হয়েছে।' : 'Invoice posted.'));
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices', companyId, factoryId] });
    } catch (reason) {
      const msg = extractApiError(reason, t.forbidden);
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }

  if (!companyId || !factoryId) return <Alert severity="info">{t.noCompany}</Alert>;
  if (invoicesQuery.isLoading || receiptsQuery.isLoading) return <Typography color="text.secondary">{t.loading}</Typography>;

  return <Stack spacing={2}>
    {(invoicesQuery.isError || receiptsQuery.isError) && <Alert severity="error">{extractApiError(invoicesQuery.error ?? receiptsQuery.error, t.forbidden)}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={2}>
        <Box><Typography fontWeight={800}>{t.title}</Typography><Typography color="text.secondary" fontSize={12}>{t.subtitle}</Typography></Box>
      </Stack>
      <Typography fontWeight={700} fontSize={13} mb={1}>{t.receipt}</Typography>
      <Table size="small" sx={{ minWidth: 750 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.receipt}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.supplier}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.paddy}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.physical}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.actions}</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {eligibleReceipts.map(row => <TableRow key={row.id}>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.receiptNumber}</TableCell>
            <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={row.purchaseOrder.supplier.name}>{row.purchaseOrder.supplier.name}</Typography></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.purchaseOrder.item.name}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.quantity} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Button size="small" variant="outlined" onClick={() => startInvoice(row)}>{t.create}</Button></TableCell>
          </TableRow>)}
          {!eligibleReceipts.length && <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 2 }}>{t.noEligible}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
    <Paper className="workspace-card" elevation={0} sx={{ p: 2, overflowX: 'auto' }}>
      <Typography fontWeight={700} fontSize={13} mb={1}>{invoices.length} invoices</Typography>
      <Table size="small" sx={{ minWidth: 1450 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.invoice}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.date}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.receipt}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.supplier}</TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.paddy}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.physical}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.payable}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.rate}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.gross}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.qualityDeduction}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.netPayable}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.separateCosts}</TableCell>
          <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>{t.status}</TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t.actions}</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {invoices.map(invoice => <TableRow key={invoice.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>{invoice.invoiceNumber}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
            <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{invoice.goodsReceipt.receiptNumber}</TableCell>
            <TableCell sx={{ maxWidth: 190 }}><Typography variant="body2" fontWeight={600} noWrap title={invoice.supplier.name}>{invoice.supplier.name}</Typography></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{invoice.goodsReceipt.purchaseOrder.item.name}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(invoice.physicalQuantityKg).toLocaleString()} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{Number(invoice.payableQuantityKg).toLocaleString()} KG</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(invoice.adjustedUnitRate)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(invoice.grossAmount)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{money(invoice.qualityDeductionAmount)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'primary.dark' }}>{money(invoice.netSupplierPayable)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{money(String(Number(invoice.transportCost) + Number(invoice.loadingCost) + Number(invoice.unloadingCost) + Number(invoice.otherCost)))}</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" label={invoice.status} color={invoice.status === 'POSTED' ? 'success' : invoice.status === 'APPROVED' ? 'info' : 'default'} /></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{invoice.status === 'DRAFT' ? <Button size="small" variant="outlined" disabled={actionBusyId === invoice.id} onClick={() => action(invoice, 'approve')}>{t.approve}</Button> : invoice.status === 'APPROVED' ? <Button size="small" variant="contained" disabled={actionBusyId === invoice.id} onClick={() => action(invoice, 'post')}>{t.post}</Button> : '—'}</TableCell>
          </TableRow>)}
          {!invoices.length && <TableRow><TableCell colSpan={14} align="center" sx={{ color: 'text.secondary', py: 3 }}>{t.noInvoices}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
    <FormDialog
      open={Boolean(receipt)}
      onClose={() => setReceipt(null)}
      onSubmit={createInvoice}
      title={`${t.editTitle} · ${receipt?.receiptNumber ?? ''}`}
      subtitle={receipt ? `${receipt.purchaseOrder.supplier.name} · ${receipt.purchaseOrder.item.name} (${receipt.quantity} KG)` : undefined}
      error={dialogError}
      onClearError={() => setDialogError('')}
      loading={saving}
      submitLabel={t.save}
      cancelLabel={t.cancel}
      maxWidth="md"
    >
      <FormGrid columns={3}>
        <AppTextField fieldName="invoiceNumber" required label={t.invoice} value={form.invoiceNumber} errorText={fieldErrors.invoiceNumber} onValueChange={v => { setForm({ ...form, invoiceNumber: v }); setFieldErrors(p => ({ ...p, invoiceNumber: '' })); }} />
        <AppTextField fieldName="invoiceDate" required type="date" label={t.date} value={form.invoiceDate} errorText={fieldErrors.invoiceDate} onValueChange={v => { setForm({ ...form, invoiceDate: v }); setFieldErrors(p => ({ ...p, invoiceDate: '' })); }} />
        <AppTextField fieldName="qualityDeductionAmount" required prefixText="৳" type="number" inputProps={{ min: 0, step: 0.01 }} label={t.qualityDeduction} value={form.qualityDeductionAmount} errorText={fieldErrors.qualityDeductionAmount} onValueChange={v => { setForm({ ...form, qualityDeductionAmount: v }); setFieldErrors(p => ({ ...p, qualityDeductionAmount: '' })); }} />
      </FormGrid>
      <FormSection title={bn ? 'পৃথক পরিবহন ও হ্যান্ডলিং খরচ' : 'Separate Operating Costs'} subtitle={t.costsHelp}>
        <FormGrid columns={{ xs: 1, sm: 2, md: 4 }}>
          <AppTextField fieldName="transportCost" prefixText="৳" type="number" inputProps={{ min: 0, step: 0.01 }} label={t.transport} value={form.transportCost} errorText={fieldErrors.transportCost} onValueChange={v => { setForm({ ...form, transportCost: v }); setFieldErrors(p => ({ ...p, transportCost: '' })); }} />
          <AppTextField fieldName="loadingCost" prefixText="৳" type="number" inputProps={{ min: 0, step: 0.01 }} label={t.loadingCost} value={form.loadingCost} errorText={fieldErrors.loadingCost} onValueChange={v => { setForm({ ...form, loadingCost: v }); setFieldErrors(p => ({ ...p, loadingCost: '' })); }} />
          <AppTextField fieldName="unloadingCost" prefixText="৳" type="number" inputProps={{ min: 0, step: 0.01 }} label={t.unloading} value={form.unloadingCost} errorText={fieldErrors.unloadingCost} onValueChange={v => { setForm({ ...form, unloadingCost: v }); setFieldErrors(p => ({ ...p, unloadingCost: '' })); }} />
          <AppTextField fieldName="otherCost" prefixText="৳" type="number" inputProps={{ min: 0, step: 0.01 }} label={t.otherCost} value={form.otherCost} errorText={fieldErrors.otherCost} onValueChange={v => { setForm({ ...form, otherCost: v }); setFieldErrors(p => ({ ...p, otherCost: '' })); }} />
        </FormGrid>
      </FormSection>
    </FormDialog>
  </Stack>;
}
