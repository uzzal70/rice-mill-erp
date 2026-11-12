'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScaleRoundedIcon from '@mui/icons-material/ScaleRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
type AccountSubtype =
  | 'CASH'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'INVENTORY_RAW'
  | 'INVENTORY_FINISHED'
  | 'INVENTORY_BYPRODUCT'
  | 'FIXED_ASSET'
  | 'CURRENT_ASSET'
  | 'ACCOUNTS_PAYABLE'
  | 'TAX_PAYABLE'
  | 'CURRENT_LIABILITY'
  | 'LONG_TERM_LIABILITY'
  | 'SHARE_CAPITAL'
  | 'RETAINED_EARNINGS'
  | 'OPERATING_REVENUE'
  | 'OTHER_INCOME'
  | 'COST_OF_GOODS_SOLD'
  | 'DIRECT_EXPENSE'
  | 'INDIRECT_EXPENSE'
  | 'ADMINISTRATIVE_EXPENSE';

type VoucherType = 'JOURNAL' | 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'SALES' | 'PURCHASE' | 'EXPENSE' | 'OPENING';
type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: AccountSubtype | null;
  currency: string;
  openingBalance: string;
  currentBalance: string;
  isSystem: boolean;
  active: boolean;
  description?: string | null;
  parent?: { id: string; code: string; name: string } | null;
};

type JournalLine = {
  id?: string;
  accountId?: string | null;
  accountCode: string;
  description?: string | null;
  debit: number | string;
  credit: number | string;
  partnerId?: string | null;
  account?: { id: string; code: string; name: string; type: AccountType } | null;
};

type Journal = {
  id: string;
  number: string;
  voucherType: VoucherType;
  sourceType: string;
  sourceId: string;
  status: JournalStatus;
  currency: string;
  voucherDate: string;
  narration?: string | null;
  totalAmount: string;
  chequeOrRefNo?: string | null;
  partnerId?: string | null;
  partner?: { id: string; name: string; code: string; type: string } | null;
  lines: JournalLine[];
};

type GeneralLedgerEntry = {
  id: string;
  date: string;
  voucherNumber: string;
  voucherType: VoucherType;
  sourceType: string;
  narration?: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
};

type GeneralLedgerAccount = {
  account: { id: string; code: string; name: string; type: AccountType; subtype?: string };
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: GeneralLedgerEntry[];
};

type TrialBalanceRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype?: string;
  debit: number;
  credit: number;
};

type TrialBalanceResult = {
  asOfDate: string;
  accounts: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
};

type ProfitAndLossResult = {
  fromDate: string;
  toDate: string;
  revenues: Array<{ code: string; name: string; amount: number }>;
  totalRevenue: number;
  cogs: Array<{ code: string; name: string; amount: number }>;
  totalCogs: number;
  grossProfit: number;
  grossProfitMarginPct: number;
  operatingExpenses: Array<{ code: string; name: string; amount: number }>;
  totalOperatingExpense: number;
  netProfit: number;
  netProfitMarginPct: number;
};

type BalanceSheetResult = {
  asOfDate: string;
  assets: Array<{ code: string; name: string; balance: number }>;
  totalAssets: number;
  liabilities: Array<{ code: string; name: string; balance: number }>;
  totalLiabilities: number;
  equity: Array<{ code: string; name: string; balance: number }>;
  currentYearSurplus: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
};

type CashFlowResult = {
  fromDate: string;
  toDate: string;
  operatingActivities: {
    netProfit: number;
    changeInReceivables: number;
    changeInInventories: number;
    changeInPayables: number;
    netCashFromOperations: number;
  };
  investingActivities: {
    capitalExpenditures: number;
    netCashFromInvesting: number;
  };
  financingActivities: {
    capitalAndBorrowings: number;
    netCashFromFinancing: number;
  };
  summary: {
    netCashChange: number;
    openingCashAndBank: number;
    closingCashAndBank: number;
  };
};

type ArScheduleResult = {
  asOfDate: string;
  customers: Array<{
    partnerId: string;
    code: string;
    name: string;
    phone?: string;
    creditLimit: number;
    totalDue: number;
    current: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
  }>;
  totals: {
    totalDue: number;
    current: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
  };
};

type ApScheduleResult = {
  asOfDate: string;
  suppliers: Array<{
    partnerId: string;
    code: string;
    name: string;
    phone?: string;
    totalPayable: number;
    current: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
  }>;
  totals: {
    totalPayable: number;
    current: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
  };
};

interface AccountingPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

const TYPE_COLORS: Record<AccountType, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default'> = {
  ASSET: 'primary',
  LIABILITY: 'warning',
  EQUITY: 'secondary',
  REVENUE: 'success',
  EXPENSE: 'error',
};

