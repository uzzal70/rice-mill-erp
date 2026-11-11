'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type PartnerType = 'SUPPLIER' | 'FARMER' | 'CUSTOMER';
type Partner = {
  id: string;
  type: PartnerType;
  name: string;
  code: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  nid: string | null;
  tin: string | null;
  bin: string | null;
  active: boolean;
  hasBankAccount: boolean;
  hasOpeningBalance: boolean;
};
type ProfileForm = {
  name: string;
  code: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  nid: string;
  tin: string;
  bin: string;
  active: boolean;
};
type FinancialForm = {
  bankName: string;
  bankAccount: string;
  paymentMethod: string;
  creditLimit: string;
  paymentTermsDays: string;
  openingBalance: string;
};
type PartnerFinancial = {
  id: string;
  type: PartnerType;
  bankName: string | null;
  bankAccount: string | null;
  paymentMethod: string | null;
  creditLimit: string | null;
  paymentTermsDays: number | null;
  openingBalance: string;
};
type PartnerLedger = {
  partner: { id: string; type: PartnerType; openingBalance: string };
  purchases: {
    postedReceiptCount: number;
    receivedQuantityKg: string;
    grossPurchaseAmount: string;
    postedInvoiceCount: number;
    invoicedGrossAmount: string;
    qualityDeductionAmount: string;
    netSupplierPayable: string;
    separateOperatingCosts: string;
  };
  data: Array<{
    id: string;
    receiptNumber: string;
    postedAt: string | null;
    quantity: string;
    payableQuantity: string;
    unit: string;
    purchaseOrderNumber: string;
    unitRate: string;
    grossAmount: string;
    purchaseInvoice: { invoiceNumber: string; grossAmount: string; qualityDeductionAmount: string; netSupplierPayable: string; operatingCosts: string } | null;
    item: { id: string; name: string; code: string };
    factory: { id: string; name: string; code: string };
  }>;
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};

type CustomerLedger = {
  partner: {
    id: string;
    name: string;
    businessName: string | null;
    code: string;
    phone: string | null;
    creditLimit: string | null;
    paymentTermsDays: number | null;
    openingBalance: string;
  };
  summary: {
    openingBalance: string;
    totalApprovedOrders: string;
    totalInvoiced: string;
    totalPaid: string;
    totalDue: string;
    availableCredit: string | null;
  };
  data: Array<{
    id: string;
    orderNumber: string;
    channel: string;
    status: string;
    currency: string;
    totalAmount: string;
    createdAt: string;
    factory: { id: string; name: string; code: string };
    lines: Array<{
      id: string;
      quantityKg: string;
      unitRate: string;
      lineAmount: string;
      item: { name: string; code: string };
      stack: { code: string };
    }>;
  }>;
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};

const blankProfile: ProfileForm = {
  name: '', code: '', businessName: '', phone: '', email: '', address: '', nid: '', tin: '', bin: '', active: true,
};
const blankFinancial: FinancialForm = {
  bankName: '', bankAccount: '', paymentMethod: '', creditLimit: '', paymentTermsDays: '', openingBalance: '0',
};