export function AccountingPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: AccountingPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('ALL');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('ALL');
  const [selectedGlAccountId, setSelectedGlAccountId] = useState<string>('');
  const [statementType, setStatementType] = useState<
    'PNL' | 'BALANCE_SHEET' | 'CASH_FLOW' | 'AR_AGING' | 'AP_AGING'
  >('PNL');
  const [bookType, setBookType] = useState<'CASH' | 'BANK'>('CASH');

  // Dialog States
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [reverseDialogJournal, setReverseDialogJournal] = useState<Journal | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [printJournal, setPrintJournal] = useState<Journal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // New Account Form Fields
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('ASSET');
  const [newAccSubtype, setNewAccSubtype] = useState<string>('');
  const [newAccOpening, setNewAccOpening] = useState('0');
  const [newAccDesc, setNewAccDesc] = useState('');

  // New Voucher Form Fields
  const [voucherType, setVoucherType] = useState<VoucherType>('JOURNAL');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [chequeOrRefNo, setChequeOrRefNo] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [voucherLines, setVoucherLines] = useState<JournalLine[]>([
    { accountCode: '', debit: '', credit: '', description: '' },
    { accountCode: '', debit: '', credit: '', description: '' },
  ]);

  // Load Accounts (COA)
  const accountsQuery = useQuery({
    queryKey: ['coa', companyId, accountTypeFilter],
    queryFn: async () => {
      const params: Record<string, string> = { companyId };
      if (accountTypeFilter !== 'ALL') params.type = accountTypeFilter;
      return apiRequest<Account[]>(`/accounting/coa?${queryString(params)}`);
    },
    enabled: Boolean(companyId),
  });

  // Load Partners (for sub-ledger dropdown)
  const partnersQuery = useQuery({
    queryKey: ['partners', companyId],
    queryFn: async () => {
      const res = await apiRequest<{ data: any[] }>(`/partners?companyId=${companyId}`);
      return res.data;
    },
    enabled: Boolean(companyId),
  });

  // Load Journals
  const journalsQuery = useQuery({
    queryKey: ['journals', companyId, voucherTypeFilter],
    queryFn: async () => {
      const params: Record<string, string> = { companyId };
      if (voucherTypeFilter !== 'ALL') params.voucherType = voucherTypeFilter;
      return apiRequest<Journal[]>(`/accounting/journals?${queryString(params)}`);
    },
    enabled: Boolean(companyId),
  });

  // Load General Ledger
  const glQuery = useQuery({
    queryKey: ['gl', companyId, selectedGlAccountId],
    queryFn: async () => {
      if (!selectedGlAccountId) return [];
      return apiRequest<GeneralLedgerAccount[]>(
        `/accounting/reports/gl?companyId=${companyId}&accountId=${selectedGlAccountId}`,
      );
    },
    enabled: Boolean(companyId && selectedGlAccountId),
  });

  // Load Cash Book
  const cashBookQuery = useQuery({
    queryKey: ['cash-book', companyId],
    queryFn: async () => {
      return apiRequest<GeneralLedgerAccount[]>(`/accounting/reports/cash-book?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 3 && bookType === 'CASH'),
  });

  // Load Bank Book
  const bankBookQuery = useQuery({
    queryKey: ['bank-book', companyId],
    queryFn: async () => {
      return apiRequest<GeneralLedgerAccount[]>(`/accounting/reports/bank-book?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 3 && bookType === 'BANK'),
  });

  // Load Trial Balance
  const tbQuery = useQuery({
    queryKey: ['trial-balance', companyId],
    queryFn: async () => {
      return apiRequest<TrialBalanceResult>(`/accounting/reports/trial-balance?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 4),
  });

  // Load Profit and Loss
  const pnlQuery = useQuery({
    queryKey: ['pnl', companyId],
    queryFn: async () => {
      return apiRequest<ProfitAndLossResult>(`/accounting/reports/pnl?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 5 && statementType === 'PNL'),
  });

  // Load Balance Sheet
  const bsQuery = useQuery({
    queryKey: ['balance-sheet', companyId],
    queryFn: async () => {
      return apiRequest<BalanceSheetResult>(`/accounting/reports/balance-sheet?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 5 && statementType === 'BALANCE_SHEET'),
  });

  // Load Cash Flow
  const cashFlowQuery = useQuery({
    queryKey: ['cash-flow', companyId],
    queryFn: async () => {
      return apiRequest<CashFlowResult>(`/accounting/reports/cash-flow?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 5 && statementType === 'CASH_FLOW'),
  });

  // Load AR Schedule
  const arQuery = useQuery({
    queryKey: ['ar-schedule', companyId],
    queryFn: async () => {
      return apiRequest<ArScheduleResult>(`/accounting/reports/ar?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 5 && statementType === 'AR_AGING'),
  });

  // Load AP Schedule
  const apQuery = useQuery({
    queryKey: ['ap-schedule', companyId],
    queryFn: async () => {
      return apiRequest<ApScheduleResult>(`/accounting/reports/ap?companyId=${companyId}`);
    },
    enabled: Boolean(companyId && activeTab === 5 && statementType === 'AP_AGING'),
  });

  const accounts = accountsQuery.data || [];
  const journals = journalsQuery.data || [];

  // Total Debits and Credits calculation for active voucher dialog
  const voucherTotalDebit = useMemo(() => {
    return voucherLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  }, [voucherLines]);

  const voucherTotalCredit = useMemo(() => {
    return voucherLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  }, [voucherLines]);

  const isVoucherBalanced = useMemo(() => {
    return (
      voucherTotalDebit > 0 &&
      voucherTotalCredit > 0 &&
      Math.abs(voucherTotalDebit - voucherTotalCredit) < 0.005
    );
  }, [voucherTotalDebit, voucherTotalCredit]);

  const handleOpenNewVoucher = (type: VoucherType = 'JOURNAL') => {
    setVoucherType(type);
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setNarration('');
    setChequeOrRefNo('');
    setPartnerId('');
    setVoucherLines([
      { accountCode: '', debit: '', credit: '', description: '' },
      { accountCode: '', debit: '', credit: '', description: '' },
    ]);
    setFieldErrors({});
    setErrorMsg(null);
    setVoucherDialogOpen(true);
  };

  const handleOpenNewAccount = () => {
    setNewAccCode('');
    setNewAccName('');
    setNewAccType('ASSET');
    setNewAccSubtype('');
    setNewAccOpening('0');
    setNewAccDesc('');
    setFieldErrors({});
    setErrorMsg(null);
    setAccountDialogOpen(true);
  };

  const handleVoucherLineChange = (
    index: number,
    field: keyof JournalLine,
    value: string,
  ) => {
    setFieldErrors((prev) => ({
      ...prev,
      [`vline-${index}-${String(field)}`]: '',
      [`vline-${index}-debit`]: field === 'credit' || field === 'debit' ? '' : prev[`vline-${index}-debit`],
      [`vline-${index}-credit`]: field === 'debit' || field === 'credit' ? '' : prev[`vline-${index}-credit`],
    }));
    setVoucherLines((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      // If user enters debit, clear credit on this line
      if (field === 'debit' && Number(value) > 0) {
        item.credit = '';
      }
      // If user enters credit, clear debit on this line
      if (field === 'credit' && Number(value) > 0) {
        item.debit = '';
      }

      next[index] = item;
      return next;
    });
  };

  const handleAddVoucherLine = () => {
    setVoucherLines((prev) => [
      ...prev,
      { accountCode: '', debit: '', credit: '', description: '' },
    ]);
  };

  const handleRemoveVoucherLine = (index: number) => {
    if (voucherLines.length <= 2) return;
    setVoucherLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveVoucher = async (e: FormEvent, isPosting = true) => {
    e.preventDefault();
    setErrorMsg(null);

    const rules: FieldRule[] = [
      { name: 'voucherType', label: isBn ? 'ভাউচারের ধরন' : 'Voucher Type', value: voucherType, required: true, isSelect: true },
      { name: 'voucherDate', label: isBn ? 'তারিখ' : 'Date', value: voucherDate, required: true, type: 'date' },
    ];
    voucherLines.forEach((l, i) => {
      const hasAmount = Number(l.debit) > 0 || Number(l.credit) > 0;
      if (i < 2 || hasAmount || l.accountCode.trim()) {
        rules.push({
          name: `vline-${i}-accountCode`,
          label: `${isBn ? 'হিসাব খাত' : 'Account'} (#${i + 1})`,
          value: l.accountCode,
          required: true,
          isSelect: true,
        });
      }
      if ((i < 2 || l.accountCode.trim()) && !hasAmount) {
        rules.push({
          name: `vline-${i}-debit`,
          label: `${isBn ? 'ডেবিট বা ক্রেডিট পরিমাণ' : 'Debit or Credit Amount'} (#${i + 1})`,
          value: '',
          custom: () =>
            isBn ? 'ডেবিট অথবা ক্রেডিট পরিমাণ লিখুন।' : 'Enter a Debit or Credit amount.',
        });
      }
      if (Number(l.debit) < 0) {
        rules.push({ name: `vline-${i}-debit`, label: `Debit (#${i + 1})`, value: l.debit, type: 'nonNegativeNumber' });
      }
      if (Number(l.credit) < 0) {
        rules.push({ name: `vline-${i}-credit`, label: `Credit (#${i + 1})`, value: l.credit, type: 'nonNegativeNumber' });
      }
    });

    const validation = validateFormFields(rules, language);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    if (!isVoucherBalanced) {
      const diffMsg = isBn
        ? `ভাউচার ডেবিট এবং ক্রেডিট সমান নয়! ডেবিট: ৳ ${voucherTotalDebit.toFixed(2)}, ক্রেডিট: ৳ ${voucherTotalCredit.toFixed(2)}`
        : `Double-entry rule violation: Total Debit (৳ ${voucherTotalDebit.toFixed(2)}) must equal Total Credit (৳ ${voucherTotalCredit.toFixed(2)})`;
      setErrorMsg(diffMsg);
      toast.warning(diffMsg);
      focusFieldByName('vline-0-debit');
      return;
    }

    const validLines = voucherLines.filter(
      (l) => l.accountCode.trim() && (Number(l.debit) > 0 || Number(l.credit) > 0),
    );

    if (validLines.length < 2) {
      const msg = isBn ? 'কমপক্ষে দুটি বৈধ এন্ট্রি দিন' : 'Provide at least 2 valid debit/credit lines';
      setErrorMsg(msg);
      toast.warning(msg);
      return;
    }

    setBusy(true);
    setFieldErrors({});
    try {
      const payload = {
        companyId,
        factoryId: factoryId || undefined,
        voucherType,
        voucherDate,
        narration: narration.trim() || undefined,
        chequeOrRefNo: chequeOrRefNo.trim() || undefined,
        partnerId: partnerId || undefined,
        status: isPosting ? 'POSTED' : 'DRAFT',
        lines: validLines.map((l) => ({
          accountCode: l.accountCode.trim(),
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description?.trim() || undefined,
        })),
      };

      const res = await apiRequest<Journal>('/accounting/journals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setVoucherDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['coa'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      onSaved(
        isBn
          ? `ভাউচার ${res.number} সফলভাবে সংরক্ষিত ও পোস্ট হয়েছে`
          : `Journal voucher ${res.number} posted successfully`,
      );
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error saving voucher');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'newAccCode', label: isBn ? 'হিসাব কোড' : 'Account Code', value: newAccCode, required: true },
      { name: 'newAccName', label: isBn ? 'হিসাবের নাম' : 'Account Name', value: newAccName, required: true },
      { name: 'newAccType', label: isBn ? 'শ্রেণী (Type)' : 'Classification Type', value: newAccType, required: true, isSelect: true },
    ];
    if (newAccOpening.trim()) {
      rules.push({ name: 'newAccOpening', label: isBn ? 'প্রারম্ভিক জের' : 'Opening Balance', value: newAccOpening, type: 'number' });
    }
    const validation = validateFormFields(rules, language);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setErrorMsg(null);
    setFieldErrors({});
    setBusy(true);
    try {
      const payload = {
        companyId,
        code: newAccCode.trim(),
        name: newAccName.trim(),
        type: newAccType,
        subtype: newAccSubtype || undefined,
        openingBalance: Number(newAccOpening) || 0,
        description: newAccDesc.trim() || undefined,
      };

      await apiRequest('/accounting/coa', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setAccountDialogOpen(false);
      setNewAccCode('');
      setNewAccName('');
      setNewAccOpening('0');
      setNewAccDesc('');
      queryClient.invalidateQueries({ queryKey: ['coa'] });
      onSaved(
        isBn
          ? `নতুন হিসাব ${payload.code} - ${payload.name} যুক্ত হয়েছে`
          : `Account ${payload.code} - ${payload.name} created successfully`,
      );
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error creating account');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSeedStandardCOA = async () => {
    if (
      !window.confirm(
        isBn
          ? 'আপনি কি স্ট্যান্ডার্ড রাইস মিল হিসাব তালিকা (Chart of Accounts) যুক্ত করতে চান?'
          : 'Do you want to initialize the standard rice mill Chart of Accounts?',
      )
    )
      return;
    try {
      const res: any = await apiRequest('/accounting/coa/seed', {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });
      queryClient.invalidateQueries({ queryKey: ['coa'] });
      onSaved(res.message);
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to seed standard COA'));
    }
  };

  const handlePostJournal = async (j: Journal) => {
    try {
      await apiRequest(`/accounting/journals/${j.id}/post`, {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['coa'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      onSaved(
        isBn
          ? `ভাউচার ${j.number} পোস্ট হয়েছে`
          : `Journal voucher ${j.number} posted successfully`,
      );
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to post voucher'));
    }
  };

  const handleReverseJournal = (j: Journal) => {
    setReverseDialogJournal(j);
    setReverseReason('');
    setFieldErrors({});
    setErrorMsg(null);
  };

  const handleConfirmReverseJournal = async (e: FormEvent) => {
    e.preventDefault();
    if (!reverseDialogJournal) return;
    const validation = validateFormFields(
      [{ name: 'reverseReason', label: isBn ? 'রিভার্সালের কারণ' : 'Reversal Reason', value: reverseReason, required: true }],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrorMsg(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setFieldErrors({});
    try {
      const res: any = await apiRequest(`/accounting/journals/${reverseDialogJournal.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ companyId, reason: reverseReason.trim() }),
      });
      const num = reverseDialogJournal.number;
      setReverseDialogJournal(null);
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['coa'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      onSaved(
        isBn
          ? `ভাউচার ${num} রিভার্স করা হয়েছে (নতুন ভাউচার: ${res.number})`
          : `Journal ${num} reversed successfully (${res.number})`,
      );
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to reverse voucher');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      {/* Top Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isBn ? 'অ্যাকাউন্টিং ইঞ্জিন (Double-Entry General Ledger)' : 'Accounting Engine'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'চার্ট অব অ্যাকাউন্টস, জার্নাল ও পেমেন্ট ভাউচার, খতিয়ান, রেওয়ামিল এবং ব্যালেন্স শিট'
              : 'Real Double-Entry Accounting: Chart of Accounts, Journal Vouchers, Ledgers, Trial Balance & Balance Sheet'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AutoFixHighRoundedIcon />}
            onClick={handleSeedStandardCOA}
            sx={{ borderRadius: 2 }}
          >
            {isBn ? 'স্ট্যান্ডার্ড COA তৈরি' : 'Seed Standard COA'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={() => handleOpenNewVoucher('JOURNAL')}
            sx={{ borderRadius: 2 }}
          >
            {isBn ? 'নতুন ভাউচার' : 'New Voucher'}
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<AccountTreeRoundedIcon />} iconPosition="start" label={isBn ? 'হিসাব তালিকা (COA)' : 'Chart of Accounts'} />
          <Tab icon={<ReceiptLongRoundedIcon />} iconPosition="start" label={isBn ? 'ভাউচার ও জার্নাল' : 'Journal Vouchers'} />
          <Tab icon={<MenuBookRoundedIcon />} iconPosition="start" label={isBn ? 'সাধারণ খতিয়ান (GL)' : 'General Ledger'} />
          <Tab icon={<PaymentsRoundedIcon />} iconPosition="start" label={isBn ? 'ক্যাশ ও ব্যাংক বই' : 'Cash & Bank Books'} />
          <Tab icon={<ScaleRoundedIcon />} iconPosition="start" label={isBn ? 'রেওয়ামিল (Trial Balance)' : 'Trial Balance'} />
          <Tab icon={<AssessmentRoundedIcon />} iconPosition="start" label={isBn ? 'আর্থিক বিবরণী (Statements)' : 'Financial Statements'} />
        </Tabs>
      </Paper>

      {/* Tab 0: Chart of Accounts */}
      {activeTab === 0 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <AppSelect
                  fieldName="accountTypeFilter"
                  fullWidth={false}
                  label={isBn ? 'হিসাবের ধরন' : 'Account Type'}
                  value={accountTypeFilter}
                  options={[
                    { value: 'ALL', label: isBn ? 'সকল ধরন' : 'All Types' },
                    { value: 'ASSET', label: 'ASSET (সম্পদ)' },
                    { value: 'LIABILITY', label: 'LIABILITY (দায়)' },
                    { value: 'EQUITY', label: 'EQUITY (মালিকানাস্বত্ব)' },
                    { value: 'REVENUE', label: 'REVENUE (আয়)' },
                    { value: 'EXPENSE', label: 'EXPENSE (ব্যয়)' },
                  ]}
                  onChange={(val) => setAccountTypeFilter(val)}
                  sx={{ minWidth: 200 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {isBn ? `মোট অ্যাকাউন্ট: ${accounts.length}` : `${accounts.length} Accounts Found`}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddCircleOutlineRoundedIcon />}
                onClick={handleOpenNewAccount}
              >
                {isBn ? '+ কাস্টম অ্যাকাউন্ট' : '+ Add Account'}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'কোড' : 'Code'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'হিসাবের নাম' : 'Account Name'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ধরন (Type)' : 'Type'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'উপ-ধরন (Subtype)' : 'Subtype'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {isBn ? 'কোন হিসাব পাওয়া যায়নি। "স্ট্যান্ডার্ড COA তৈরি" বাটনে ক্লিক করুন।' : 'No accounts found. Click "Seed Standard COA" to initialize.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc) => (
                    <TableRow key={acc.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{acc.code}</TableCell>
                      <TableCell sx={{ fontWeight: 600, maxWidth: 260 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={acc.name}>
                          {acc.name}
                        </Typography>
                        {acc.isSystem && (
                          <Chip size="small" label="SYSTEM" sx={{ ml: 1, fontSize: 10, height: 18 }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip size="small" label={acc.type} color={TYPE_COLORS[acc.type]} sx={{ fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {acc.subtype || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        ৳ {Number(acc.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          size="small"
                          label={acc.active ? 'ACTIVE' : 'INACTIVE'}
                          color={acc.active ? 'success' : 'default'}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 1: Vouchers & Journals */}
      {activeTab === 1 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <AppSelect
                  fieldName="voucherTypeFilter"
                  fullWidth={false}
                  label={isBn ? 'ভাউচারের ধরন' : 'Voucher Type'}
                  value={voucherTypeFilter}
                  options={[
                    { value: 'ALL', label: isBn ? 'সকল ভাউচার' : 'All Vouchers' },
                    { value: 'JOURNAL', label: 'JOURNAL (সাধারণ জার্নাল)' },
                    { value: 'PAYMENT', label: 'PAYMENT (পেমেন্ট ভাউচার)' },
                    { value: 'RECEIPT', label: 'RECEIPT (রিসিট ভাউচার)' },
                    { value: 'CONTRA', label: 'CONTRA (কন্ট্রা ভাউচার)' },
                    { value: 'SALES', label: 'SALES (বিক্রয়)' },
                    { value: 'PURCHASE', label: 'PURCHASE (ক্রয়)' },
                    { value: 'EXPENSE', label: 'EXPENSE (ব্যয়)' },
                  ]}
                  onChange={(val) => setVoucherTypeFilter(val)}
                  sx={{ minWidth: 210 }}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => handleOpenNewVoucher('PAYMENT')}>
                  {isBn ? '+ পেমেন্ট ভাউচার' : '+ Payment'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => handleOpenNewVoucher('RECEIPT')}>
                  {isBn ? '+ রিসিট ভাউচার' : '+ Receipt'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => handleOpenNewVoucher('CONTRA')}>
                  {isBn ? '+ কন্ট্রা ভাউচার' : '+ Contra'}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1050 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ভাউচার নং' : 'Voucher #'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'তারিখ' : 'Date'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ধরন' : 'Type'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'বিবরণ / Narration' : 'Narration'}</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'রেফারেন্স / পার্টনার' : 'Ref / Partner'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'মোট টাকা' : 'Amount (BDT)'}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'পদক্ষেপ' : 'Actions'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {journals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {isBn ? 'কোন ভাউচার পাওয়া যায়নি' : 'No journal vouchers found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  journals.map((j) => (
                    <TableRow key={j.id} hover>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{j.number}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(j.voucherDate).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip size="small" label={j.voucherType} variant="outlined" sx={{ fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap title={j.narration || '—'}>
                          {j.narration || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography variant="body2" noWrap title={j.partner ? `${j.partner.name} (${j.partner.code})` : j.chequeOrRefNo || '—'}>
                          {j.partner ? `${j.partner.name} (${j.partner.code})` : j.chequeOrRefNo || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        ৳ {Number(j.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          size="small"
                          label={j.status}
                          color={j.status === 'POSTED' ? 'success' : j.status === 'DRAFT' ? 'info' : 'error'}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            title={isBn ? 'ভাউচার প্রিন্ট' : 'Print Voucher'}
                            onClick={() => setPrintJournal(j)}
                          >
                            <PrintRoundedIcon fontSize="small" />
                          </IconButton>
                          {j.status === 'DRAFT' && (
                            <IconButton
                              size="small"
                              color="success"
                              title={isBn ? 'পোস্ট করুন' : 'Post Journal'}
                              onClick={() => handlePostJournal(j)}
                            >
                              <CheckCircleRoundedIcon fontSize="small" />
                            </IconButton>
                          )}
                          {j.status === 'POSTED' && (
                            <IconButton
                              size="small"
                              color="warning"
                              title={isBn ? 'রিভার্স করুন' : 'Reverse Journal'}
                              onClick={() => handleReverseJournal(j)}
                            >
                              <UndoRoundedIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 2: General Ledger */}
      {activeTab === 2 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ minWidth: { xs: '100%', sm: 340 } }}>
                <AppAutocomplete
                  fieldName="selectedGlAccountId"
                  label={isBn ? 'হিসাব নির্বাচন করুন (Account)' : 'Select Account'}
                  value={selectedGlAccountId}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.code} - ${a.name}`,
                    badge: a.type,
                  }))}
                  emptyMessage={isBn ? 'কোনো হিসাব পাওয়া যায়নি' : 'No accounts found'}
                  onChange={(val) => setSelectedGlAccountId(val)}
                />
              </Box>
            </Stack>
          </Paper>

          {glQuery.data && glQuery.data.length > 0 ? (
            glQuery.data.map((gl) => (
              <Box key={gl.account.id}>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5, bgcolor: 'action.hover' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {gl.account.code} — {gl.account.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isBn ? 'হিসাবের ধরন:' : 'Account Classification:'} <strong>{gl.account.type}</strong> ({gl.account.subtype || 'General'})
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={3} textAlign="right">
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {isBn ? 'প্রারম্ভিক ব্যালেন্স' : 'Opening Balance'}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          ৳ {gl.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {isBn ? 'সমাপনী ব্যালেন্স' : 'Closing Balance'}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                          ৳ {gl.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 950 }}>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'তারিখ' : 'Date'}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ভাউচার নং' : 'Voucher #'}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ধরন' : 'Type'}</TableCell>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'বিবরণ' : 'Narration'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ডেবিট (Dr)' : 'Debit (Dr)'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ক্রেডিট (Cr)' : 'Credit (Cr)'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{isBn ? 'ব্যালেন্স' : 'Running Balance'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gl.entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            {isBn ? 'কোন লেনদেন নেই' : 'No transactions recorded for this account'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        gl.entries.map((entry) => (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(entry.date).toLocaleDateString()}</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{entry.voucherNumber}</TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Chip size="small" label={entry.voucherType} sx={{ fontSize: 10 }} />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 240 }}>
                              <Typography variant="body2" noWrap title={entry.narration || '—'}>
                                {entry.narration || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: entry.debit > 0 ? 700 : 400, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              {entry.debit > 0 ? `৳ ${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: entry.credit > 0 ? 700 : 400 }}>
                              {entry.credit > 0 ? `৳ ${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              ৳ {entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            ))
          ) : (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2.5, color: 'text.secondary' }}>
              {isBn ? 'লেজার দেখার জন্য একটি হিসাব নির্বাচন করুন' : 'Select an account above to inspect its General Ledger.'}
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 3: Cash & Bank Books */}
      {activeTab === 3 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant={bookType === 'CASH' ? 'contained' : 'outlined'}
                onClick={() => setBookType('CASH')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'ক্যাশ বই (Cash Book)' : 'Cash Book'}
              </Button>
              <Button
                variant={bookType === 'BANK' ? 'contained' : 'outlined'}
                onClick={() => setBookType('BANK')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'ব্যাংক বই (Bank Book)' : 'Bank Book'}
              </Button>
            </Stack>
          </Paper>

          {((bookType === 'CASH' ? cashBookQuery.data : bankBookQuery.data) || []).map((b) => (
            <Paper key={b.account.id} variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {b.account.code} — {b.account.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bookType === 'CASH' ? 'Physical Mill Cash' : 'Commercial Bank Account'}
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {isBn ? 'ব্যালেন্স: ' : 'Balance: '} ৳ {b.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Stack>

              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>{isBn ? 'তারিখ' : 'Date'}</TableCell>
                    <TableCell>{isBn ? 'ভাউচার নং' : 'Voucher #'}</TableCell>
                    <TableCell>{isBn ? 'বিবরণ' : 'Narration'}</TableCell>
                    <TableCell align="right">{isBn ? 'জমা / প্রাপ্তি (Dr)' : 'Receipts (Dr)'}</TableCell>
                    <TableCell align="right">{isBn ? 'খরচ / প্রদান (Cr)' : 'Payments (Cr)'}</TableCell>
                    <TableCell align="right">{isBn ? 'জের / ব্যালেন্স' : 'Balance'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {b.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                        {isBn ? 'কোন লেনদেন নেই' : 'No transactions recorded'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    b.entries.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.voucherNumber}</TableCell>
                        <TableCell>{e.narration || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: e.debit > 0 ? 700 : 400, color: 'success.main' }}>
                          {e.debit > 0 ? `৳ ${e.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: e.credit > 0 ? 700 : 400, color: 'error.main' }}>
                          {e.credit > 0 ? `৳ ${e.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ৳ {e.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          ))}
        </Box>
      )}

      {/* Tab 4: Trial Balance */}
      {activeTab === 4 && (
        <Box>
          {tbQuery.data && (
            <Box>
              {/* Status Banner */}
              <Alert
                severity={tbQuery.data.isBalanced ? 'success' : 'error'}
                icon={<CheckCircleRoundedIcon />}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                {tbQuery.data.isBalanced
                  ? isBn
                    ? `রেওয়ামিল সম্পূর্ণ সঠিক ও মিলে গেছে! মোট ডেবিট = মোট ক্রেডিট (৳ ${tbQuery.data.totalDebit.toLocaleString()})`
                    : `Trial Balance is completely balanced! Total Debit = Total Credit (৳ ${tbQuery.data.totalDebit.toLocaleString()})`
                  : isBn
                  ? `রেওয়ামিল মেলেনি! পার্থক্য: ৳ ${tbQuery.data.difference.toLocaleString()}`
                  : `Trial Balance difference detected: ৳ ${tbQuery.data.difference.toLocaleString()}`}
              </Alert>

              <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isBn ? 'কোড' : 'Code'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isBn ? 'হিসাবের বিবরণ' : 'Account Title'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isBn ? 'শ্রেণী (Type)' : 'Classification'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isBn ? 'ডেবিট (Dr BDT)' : 'Debit (Dr BDT)'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{isBn ? 'ক্রেডিট (Cr BDT)' : 'Credit (Cr BDT)'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tbQuery.data.accounts.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.code}</TableCell>
                        <TableCell sx={{ fontWeight: 600, maxWidth: 260 }}>
                          <Typography variant="body2" fontWeight={600} noWrap title={row.name}>
                            {row.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip size="small" label={row.type} color={TYPE_COLORS[row.type]} sx={{ fontSize: 10, height: 20 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: row.debit > 0 ? 700 : 400, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {row.debit > 0 ? `৳ ${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: row.credit > 0 ? 700 : 400, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {row.credit > 0 ? `৳ ${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Grand Totals */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 800, fontSize: 15 }}>
                        {isBn ? 'সর্বমোট (GRAND TOTAL)' : 'GRAND TOTAL'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: 15, color: 'primary.main' }}>
                        ৳ {tbQuery.data.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: 15, color: 'primary.main' }}>
                        ৳ {tbQuery.data.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* Tab 5: Financial Statements (P&L and Balance Sheet) */}
      {activeTab === 5 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant={statementType === 'PNL' ? 'contained' : 'outlined'}
                onClick={() => setStatementType('PNL')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'লাভ-ক্ষতি বিবরণী (Profit & Loss)' : 'Profit & Loss Statement'}
              </Button>
              <Button
                variant={statementType === 'BALANCE_SHEET' ? 'contained' : 'outlined'}
                onClick={() => setStatementType('BALANCE_SHEET')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'উদ্বৃত্তপত্র (Balance Sheet)' : 'Balance Sheet'}
              </Button>
              <Button
                variant={statementType === 'CASH_FLOW' ? 'contained' : 'outlined'}
                onClick={() => setStatementType('CASH_FLOW')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'নগদ প্রবাহ (Cash Flow)' : 'Cash Flow Statement'}
              </Button>
              <Button
                variant={statementType === 'AR_AGING' ? 'contained' : 'outlined'}
                onClick={() => setStatementType('AR_AGING')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'বকেয়া বয়সীকরণ (AR Aging)' : 'Accounts Receivable Aging'}
              </Button>
              <Button
                variant={statementType === 'AP_AGING' ? 'contained' : 'outlined'}
                onClick={() => setStatementType('AP_AGING')}
                sx={{ borderRadius: 2 }}
              >
                {isBn ? 'পাওনাদার বয়সীকরণ (AP Aging)' : 'Accounts Payable Aging'}
              </Button>
            </Stack>
          </Paper>

          {/* Profit & Loss View */}
          {statementType === 'PNL' && pnlQuery.data && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, maxWidth: 800, mx: 'auto' }}>
              <Box textAlign="center" mb={3}>
                <Typography variant="h5" fontWeight={800}>
                  PROFIT & LOSS STATEMENT
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  For the Period Ending {new Date(pnlQuery.data.toDate).toLocaleDateString()}
                </Typography>
              </Box>

              {/* 1. Operating Revenue */}
              <Typography variant="subtitle2" fontWeight={800} color="success.main" mb={1}>
                1. REVENUE FROM OPERATIONS
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {pnlQuery.data.revenues.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right">৳ {r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Total Revenue</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ৳ {pnlQuery.data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* 2. Cost of Goods Sold */}
              <Typography variant="subtitle2" fontWeight={800} color="warning.main" mb={1}>
                2. COST OF GOODS SOLD (DIRECT PRODUCTION COSTS)
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {pnlQuery.data.cogs.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell align="right">৳ {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Total Cost of Goods Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ৳ {pnlQuery.data.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Gross Profit Banner */}
              <Box sx={{ p: 1.5, mb: 3, bgcolor: '#e8f5e9', borderRadius: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={800} color="success.dark">
                  GROSS PROFIT ({pnlQuery.data.grossProfitMarginPct}% margin)
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="success.dark">
                  ৳ {pnlQuery.data.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* 3. Operating Expenses */}
              <Typography variant="subtitle2" fontWeight={800} color="error.main" mb={1}>
                3. OPERATING & ADMINISTRATIVE OVERHEADS
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {pnlQuery.data.operatingExpenses.map((oe, i) => (
                    <TableRow key={i}>
                      <TableCell>{oe.name}</TableCell>
                      <TableCell align="right">৳ {oe.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Total Operating Expenses</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ৳ {pnlQuery.data.totalOperatingExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Net Profit Banner */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: pnlQuery.data.netProfit >= 0 ? '#1b5e20' : '#b71c1c',
                  color: '#fff',
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" fontWeight={800}>
                  NET PROFIT / SURPLUS ({pnlQuery.data.netProfitMarginPct}%)
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  ৳ {pnlQuery.data.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Balance Sheet View */}
          {statementType === 'BALANCE_SHEET' && bsQuery.data && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, maxWidth: 800, mx: 'auto' }}>
              <Box textAlign="center" mb={3}>
                <Typography variant="h5" fontWeight={800}>
                  BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As of {new Date(bsQuery.data.asOfDate).toLocaleDateString()}
                </Typography>
              </Box>

              {/* Assets Section */}
              <Typography variant="subtitle2" fontWeight={800} color="primary.main" mb={1}>
                ASSETS
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {bsQuery.data.assets.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell align="right">৳ {a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell sx={{ fontWeight: 800 }}>TOTAL ASSETS</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                      ৳ {bsQuery.data.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Liabilities Section */}
              <Typography variant="subtitle2" fontWeight={800} color="warning.main" mb={1}>
                LIABILITIES
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {bsQuery.data.liabilities.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.name}</TableCell>
                      <TableCell align="right">৳ {l.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 800 }}>TOTAL LIABILITIES</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                      ৳ {bsQuery.data.totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Equity Section */}
              <Typography variant="subtitle2" fontWeight={800} color="secondary.main" mb={1}>
                EQUITY & SURPLUS
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {bsQuery.data.equity.map((eq, i) => (
                    <TableRow key={i}>
                      <TableCell>{eq.name}</TableCell>
                      <TableCell align="right">৳ {eq.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>Current Year Net Profit (P&L Surplus)</TableCell>
                    <TableCell align="right">
                      ৳ {bsQuery.data.currentYearSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#f3e5f5' }}>
                    <TableCell sx={{ fontWeight: 800 }}>TOTAL EQUITY</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                      ৳ {bsQuery.data.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#ede7f6' }}>
                    <TableCell sx={{ fontWeight: 900, fontSize: 15 }}>TOTAL LIABILITIES & EQUITY</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, fontSize: 15, color: 'secondary.main' }}>
                      ৳ {bsQuery.data.totalLiabilitiesAndEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Equilibrium Check */}
              <Alert
                severity={bsQuery.data.isBalanced ? 'success' : 'error'}
                sx={{ borderRadius: 2 }}
              >
                {bsQuery.data.isBalanced
                  ? 'Balance Sheet Equation Satisfied: Total Assets = Total Liabilities + Total Equity'
                  : `Balance Sheet Difference: ৳ ${bsQuery.data.difference.toLocaleString()}`}
              </Alert>
            </Paper>
          )}

          {/* Cash Flow Statement View */}
          {statementType === 'CASH_FLOW' && cashFlowQuery.data && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, maxWidth: 800, mx: 'auto' }}>
              <Box textAlign="center" mb={3}>
                <Typography variant="h5" fontWeight={800}>
                  CASH FLOW STATEMENT
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Period: {new Date(cashFlowQuery.data.fromDate).toLocaleDateString()} — {new Date(cashFlowQuery.data.toDate).toLocaleDateString()}
                </Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={800} color="primary.main" mb={1}>
                1. CASH FLOWS FROM OPERATING ACTIVITIES
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>Net Profit for the Period</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.operatingActivities.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Adjustments for: Working Capital - Receivables</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.operatingActivities.changeInReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Adjustments for: Working Capital - Inventories</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.operatingActivities.changeInInventories.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Adjustments for: Working Capital - Payables</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.operatingActivities.changeInPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Net Cash Generated from Operations</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                      ৳ {cashFlowQuery.data.operatingActivities.netCashFromOperations.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={800} color="warning.main" mb={1}>
                2. CASH FLOWS FROM INVESTING ACTIVITIES
              </Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>Capital Expenditures & Fixed Assets</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.investingActivities.capitalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Net Cash Used in Investing Activities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                      ৳ {cashFlowQuery.data.investingActivities.netCashFromInvesting.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={800} color="secondary.main" mb={1}>
                3. CASH FLOWS FROM FINANCING ACTIVITIES
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>Capital Inflow & Long-Term Borrowings</TableCell>
                    <TableCell align="right">৳ {cashFlowQuery.data.financingActivities.capitalAndBorrowings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#f3e5f5' }}>
                    <TableCell sx={{ fontWeight: 800 }}>Net Cash from Financing Activities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
                      ৳ {cashFlowQuery.data.financingActivities.netCashFromFinancing.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ p: 2, bgcolor: '#0d47a1', color: '#fff', borderRadius: 2 }}>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Cash & Bank at Beginning of Period:</Typography>
                    <Typography fontWeight={700}>৳ {cashFlowQuery.data.summary.openingCashAndBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Net Increase / (Decrease) in Cash:</Typography>
                    <Typography fontWeight={700}>৳ {cashFlowQuery.data.summary.netCashChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={800}>Cash & Bank at End of Period:</Typography>
                    <Typography variant="h6" fontWeight={800}>৳ {cashFlowQuery.data.summary.closingCashAndBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Paper>
          )}

          {/* Accounts Receivable Aging View */}
          {statementType === 'AR_AGING' && arQuery.data && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={800}>
                  {isBn ? 'গ্রাহকদের বকেয়া বয়সীকরণ তফসিল' : 'Accounts Receivable Aging Schedule'}
                </Typography>
                <Chip
                  color="primary"
                  label={`Total Outstanding: ৳ ${arQuery.data.totals.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Credit Limit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>0 - 30 Days (Current)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>31 - 60 Days</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>61 - 90 Days</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>90+ Days (Overdue)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Total Due</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {arQuery.data.customers.map((c) => (
                    <TableRow key={c.partnerId} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{c.name} ({c.code})</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell align="right">৳ {c.creditLimit.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>৳ {c.current.toLocaleString()}</TableCell>
                      <TableCell align="right">৳ {c.days31To60.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>৳ {c.days61To90.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>৳ {c.days90Plus.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {c.totalDue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 800 }}>GRAND TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {arQuery.data.totals.current.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {arQuery.data.totals.days31To60.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {arQuery.data.totals.days61To90.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>৳ {arQuery.data.totals.days90Plus.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: 'primary.dark' }}>৳ {arQuery.data.totals.totalDue.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Accounts Payable Aging View */}
          {statementType === 'AP_AGING' && apQuery.data && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={800}>
                  {isBn ? 'সরবরাহকারীদের পাওনা বয়সীকরণ তফসিল' : 'Accounts Payable Aging Schedule'}
                </Typography>
                <Chip
                  color="warning"
                  label={`Total Payable: ৳ ${apQuery.data.totals.totalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  sx={{ fontWeight: 800 }}
                />
              </Box>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Supplier / Farmer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>0 - 30 Days (Current)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>31 - 60 Days</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>61 - 90 Days</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>90+ Days (Overdue)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Total Payable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apQuery.data.suppliers.map((s) => (
                    <TableRow key={s.partnerId} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name} ({s.code})</TableCell>
                      <TableCell>{s.phone || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>৳ {s.current.toLocaleString()}</TableCell>
                      <TableCell align="right">৳ {s.days31To60.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'warning.main' }}>৳ {s.days61To90.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>৳ {s.days90Plus.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {s.totalPayable.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 800 }}>GRAND TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {apQuery.data.totals.current.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {apQuery.data.totals.days31To60.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>৳ {apQuery.data.totals.days61To90.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>৳ {apQuery.data.totals.days90Plus.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: 'warning.dark' }}>৳ {apQuery.data.totals.totalPayable.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      )}

      {/* New Voucher Dialog */}
      <FormDialog
        open={voucherDialogOpen}
        onClose={() => !busy && setVoucherDialogOpen(false)}
        onSubmit={(e) => handleSaveVoucher(e, true)}
        title={isBn ? 'নতুন ডাবল-এন্ট্রি ভাউচার এন্ট্রি' : 'New Double-Entry Voucher'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'পোস্ট করুন' : 'Post Voucher'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        submitColor="success"
        maxWidth="md"
      >
        <FormSection title={isBn ? 'ভাউচারের তথ্য' : 'Voucher Details'}>
          <FormGrid columns={{ xs: 1, sm: 3 }}>
            <AppSelect
              fieldName="voucherType"
              required
              label={isBn ? 'ভাউচারের ধরন' : 'Voucher Type'}
              value={voucherType}
              errorText={fieldErrors.voucherType}
              options={[
                { value: 'JOURNAL', label: 'JOURNAL (সাধারণ জার্নাল)' },
                { value: 'PAYMENT', label: 'PAYMENT (পেমেন্ট ভাউচার)' },
                { value: 'RECEIPT', label: 'RECEIPT (রিসিট ভাউচার)' },
                { value: 'CONTRA', label: 'CONTRA (কন্ট্রা ভাউচার)' },
                { value: 'OPENING', label: 'OPENING (প্রারম্ভিক জের)' },
              ]}
              onChange={(val) => {
                setVoucherType(val as VoucherType);
                setFieldErrors((p) => ({ ...p, voucherType: '' }));
              }}
            />

            <AppTextField
              fieldName="voucherDate"
              required
              type="date"
              label={isBn ? 'তারিখ' : 'Date'}
              value={voucherDate}
              errorText={fieldErrors.voucherDate}
              onValueChange={(val) => {
                setVoucherDate(val);
                setFieldErrors((p) => ({ ...p, voucherDate: '' }));
              }}
              InputLabelProps={{ shrink: true }}
            />

            <AppTextField
              fieldName="chequeOrRefNo"
              label={isBn ? 'চেক / রেফারেন্স নং' : 'Cheque / Ref No.'}
              value={chequeOrRefNo}
              onValueChange={(val) => setChequeOrRefNo(val)}
            />
          </FormGrid>

          <Box sx={{ mt: 2 }}>
            <AppTextField
              fieldName="narration"
              label={isBn ? 'বর্ণনা / Narration' : 'Narration / Purpose'}
              value={narration}
              onValueChange={(val) => setNarration(val)}
            />
          </Box>
        </FormSection>

        <FormSection title={isBn ? 'ডেবিট ও ক্রেডিট হিসাব খাতসমূহ' : 'Debit & Credit Accounting Distribution'}>
          <Paper variant="outlined" sx={{ overflowX: 'auto', borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell width="36%" sx={{ whiteSpace: 'nowrap' }}>{isBn ? 'হিসাব খাত (Account)' : 'Account'}</TableCell>
                  <TableCell width="24%" sx={{ whiteSpace: 'nowrap' }}>{isBn ? 'বিবরণ' : 'Description'}</TableCell>
                  <TableCell width="18%" align="right" sx={{ whiteSpace: 'nowrap' }}>{isBn ? 'ডেবিট (Dr BDT)' : 'Debit (Dr BDT)'}</TableCell>
                  <TableCell width="18%" align="right" sx={{ whiteSpace: 'nowrap' }}>{isBn ? 'ক্রেডিট (Cr BDT)' : 'Credit (Cr BDT)'}</TableCell>
                  <TableCell width="4%" align="center" />
                </TableRow>
              </TableHead>
              <TableBody>
                {voucherLines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <AppAutocomplete
                        fieldName={`vline-${idx}-accountCode`}
                        required
                        label={isBn ? 'হিসাব খাত' : 'Account'}
                        value={line.accountCode}
                        errorText={fieldErrors[`vline-${idx}-accountCode`]}
                        options={accounts.map((a) => ({
                          value: a.code,
                          label: `${a.code} - ${a.name}`,
                          badge: a.type,
                        }))}
                        emptyMessage={isBn ? 'কোনো হিসাব পাওয়া যায়নি' : 'No accounts'}
                        onChange={(val) => handleVoucherLineChange(idx, 'accountCode', val)}
                      />
                    </TableCell>
                    <TableCell>
                      <AppTextField
                        fieldName={`vline-${idx}-description`}
                        placeholder={isBn ? 'নোট' : 'Line note'}
                        value={line.description || ''}
                        onValueChange={(val) => handleVoucherLineChange(idx, 'description', val)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <AppTextField
                        fieldName={`vline-${idx}-debit`}
                        type="number"
                        prefixText="৳"
                        placeholder="0.00"
                        value={line.debit}
                        errorText={fieldErrors[`vline-${idx}-debit`]}
                        inputProps={{ min: 0, step: '.01' }}
                        onValueChange={(val) => handleVoucherLineChange(idx, 'debit', val)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <AppTextField
                        fieldName={`vline-${idx}-credit`}
                        type="number"
                        prefixText="৳"
                        placeholder="0.00"
                        value={line.credit}
                        errorText={fieldErrors[`vline-${idx}-credit`]}
                        inputProps={{ min: 0, step: '.01' }}
                        onValueChange={(val) => handleVoucherLineChange(idx, 'credit', val)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={voucherLines.length <= 2}
                        onClick={() => handleRemoveVoucherLine(idx)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={handleAddVoucherLine}
            >
              {isBn ? '+ আরও লাইন যোগ করুন' : '+ Add Line'}
            </Button>
          </Box>

          {/* Equilibrium Real-Time Banner */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: isVoucherBalanced ? '#e8f5e9' : '#ffebee',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color={isVoucherBalanced ? 'success.dark' : 'error.dark'}>
              {isVoucherBalanced
                ? isBn
                  ? '✓ ডেবিট এবং ক্রেডিট সমান (ভাউচার ব্যালেন্সড)'
                  : '✓ Balanced: Total Debit equals Total Credit'
                : isBn
                ? `✕ ডেবিট এবং ক্রেডিট সমান নয় (পার্থক্য: ৳ ${Math.abs(voucherTotalDebit - voucherTotalCredit).toFixed(2)})`
                : `✕ Unbalanced (Difference: ৳ ${Math.abs(voucherTotalDebit - voucherTotalCredit).toFixed(2)})`}
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2" fontWeight={700}>
                Total Dr: ৳ {voucherTotalDebit.toFixed(2)}
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                Total Cr: ৳ {voucherTotalCredit.toFixed(2)}
              </Typography>
            </Stack>
          </Box>
        </FormSection>
      </FormDialog>

      {/* Add Custom Account Dialog */}
      <FormDialog
        open={accountDialogOpen}
        onClose={() => !busy && setAccountDialogOpen(false)}
        onSubmit={handleCreateAccount}
        title={isBn ? 'নতুন হিসাব খাত তৈরি করুন' : 'Create New Account'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ' : 'Save'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="xs"
      >
        <FormGrid columns={1}>
          <AppTextField
            fieldName="newAccCode"
            required
            label={isBn ? 'হিসাব কোড (e.g. 1025)' : 'Account Code (e.g. 1025)'}
            value={newAccCode}
            errorText={fieldErrors.newAccCode}
            onValueChange={(val) => {
              setNewAccCode(val);
              setFieldErrors((p) => ({ ...p, newAccCode: '' }));
            }}
          />
          <AppTextField
            fieldName="newAccName"
            required
            label={isBn ? 'হিসাবের নাম' : 'Account Name'}
            value={newAccName}
            errorText={fieldErrors.newAccName}
            onValueChange={(val) => {
              setNewAccName(val);
              setFieldErrors((p) => ({ ...p, newAccName: '' }));
            }}
          />
          <AppSelect
            fieldName="newAccType"
            required
            label={isBn ? 'শ্রেণী (Type)' : 'Classification Type'}
            value={newAccType}
            errorText={fieldErrors.newAccType}
            options={[
              { value: 'ASSET', label: 'ASSET (সম্পদ)' },
              { value: 'LIABILITY', label: 'LIABILITY (দায়)' },
              { value: 'EQUITY', label: 'EQUITY (মালিকানাস্বত্ব)' },
              { value: 'REVENUE', label: 'REVENUE (আয়)' },
              { value: 'EXPENSE', label: 'EXPENSE (ব্যয়)' },
            ]}
            onChange={(val) => {
              setNewAccType(val as AccountType);
              setFieldErrors((p) => ({ ...p, newAccType: '' }));
            }}
          />
          <AppTextField
            fieldName="newAccOpening"
            type="number"
            prefixText="৳"
            label={isBn ? 'প্রারম্ভিক জের (Opening Balance)' : 'Opening Balance'}
            value={newAccOpening}
            errorText={fieldErrors.newAccOpening}
            onValueChange={(val) => {
              setNewAccOpening(val);
              setFieldErrors((p) => ({ ...p, newAccOpening: '' }));
            }}
          />
          <AppTextField
            fieldName="newAccDesc"
            multiline
            minRows={2}
            label={isBn ? 'বিবরণ' : 'Description'}
            value={newAccDesc}
            onValueChange={(val) => setNewAccDesc(val)}
          />
        </FormGrid>
      </FormDialog>

      {/* Reverse Journal Dialog */}
      <FormDialog
        open={Boolean(reverseDialogJournal)}
        onClose={() => !busy && setReverseDialogJournal(null)}
        onSubmit={handleConfirmReverseJournal}
        title={
          isBn
            ? `ভাউচার রিভার্স (${reverseDialogJournal?.number ?? ''})`
            : `Reverse Voucher (${reverseDialogJournal?.number ?? ''})`
        }
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'রিভার্স নিশ্চিত করুন' : 'Confirm Reversal'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        submitColor="error"
        maxWidth="xs"
      >
        <AppTextField
          fieldName="reverseReason"
          required
          multiline
          minRows={2}
          label={isBn ? 'রিভার্সালের কারণ' : 'Reversal Reason'}
          placeholder={isBn ? 'কেন রিভার্স করা হচ্ছে তা লিখুন...' : 'Explain why this voucher is being reversed...'}
          value={reverseReason}
          errorText={fieldErrors.reverseReason}
          onValueChange={(val) => {
            setReverseReason(val);
            setFieldErrors((p) => ({ ...p, reverseReason: '' }));
          }}
        />
      </FormDialog>

      {/* Printable Voucher Dialog */}
      <Dialog
        open={Boolean(printJournal)}
        onClose={() => setPrintJournal(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            {printJournal?.voucherType} VOUCHER — {printJournal?.number}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<PrintRoundedIcon />}
            onClick={() => window.print()}
          >
            {isBn ? 'প্রিন্ট' : 'Print'}
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {printJournal && (
            <Box sx={{ maxWidth: 700, mx: 'auto', p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                  RICE MILL INDUSTRIES ERP
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  DOUBLE-ENTRY ACCOUNTING VOUCHER
                </Typography>
                <Divider sx={{ my: 1.5 }} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
                <Typography variant="body2"><strong>Voucher #:</strong> {printJournal.number}</Typography>
                <Typography variant="body2" textAlign="right">
                  <strong>Date:</strong> {new Date(printJournal.voucherDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2"><strong>Voucher Type:</strong> {printJournal.voucherType}</Typography>
                <Typography variant="body2" textAlign="right"><strong>Status:</strong> {printJournal.status}</Typography>
                {printJournal.narration && (
                  <Typography variant="body2" sx={{ gridColumn: 'span 2' }}>
                    <strong>Narration:</strong> {printJournal.narration}
                  </Typography>
                )}
              </Box>

              <Table size="small" sx={{ mb: 3 }}>
                <TableHead sx={{ bgcolor: '#eee' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Account Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Particulars / Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Debit (Dr BDT)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Credit (Cr BDT)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {printJournal.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{l.accountCode}</TableCell>
                      <TableCell>{l.description || l.account?.name || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: Number(l.debit) > 0 ? 700 : 400 }}>
                        {Number(l.debit) > 0 ? Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: Number(l.credit) > 0 ? 700 : 400 }}>
                        {Number(l.credit) > 0 ? Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      ৳ {Number(printJournal.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      ৳ {Number(printJournal.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mt: 6, pt: 2, textAlign: 'center' }}>
                <Box><Divider sx={{ mb: 1 }} /><Typography variant="caption" fontWeight={600}>Prepared By</Typography></Box>
                <Box><Divider sx={{ mb: 1 }} /><Typography variant="caption" fontWeight={600}>Checked By</Typography></Box>
                <Box><Divider sx={{ mb: 1 }} /><Typography variant="caption" fontWeight={600}>Accounts Manager</Typography></Box>
                <Box><Divider sx={{ mb: 1 }} /><Typography variant="caption" fontWeight={600}>Approved By</Typography></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setPrintJournal(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