const labels = {
  en: {
    title: 'Supplier & farmer master',
    subtitle: 'Maintain company-scoped supplier and farmer identity, payment defaults, and credit settings.',
    supplier: 'Suppliers',
    farmer: 'Farmers',
    customer: 'Customers',
    add: 'Add record',
    edit: 'Edit record',
    name: 'Name',
    code: 'Code',
    businessName: 'Business name',
    phone: 'Mobile',
    email: 'Email',
    address: 'Address',
    nid: 'NID',
    tin: 'TIN',
    bin: 'BIN',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    bankName: 'Bank name',
    bankAccount: 'Bank account',
    paymentMethod: 'Payment method',
    creditLimit: 'Credit limit (BDT)',
    paymentTerms: 'Payment terms (days)',
    openingBalance: 'Opening balance (BDT)',
    financial: 'Financial details',
    ledger: 'Purchase ledger',
    postedPurchases: 'Posted purchase total (gross)',
    invoicePayable: 'Posted supplier invoice payable',
    qualityDeductions: 'Quality deductions',
    separateCosts: 'Separate operating costs',
    postedInvoices: 'Posted invoices',
    receivedQuantity: 'Received quantity',
    opening: 'Opening balance',
    postedReceipts: 'Posted receipts',
    receipt: 'GRN',
    invoice: 'Invoice',
    purchaseOrder: 'Purchase order',
    factory: 'Factory',
    material: 'Paddy',
    quantity: 'Quantity',
    payableQuantity: 'Payable KG',
    rate: 'Rate / KG',
    amount: 'Gross amount (BDT)',
    postedAt: 'Posted at',
    ledgerScope: 'Posted GRN value uses the PO moisture-adjusted quantity and rate. Posted invoices subtract manual quality deductions from supplier payable; transport/loading/unloading/other charges remain separate. Payments and final outstanding balance are not included.',
    ledgerFailed: 'Could not load posted purchase history.',
    save: 'Save',
    cancel: 'Cancel',
    actions: 'Actions',
    loading: 'Loading records...',
    noRows: 'No matching records.',
    failed: 'Could not load partner records.',
    noCompany: 'Select a company to manage suppliers and farmers.',
    financialForbidden: 'Financial permission is required to view or edit these details.',
    profileSaved: 'Partner profile saved.',
    financialSaved: 'Financial defaults saved.',
    all: 'All statuses',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    customerLedger: 'Sales ledger',
    customerStatement: 'Customer statement & sales ledger',
    customerLedgerScope: 'Customer statement tracks opening due, approved sales orders, credit limit, and current outstanding balance.',
    totalApprovedOrders: 'Total approved orders',
    totalDue: 'Total outstanding due',
    availableCredit: 'Available credit limit',
    orderNo: 'Order No.',
    channel: 'Channel',
    items: 'Items',
  },
  bn: {
    title: 'সরবরাহকারী ও কৃষক মাস্টার',
    subtitle: 'কোম্পানিভিত্তিক পরিচিতি, পেমেন্টের ডিফল্ট ও ক্রেডিট সেটিংস পরিচালনা করুন।',
    supplier: 'সরবরাহকারী',
    farmer: 'কৃষক',
    customer: 'ক্রেতা',
    add: 'রেকর্ড যোগ',
    edit: 'রেকর্ড সম্পাদনা',
    name: 'নাম',
    code: 'কোড',
    businessName: 'ব্যবসার নাম',
    phone: 'মোবাইল',
    email: 'ইমেইল',
    address: 'ঠিকানা',
    nid: 'এনআইডি',
    tin: 'টিআইএন',
    bin: 'বিআইএন',
    status: 'অবস্থা',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    bankName: 'ব্যাংকের নাম',
    bankAccount: 'ব্যাংক হিসাব',
    paymentMethod: 'পেমেন্ট পদ্ধতি',
    creditLimit: 'ক্রেডিট সীমা (টাকা)',
    paymentTerms: 'পেমেন্ট সময়সীমা (দিন)',
    openingBalance: 'প্রারম্ভিক ব্যালেন্স (টাকা)',
    financial: 'আর্থিক তথ্য',
    ledger: 'ক্রয় লেজার',
    postedPurchases: 'পোস্টকৃত ক্রয়ের মোট (গ্রস)',
    invoicePayable: 'পোস্টকৃত সরবরাহকারী ইনভয়েস প্রদেয়',
    qualityDeductions: 'মানজনিত কর্তন',
    separateCosts: 'আলাদা পরিচালন খরচ',
    postedInvoices: 'পোস্টকৃত ইনভয়েস',
    receivedQuantity: 'গৃহীত পরিমাণ',
    opening: 'প্রারম্ভিক ব্যালেন্স',
    postedReceipts: 'পোস্টকৃত GRN',
    receipt: 'GRN',
    invoice: 'ইনভয়েস',
    purchaseOrder: 'ক্রয় আদেশ',
    factory: 'কারখানা',
    material: 'ধান',
    quantity: 'পরিমাণ',
    payableQuantity: 'প্রদেয় কেজি',
    rate: 'দর / কেজি',
    amount: 'গ্রস পরিমাণ (টাকা)',
    postedAt: 'পোস্টের সময়',
    ledgerScope: 'পোস্টকৃত GRN-এর মূল্য আর্দ্রতা-সমন্বিত ক্রয় পরিমাণ ও দর অনুযায়ী। পোস্টকৃত ইনভয়েসে মানজনিত কর্তন সরবরাহকারী প্রদেয় থেকে বাদ হয়; পরিবহন/লোডিং/আনলোডিং/অন্যান্য খরচ আলাদা থাকে। পেমেন্ট ও চূড়ান্ত বকেয়া এতে নেই।',
    ledgerFailed: 'পোস্টকৃত ক্রয়ের ইতিহাস লোড করা যায়নি।',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    actions: 'কার্যক্রম',
    loading: 'রেকর্ড লোড হচ্ছে...',
    noRows: 'কোনো রেকর্ড পাওয়া যায়নি।',
    failed: 'পার্টনার রেকর্ড লোড করা যায়নি।',
    noCompany: 'সরবরাহকারী ও কৃষক পরিচালনায় কোম্পানি নির্বাচন করুন।',
    financialForbidden: 'এই তথ্য দেখতে বা সম্পাদনা করতে আর্থিক অনুমতি প্রয়োজন।',
    profileSaved: 'পার্টনার প্রোফাইল সংরক্ষিত হয়েছে।',
    financialSaved: 'আর্থিক ডিফল্ট সংরক্ষিত হয়েছে।',
    all: 'সব অবস্থা',
    previous: 'আগে',
    next: 'পরে',
    page: 'পৃষ্ঠা',
    customerLedger: 'বিক্রয় খতিয়ান',
    customerStatement: 'ক্রেতার হিসাব বিবরণী ও বিক্রয় খতিয়ান',
    customerLedgerScope: 'ক্রেতার হিসাব বিবরণীতে প্রারম্ভিক বকেয়া, অনুমোদিত বিক্রয় আদেশ, বাকির সীমা এবং বর্তমান নিট বকেয়া প্রতিফলিত হয়।',
    totalApprovedOrders: 'অনুমোদিত বিক্রয় আদেশ',
    totalDue: 'মোট বর্তমান বকেয়া',
    availableCredit: 'অবশিষ্ট বাকির সীমা',
    orderNo: 'আদেশ নং',
    channel: 'চ্যানেল',
    items: 'পণ্য',
  },
} as const;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function profileFrom(partner: Partner): ProfileForm {
  return {
    name: partner.name,
    code: partner.code,
    businessName: partner.businessName ?? '',
    phone: partner.phone ?? '',
    email: partner.email ?? '',
    address: partner.address ?? '',
    nid: partner.nid ?? '',
    tin: partner.tin ?? '',
    bin: partner.bin ?? '',
    active: partner.active,
  };
}

export function SupplierFarmerMasterPage({
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
  const [type, setType] = useState<PartnerType>('SUPPLIER');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(blankProfile);
  const [profileError, setProfileError] = useState('');
  const [financialPartner, setFinancialPartner] = useState<Partner | null>(null);
  const [financial, setFinancial] = useState<FinancialForm>(blankFinancial);
  const [financialError, setFinancialError] = useState('');
  const [ledgerPartner, setLedgerPartner] = useState<Partner | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);

  const partnersQuery = useQuery({
    queryKey: ['supplier-farmer-master', companyId, type, search, activeFilter, page],
    queryFn: () => apiRequest<Partner[]>(`/partners?${queryString({
      companyId,
      type,
      search: search.trim(),
      active: activeFilter === 'all' ? undefined : activeFilter,
      page,
      pageSize: 50,
    })}`),
    enabled: Boolean(companyId),
  });
  const financialQuery = useQuery({
    queryKey: ['partner-financial', companyId, financialPartner?.id],
    queryFn: () => apiRequest<PartnerFinancial>(`/partners/${encodeURIComponent(financialPartner!.id)}/financial?companyId=${encodeURIComponent(companyId)}`),
    enabled: Boolean(companyId && financialPartner),
  });
  const isCustomer = ledgerPartner?.type === 'CUSTOMER';
  const ledgerQuery = useQuery({
    queryKey: ['partner-ledger', companyId, ledgerPartner?.id, ledgerPage, isCustomer],
    queryFn: () => {
      const endpoint = isCustomer ? 'customer-ledger' : 'ledger';
      return apiRequest<any>(`/partners/${encodeURIComponent(ledgerPartner!.id)}/${endpoint}?${queryString({
        companyId,
        page: ledgerPage,
        pageSize: 25,
      })}`);
    },
    enabled: Boolean(companyId && ledgerPartner),
  });
  useEffect(() => {
    if (!financialQuery.data) return;
    setFinancial({
      bankName: financialQuery.data.bankName ?? '',
      bankAccount: financialQuery.data.bankAccount ?? '',
      paymentMethod: financialQuery.data.paymentMethod ?? '',
      creditLimit: financialQuery.data.creditLimit ?? '',
      paymentTermsDays: financialQuery.data.paymentTermsDays == null ? '' : String(financialQuery.data.paymentTermsDays),
      openingBalance: financialQuery.data.openingBalance ?? '0',
    });
  }, [financialQuery.data]);

  const partners = partnersQuery.data ?? [];
  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ['supplier-farmer-master', companyId] });
  const createMutation = useMutation({
    mutationFn: () => apiRequest('/partners', {
      method: 'POST',
      body: JSON.stringify({
        companyId,
        type,
        name: profile.name.trim(),
        code: profile.code.trim().toUpperCase(),
        businessName: profile.businessName.trim() || undefined,
        phone: profile.phone.trim() || undefined,
        email: profile.email.trim() || undefined,
        address: profile.address.trim() || undefined,
        nid: profile.nid.trim() || undefined,
        tin: profile.tin.trim() || undefined,
        bin: profile.bin.trim() || undefined,
      }),
    }),
    onSuccess: async () => {
      await invalidate();
      setProfileOpen(false);
      setProfile(blankProfile);
      onSaved(t.profileSaved);
    },
    onError: reason => setProfileError(errorText(reason, t.failed)),
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error(t.failed);
      return apiRequest(`/partners/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          companyId,
          name: profile.name.trim(),
          code: profile.code.trim().toUpperCase(),
          businessName: profile.businessName.trim(),
          phone: profile.phone.trim(),
          email: profile.email.trim() || null,
          address: profile.address.trim(),
          nid: profile.nid.trim(),
          tin: profile.tin.trim(),
          bin: profile.bin.trim(),
          active: profile.active,
        }),
      });
    },
    onSuccess: async () => {
      await invalidate();
      setProfileOpen(false);
      setEditing(null);
      onSaved(t.profileSaved);
    },
    onError: reason => setProfileError(errorText(reason, t.failed)),
  });
  const financialMutation = useMutation({
    mutationFn: () => {
      if (!financialPartner) throw new Error(t.failed);
      return apiRequest(`/partners/${encodeURIComponent(financialPartner.id)}/financial`, {
        method: 'PUT',
        body: JSON.stringify({
          companyId,
          bankName: financial.bankName.trim() || null,
          bankAccount: financial.bankAccount.trim() || null,
          paymentMethod: financial.paymentMethod.trim() || null,
          creditLimit: financial.creditLimit.trim() || null,
          paymentTermsDays: financial.paymentTermsDays.trim() ? Number(financial.paymentTermsDays) : null,
          openingBalance: financial.openingBalance.trim() || '0',
        }),
      });
    },
    onSuccess: async () => {
      await invalidate();
      setFinancialPartner(null);
      setFinancialError('');
      onSaved(t.financialSaved);
    },
    onError: reason => setFinancialError(errorText(reason, t.financialForbidden)),
  });

  function startCreate() {
    setEditing(null);
    setProfile(blankProfile);
    setProfileError('');
    setProfileOpen(true);
  }
  function startEdit(partner: Partner) {
    setEditing(partner);
    setProfile(profileFrom(partner));
    setProfileError('');
    setProfileOpen(true);
  }
  function submitProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError('');
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  }
  function submitFinancial(event: FormEvent) {
    event.preventDefault();
    setFinancialError('');
    financialMutation.mutate();
  }

  if (!companyId) return <Alert severity="info">{t.noCompany}</Alert>;

  return <Stack spacing={2.5}>
    <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
      <Box><Typography className="brand-font" variant="h5" fontWeight={800}>{type === 'CUSTOMER' ? t.customer : t.title}</Typography><Typography color="text.secondary" fontSize={13}>{type === 'CUSTOMER' ? (language === 'bn' ? 'ক্রেতার পরিচিতি, কর তথ্য, ক্রেডিট সীমা ও পেমেন্ট শর্ত পরিচালনা করুন।' : 'Maintain customer identity, tax details, credit limits, and payment terms.') : t.subtitle}</Typography></Box>
      <Button variant="contained" onClick={startCreate}>{t.add}</Button>
    </Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{language === 'bn' ? 'ধরন' : 'Partner type'}</InputLabel>
        <Select label={language === 'bn' ? 'ধরন' : 'Partner type'} value={type} onChange={event => { setType(event.target.value as PartnerType); setPage(1); }}>
          <MenuItem value="SUPPLIER">{t.supplier}</MenuItem>
          <MenuItem value="FARMER">{t.farmer}</MenuItem>
          <MenuItem value="CUSTOMER">{t.customer}</MenuItem>
        </Select>
      </FormControl>
      <TextField size="small" fullWidth value={search} placeholder={language === 'bn' ? 'নাম, কোড বা মোবাইল খুঁজুন' : 'Search name, code, or mobile'} onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{t.status}</InputLabel>
        <Select label={t.status} value={activeFilter} onChange={event => { setActiveFilter(event.target.value as typeof activeFilter); setPage(1); }}>
          <MenuItem value="all">{t.all}</MenuItem><MenuItem value="true">{t.active}</MenuItem><MenuItem value="false">{t.inactive}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
    {partnersQuery.error && <Alert severity="error">{errorText(partnersQuery.error, t.failed)}</Alert>}
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {partnersQuery.isLoading
        ? <Stack direction="row" spacing={1} alignItems="center" p={3}><CircularProgress size={18} /><Typography>{t.loading}</Typography></Stack>
        : <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead><TableRow>{[
            { label: t.name, align: 'left' },
            { label: t.code, align: 'left' },
            { label: t.businessName, align: 'left' },
            { label: t.phone, align: 'left' },
            { label: t.email, align: 'left' },
            { label: t.address, align: 'left' },
            { label: t.status, align: 'center' },
            { label: t.actions, align: 'right' },
          ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {partners.map(partner => <TableRow key={partner.id} hover>
              <TableCell sx={{ maxWidth: 190 }}><Typography variant="body2" fontWeight={600} noWrap title={partner.name}>{partner.name}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{partner.code}</TableCell>
              <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={partner.businessName || '—'}>{partner.businessName || '—'}</Typography></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{partner.phone || '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{partner.email || '—'}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap title={partner.address || '—'}>{partner.address || '—'}</Typography></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip size="small" color={partner.active ? 'success' : 'default'} label={partner.active ? t.active : t.inactive} /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Button size="small" onClick={() => startEdit(partner)}>{language === 'bn' ? 'সম্পাদনা' : 'Edit'}</Button>
                <Button size="small" onClick={() => { setFinancial(blankFinancial); setFinancialPartner(partner); setFinancialError(''); }}>{t.financial}</Button>
                <Button size="small" onClick={() => { setLedgerPage(1); setLedgerPartner(partner); }}>{partner.type === 'CUSTOMER' ? t.customerLedger : t.ledger}</Button>
              </Stack></TableCell>
            </TableRow>)}
            {!partners.length && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
          </TableBody>
        </Table>}
    </Paper>
    <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
      <Typography variant="caption">{t.page} {page}</Typography>
      <Button size="small" disabled={page === 1 || partnersQuery.isFetching} onClick={() => setPage(current => current - 1)}>{t.previous}</Button>
      <Button size="small" disabled={partners.length < 50 || partnersQuery.isFetching} onClick={() => setPage(current => current + 1)}>{t.next}</Button>
    </Stack>

    <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>{editing ? t.edit : `${t.add} · ${type === 'SUPPLIER' ? t.supplier : type === 'FARMER' ? t.farmer : t.customer}`}</DialogTitle>
      <Box component="form" onSubmit={submitProfile}>
        <DialogContent><Stack spacing={2}>
          {profileError && <Alert severity="error">{profileError}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField required fullWidth label={t.name} value={profile.name} onChange={event => setProfile(current => ({ ...current, name: event.target.value }))} />
            <TextField required fullWidth label={t.code} value={profile.code} onChange={event => setProfile(current => ({ ...current, code: event.target.value }))} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField fullWidth label={t.businessName} value={profile.businessName} onChange={event => setProfile(current => ({ ...current, businessName: event.target.value }))} />
            <TextField fullWidth label={t.phone} value={profile.phone} onChange={event => setProfile(current => ({ ...current, phone: event.target.value }))} />
            <TextField fullWidth type="email" label={t.email} value={profile.email} onChange={event => setProfile(current => ({ ...current, email: event.target.value }))} />
          </Stack>
          <TextField fullWidth multiline minRows={2} label={t.address} value={profile.address} onChange={event => setProfile(current => ({ ...current, address: event.target.value }))} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField fullWidth label={t.nid} value={profile.nid} onChange={event => setProfile(current => ({ ...current, nid: event.target.value }))} />
            <TextField fullWidth label={t.tin} value={profile.tin} onChange={event => setProfile(current => ({ ...current, tin: event.target.value }))} />
            <TextField fullWidth label={t.bin} value={profile.bin} onChange={event => setProfile(current => ({ ...current, bin: event.target.value }))} />
          </Stack>
          {editing && <FormControl size="small"><InputLabel>{t.status}</InputLabel><Select label={t.status} value={profile.active ? 'true' : 'false'} onChange={event => setProfile(current => ({ ...current, active: event.target.value === 'true' }))}>
            <MenuItem value="true">{t.active}</MenuItem><MenuItem value="false">{t.inactive}</MenuItem>
          </Select></FormControl>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setProfileOpen(false)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>{t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(financialPartner)} onClose={() => setFinancialPartner(null)} fullWidth maxWidth="sm">
      <DialogTitle>{t.financial} · {financialPartner?.name}</DialogTitle>
      <Box component="form" onSubmit={submitFinancial}>
        <DialogContent><Stack spacing={2}>
          {financialQuery.error && <Alert severity="error">{errorText(financialQuery.error, t.financialForbidden)}</Alert>}
          {financialError && <Alert severity="error">{financialError}</Alert>}
          {financialQuery.isLoading ? <CircularProgress size={20} /> : <>
            <TextField label={t.bankName} value={financial.bankName} onChange={event => setFinancial(current => ({ ...current, bankName: event.target.value }))} />
            <TextField label={t.bankAccount} value={financial.bankAccount} onChange={event => setFinancial(current => ({ ...current, bankAccount: event.target.value }))} />
            <TextField label={t.paymentMethod} value={financial.paymentMethod} onChange={event => setFinancial(current => ({ ...current, paymentMethod: event.target.value }))} />
            <TextField label={t.creditLimit} value={financial.creditLimit} onChange={event => setFinancial(current => ({ ...current, creditLimit: event.target.value }))} inputProps={{ inputMode: 'decimal' }} />
            <TextField label={t.paymentTerms} value={financial.paymentTermsDays} onChange={event => setFinancial(current => ({ ...current, paymentTermsDays: event.target.value }))} inputProps={{ inputMode: 'numeric' }} />
            <TextField label={t.openingBalance} value={financial.openingBalance} onChange={event => setFinancial(current => ({ ...current, openingBalance: event.target.value }))} inputProps={{ inputMode: 'decimal' }} />
          </>}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setFinancialPartner(null)}>{t.cancel}</Button><Button type="submit" variant="contained" disabled={financialQuery.isLoading || financialQuery.isError || financialMutation.isPending}>{t.save}</Button></DialogActions>
      </Box>
    </Dialog>

    <Dialog open={Boolean(ledgerPartner)} onClose={() => setLedgerPartner(null)} fullWidth maxWidth="lg">
      <DialogTitle>{isCustomer ? t.customerStatement : t.ledger} · {ledgerPartner?.name}</DialogTitle>
      <DialogContent>
        {ledgerQuery.error && <Alert severity="error" sx={{ mb: 2 }}>{errorText(ledgerQuery.error, t.ledgerFailed)}</Alert>}
        {ledgerQuery.isLoading ? <CircularProgress size={20} /> : ledgerQuery.data && (
          isCustomer ? (
            <Stack spacing={2}>
              <Alert severity="info">{t.customerLedgerScope}</Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.opening}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.summary.openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.totalApprovedOrders}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.summary.totalApprovedOrders).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1, bgcolor: '#fef2f2' }}>
                  <Typography variant="caption" color="error.main">{t.totalDue}</Typography>
                  <Typography variant="h6" fontWeight={800} color="error.main">৳ {Number(ledgerQuery.data.summary.totalDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
                {ledgerQuery.data.partner.creditLimit && (
                  <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">{t.availableCredit}</Typography>
                    <Typography variant="h6" fontWeight={800} color={Number(ledgerQuery.data.summary.availableCredit) < 0 ? 'error.main' : 'success.main'}>
                      ৳ {Number(ledgerQuery.data.summary.availableCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Limit: ৳ {Number(ledgerQuery.data.partner.creditLimit).toLocaleString()}</Typography>
                  </Paper>
                )}
              </Stack>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 950 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t.orderNo}</strong></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t.factory}</strong></TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{t.channel}</strong></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t.items}</strong></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{t.amount}</strong></TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{t.status}</strong></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t.postedAt}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerQuery.data.data.map((order: any) => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}><strong>{order.orderNumber}</strong></TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{order.factory?.name || '—'}</TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip label={order.channel} size="small" variant="outlined" /></TableCell>
                        <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={order.lines.map((l: any) => `${l.item.name} (${Number(l.quantityKg).toLocaleString()} KG)`).join(', ')}>{order.lines.map((l: any) => `${l.item.name} (${Number(l.quantityKg).toLocaleString()} KG)`).join(', ')}</Typography></TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}><strong>৳ {Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip label={order.status} size="small" color={order.status === 'APPROVED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'default'} /></TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!ledgerQuery.data.data.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Paper>
              <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                <Typography variant="caption">{t.page} {ledgerPage}</Typography>
                <Button size="small" disabled={ledgerPage === 1 || ledgerQuery.isFetching} onClick={() => setLedgerPage(current => current - 1)}>{t.previous}</Button>
                <Button size="small" disabled={!ledgerQuery.data || ledgerPage >= ledgerQuery.data.meta.pageCount || ledgerQuery.isFetching} onClick={() => setLedgerPage(current => current + 1)}>{t.next}</Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">{t.ledgerScope}</Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.postedPurchases}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.purchases.grossPurchaseAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.receivedQuantity}</Typography>
                  <Typography variant="h6" fontWeight={800}>{Number(ledgerQuery.data.purchases.receivedQuantityKg).toLocaleString()} KG</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.postedReceipts}</Typography>
                  <Typography variant="h6" fontWeight={800}>{ledgerQuery.data.purchases.postedReceiptCount}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.opening}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.partner.openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.invoicePayable}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.purchases.netSupplierPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  <Typography variant="caption" color="text.secondary">{ledgerQuery.data.purchases.postedInvoiceCount} {t.postedInvoices}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.qualityDeductions}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.purchases.qualityDeductionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t.separateCosts}</Typography>
                  <Typography variant="h6" fontWeight={800}>৳ {Number(ledgerQuery.data.purchases.separateOperatingCosts).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                </Paper>
              </Stack>
              <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1350 }}>
                  <TableHead><TableRow>{[
                    { label: t.receipt, align: 'left' },
                    { label: t.purchaseOrder, align: 'left' },
                    { label: t.factory, align: 'left' },
                    { label: t.material, align: 'left' },
                    { label: t.quantity, align: 'right' },
                    { label: t.payableQuantity, align: 'right' },
                    { label: t.rate, align: 'right' },
                    { label: t.amount, align: 'right' },
                    { label: t.invoice, align: 'left' },
                    { label: t.qualityDeductions, align: 'right' },
                    { label: t.invoicePayable, align: 'right' },
                    { label: t.postedAt, align: 'left' },
                  ].map(col => <TableCell key={col.label} align={col.align as any} sx={{ whiteSpace: 'nowrap' }}>{col.label}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {ledgerQuery.data.data.map((row: any) => <TableRow key={row.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.receiptNumber}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.purchaseOrderNumber}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.factory.name}</TableCell>
                      <TableCell sx={{ maxWidth: 160 }}><Typography variant="body2" noWrap title={row.item.name}>{row.item.name}</Typography></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(row.quantity).toLocaleString()} {row.unit}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{Number(row.payableQuantity).toLocaleString(undefined, { maximumFractionDigits: 3 })} KG</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(row.unitRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>৳ {Number(row.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.purchaseInvoice?.invoiceNumber ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>{row.purchaseInvoice ? `৳ ${Number(row.purchaseInvoice.qualityDeductionAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'primary.dark' }}>{row.purchaseInvoice ? `৳ ${Number(row.purchaseInvoice.netSupplierPayable).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.postedAt ? new Date(row.postedAt).toLocaleString() : '—'}</TableCell>
                    </TableRow>)}
                    {!ledgerQuery.data.data.length && <TableRow><TableCell colSpan={12} align="center" sx={{ py: 3, color: 'text.secondary' }}>{t.noRows}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Paper>
              <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                <Typography variant="caption">{t.page} {ledgerPage}</Typography>
                <Button size="small" disabled={ledgerPage === 1 || ledgerQuery.isFetching} onClick={() => setLedgerPage(current => current - 1)}>{t.previous}</Button>
                <Button size="small" disabled={!ledgerQuery.data || ledgerPage >= ledgerQuery.data.meta.pageCount || ledgerQuery.isFetching} onClick={() => setLedgerPage(current => current + 1)}>{t.next}</Button>
              </Stack>
            </Stack>
          )
        )}
      </DialogContent>
      <DialogActions><Button onClick={() => setLedgerPartner(null)}>{t.cancel}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
