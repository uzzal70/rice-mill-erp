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
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

type ExpenseCategory =
  | 'ELECTRICITY'
  | 'DIESEL'
  | 'GAS'
  | 'LABOUR'
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'TRANSPORT'
  | 'LOADING'
  | 'UNLOADING'
  | 'PACKAGING'
  | 'RENT'
  | 'SECURITY'
  | 'OFFICE'
  | 'MISCELLANEOUS';

type ExpenseType =
  | 'FACTORY_EXPENSE'
  | 'OFFICE_EXPENSE'
  | 'PRODUCTION_EXPENSE'
  | 'TRANSPORT_EXPENSE'
  | 'ADMINISTRATIVE_EXPENSE';

type ExpensePaymentMode = 'CASH' | 'BANK' | 'PETTY_CASH' | 'PAYABLE';

type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'POSTED'
  | 'REJECTED'
  | 'CANCELLED';

type ExpenseLine = {
  id?: string;
  description: string;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  amount: number | string;
  accountCode?: string | null;
};

type Expense = {
  id: string;
  voucherNumber: string;
  title: string;
  category: ExpenseCategory;
  type: ExpenseType;
  paymentMode: ExpensePaymentMode;
  status: ExpenseStatus;
  expenseDate: string;
  payeeName?: string | null;
  payeePartnerId?: string | null;
  vehicleId?: string | null;
  productionLineId?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  chequeOrTxnNumber?: string | null;
  billReference?: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  remarks?: string | null;
  rejectionReason?: string | null;
  approvedById?: string | null;
  postedById?: string | null;
  approvedAt?: string | null;
  postedAt?: string | null;
  createdAt: string;
  payeePartner?: { id: string; name: string; businessName?: string | null; code: string } | null;
  vehicle?: { id: string; vehicleNumber: string; vehicleType: string } | null;
  productionLine?: { id: string; name: string; code: string } | null;
  lines: ExpenseLine[];
};

type ExpenseSummary = {
  totalCount: number;
  totalExpenseAmount: number;
  postedExpenseAmount: number;
  pendingApprovalCount: number;
  pendingApprovalAmount: number;
  byCategory: Record<ExpenseCategory, number>;
  byType: Record<ExpenseType, number>;
  byPaymentMode: Record<ExpensePaymentMode, number>;
};

interface ExpensesPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, { en: string; bn: string }> = {
  ELECTRICITY: { en: 'Electricity / Power', bn: 'বিদ্যুৎ বিল' },
  DIESEL: { en: 'Diesel / Fuel', bn: 'ডিজেল / জ্বালানি' },
  GAS: { en: 'Gas / Boiler', bn: 'গ্যাস / বয়লার' },
  LABOUR: { en: 'Labor / Wages', bn: 'শ্রমিক মজুরি' },
  REPAIR: { en: 'Repairs', bn: 'মেরামত খরচ' },
  MAINTENANCE: { en: 'Plant Maintenance', bn: 'রক্ষণাবেক্ষণ' },
  TRANSPORT: { en: 'Transport / Freight', bn: 'পরিবহন ও যাতায়াত' },
  LOADING: { en: 'Loading Labor', bn: 'লোডিং মজুরি' },
  UNLOADING: { en: 'Unloading Labor', bn: 'আনলোডিং মজুরি' },
  PACKAGING: { en: 'Bags & Packaging', bn: 'বস্তা ও প্যাকেজিং' },
  RENT: { en: 'Rent / Godown Lease', bn: 'ভাড়া (গোডাউন/অফিস)' },
  SECURITY: { en: 'Security Guard', bn: 'নিরাপত্তা পাহারা' },
  OFFICE: { en: 'Office & Admin', bn: 'অফিস ও প্রশাসন' },
  MISCELLANEOUS: { en: 'Miscellaneous', bn: 'বিবিধ খরচ' },
};

const TYPE_LABELS: Record<ExpenseType, { en: string; bn: string }> = {
  FACTORY_EXPENSE: { en: 'Factory Overhead', bn: 'কারখানা পরিচালনা খরচ' },
  OFFICE_EXPENSE: { en: 'Office Overhead', bn: 'অফিস ওভারহেড' },
  PRODUCTION_EXPENSE: { en: 'Production / Direct', bn: 'উৎপাদন / মিলিং খরচ' },
  TRANSPORT_EXPENSE: { en: 'Transport & Freight', bn: 'পরিবহন খরচ' },
  ADMINISTRATIVE_EXPENSE: { en: 'General Administrative', bn: 'সাধারণ প্রশাসনিক খরচ' },
};

const PAYMENT_MODE_LABELS: Record<ExpensePaymentMode, { en: string; bn: string }> = {
  CASH: { en: 'Cash in Hand', bn: 'নগদ ক্যাশ' },
  BANK: { en: 'Bank Transfer / Cheque', bn: 'ব্যাংক / চেক' },
  PETTY_CASH: { en: 'Petty Cash', bn: 'পেটি ক্যাশ' },
  PAYABLE: { en: 'Accounts Payable (Credit)', bn: 'বকেয়া / পাওনাদার' },
};

export function ExpensesPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: ExpensesPageProps) {
  const queryClient = useQueryClient();
  const isBn = language === 'bn';

  // State Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [postDialogExpense, setPostDialogExpense] = useState<Expense | null>(null);
  const [rejectDialogExpense, setRejectDialogExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [printExpense, setPrintExpense] = useState<Expense | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('ELECTRICITY');
  const [expenseType, setExpenseType] = useState<ExpenseType>('FACTORY_EXPENSE');
  const [paymentMode, setPaymentMode] = useState<ExpensePaymentMode>('CASH');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [payeeName, setPayeeName] = useState('');
  const [payeePartnerId, setPayeePartnerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [productionLineId, setProductionLineId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [chequeOrTxnNumber, setChequeOrTxnNumber] = useState('');
  const [billReference, setBillReference] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ExpenseLine[]>([
    { description: '', quantity: '', unitPrice: '', amount: '' },
  ]);

  // Load Partners (Suppliers/Vendors)
  const partnersQuery = useQuery({
    queryKey: ['partners', companyId],
    queryFn: async () => {
      const res = await apiRequest<{ data: any[] }>(`/partners?companyId=${companyId}`);
      return res.data;
    },
    enabled: Boolean(companyId),
  });

  // Load Vehicles
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: async () => {
      const res = await apiRequest<{ data: any[] }>(`/companies/${companyId}/vehicles`);
      return res.data;
    },
    enabled: Boolean(companyId),
  });

  // Load Production Lines
  const linesQuery = useQuery({
    queryKey: ['production-lines', companyId, factoryId],
    queryFn: async () => {
      const res = await apiRequest<{ data: any[] }>(
        `/factories/${factoryId}/production-lines?companyId=${companyId}`,
      );
      return res.data;
    },
    enabled: Boolean(companyId && factoryId),
  });

  // Load Expenses List
  const expensesQuery = useQuery({
    queryKey: ['expenses', companyId, factoryId, statusFilter, categoryFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = { companyId, factoryId };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      return apiRequest<Expense[]>(`/expenses?${queryString(params)}`);
    },
    enabled: Boolean(companyId && factoryId),
  });

  // Load Expenses Summary
  const summaryQuery = useQuery({
    queryKey: ['expenses-summary', companyId, factoryId],
    queryFn: async () => {
      return apiRequest<ExpenseSummary>(
        `/expenses/summary?companyId=${companyId}&factoryId=${factoryId}`,
      );
    },
    enabled: Boolean(companyId && factoryId),
  });

  const expenses = expensesQuery.data || [];
  const summary = summaryQuery.data;

  // Filtered expenses by search text
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(
      (e) =>
        e.voucherNumber.toLowerCase().includes(term) ||
        e.title.toLowerCase().includes(term) ||
        (e.payeeName && e.payeeName.toLowerCase().includes(term)) ||
        (e.billReference && e.billReference.toLowerCase().includes(term)),
    );
  }, [expenses, searchTerm]);

  // Form Subtotal & Total Computation
  const formSubtotal = useMemo(() => {
    return lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  }, [lines]);

  const formTotal = useMemo(() => {
    return formSubtotal + (Number(taxAmount) || 0);
  }, [formSubtotal, taxAmount]);

  const handleOpenNew = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('ELECTRICITY');
    setExpenseType('FACTORY_EXPENSE');
    setPaymentMode('CASH');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setPayeeName('');
    setPayeePartnerId('');
    setVehicleId('');
    setProductionLineId('');
    setBankName('');
    setBankAccount('');
    setChequeOrTxnNumber('');
    setBillReference('');
    setTaxAmount('0');
    setRemarks('');
    setLines([{ description: '', quantity: '', unitPrice: '', amount: '' }]);
    setErrorMsg(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setExpenseType(exp.type);
    setPaymentMode(exp.paymentMode);
    setExpenseDate(exp.expenseDate.slice(0, 10));
    setPayeeName(exp.payeeName || '');
    setPayeePartnerId(exp.payeePartnerId || '');
    setVehicleId(exp.vehicleId || '');
    setProductionLineId(exp.productionLineId || '');
    setBankName(exp.bankName || '');
    setBankAccount(exp.bankAccount || '');
    setChequeOrTxnNumber(exp.chequeOrTxnNumber || '');
    setBillReference(exp.billReference || '');
    setTaxAmount(exp.taxAmount);
    setRemarks(exp.remarks || '');
    setLines(
      exp.lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity || '',
        unitPrice: l.unitPrice || '',
        amount: l.amount,
        accountCode: l.accountCode || '',
      })),
    );
    setErrorMsg(null);
    setFormOpen(true);
  };

  const handleLineChange = (
    index: number,
    field: keyof ExpenseLine,
    value: string,
  ) => {
    setLines((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      // Auto-compute amount if quantity and unitPrice provided
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : Number(item.quantity);
        const price = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
        if (qty > 0 && price > 0) {
          item.amount = (qty * price).toFixed(2);
        }
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { description: '', quantity: '', unitPrice: '', amount: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveForm = async (e: FormEvent, autoSubmit = false) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(isBn ? 'খরচের শিরোনাম আবশ্যক' : 'Expense title is required');
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() && Number(l.amount) > 0);
    if (validLines.length === 0) {
      setErrorMsg(
        isBn
          ? 'কমপক্ষে একটি বৈধ খরচের বিবরণ ও পরিমাণ দিন'
          : 'Please provide at least one valid line item with description and amount',
      );
      return;
    }

    setBusy(true);
    try {
      const payload = {
        companyId,
        factoryId,
        title: title.trim(),
        category,
        type: expenseType,
        paymentMode,
        expenseDate,
        payeeName: payeeName.trim() || undefined,
        payeePartnerId: payeePartnerId || undefined,
        vehicleId: vehicleId || undefined,
        productionLineId: productionLineId || undefined,
        bankName: bankName.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        chequeOrTxnNumber: chequeOrTxnNumber.trim() || undefined,
        billReference: billReference.trim() || undefined,
        taxAmount: Number(taxAmount) || 0,
        remarks: remarks.trim() || undefined,
        lines: validLines.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity ? Number(l.quantity) : undefined,
          unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
          amount: Number(l.amount),
          accountCode: l.accountCode || undefined,
        })),
      };

      let saved: Expense;
      if (editingExpense) {
        saved = await apiRequest<Expense>(`/expenses/${editingExpense.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        saved = await apiRequest<Expense>('/expenses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (autoSubmit && saved.status === 'DRAFT') {
        await apiRequest(`/expenses/${saved.id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ companyId, factoryId }),
        });
      }

      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${saved.voucherNumber} সফলভাবে সংরক্ষিত হয়েছে`
          : `Expense voucher ${saved.voucherNumber} saved successfully`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving expense');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (exp: Expense) => {
    try {
      await apiRequest(`/expenses/${exp.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${exp.voucherNumber} অনুমোদনের জন্য জমা দেওয়া হয়েছে`
          : `Expense ${exp.voucherNumber} submitted for approval`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprove = async (exp: Expense) => {
    try {
      await apiRequest(`/expenses/${exp.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${exp.voucherNumber} অনুমোদিত হয়েছে`
          : `Expense ${exp.voucherNumber} approved successfully`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialogExpense || !rejectionReason.trim()) return;
    try {
      await apiRequest(`/expenses/${rejectDialogExpense.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId, reason: rejectionReason.trim() }),
      });
      setRejectDialogExpense(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${rejectDialogExpense.voucherNumber} বাতিল করা হয়েছে`
          : `Expense ${rejectDialogExpense.voucherNumber} rejected`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmPost = async () => {
    if (!postDialogExpense) return;
    try {
      await apiRequest(`/expenses/${postDialogExpense.id}/post`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      setPostDialogExpense(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${postDialogExpense.voucherNumber} সফলভাবে লেজারে পোস্ট করা হয়েছে`
          : `Expense ${postDialogExpense.voucherNumber} posted to General Ledger successfully`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (exp: Expense) => {
    const reason = window.prompt(
      isBn ? 'বাতিলের কারণ লিখুন:' : 'Enter cancellation reason:',
    );
    if (reason === null) return;
    try {
      await apiRequest(`/expenses/${exp.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId, reason }),
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${exp.voucherNumber} বাতিল করা হয়েছে`
          : `Expense ${exp.voucherNumber} cancelled`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (exp: Expense) => {
    if (
      !window.confirm(
        isBn
          ? `আপনি কি ভাউচার ${exp.voucherNumber} মুছে ফেলতে চান?`
          : `Are you sure you want to delete ${exp.voucherNumber}?`,
      )
    )
      return;
    try {
      await apiRequest(`/expenses/${exp.id}?companyId=${companyId}&factoryId=${factoryId}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      onSaved(
        isBn
          ? `ভাউচার ${exp.voucherNumber} মুছে ফেলা হয়েছে`
          : `Expense ${exp.voucherNumber} deleted`,
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'POSTED':
        return 'success';
      case 'APPROVED':
        return 'primary';
      case 'SUBMITTED':
        return 'info';
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      {/* Top Header & Actions */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isBn ? 'ব্যয় ও খরচের হিসাব (Expense Management)' : 'Expense Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'কারখানা, বিদ্যুৎ, জ্বালানি, শ্রমিক মজুরি ও অফিসের ব্যয় অনুমোদন এবং লেজার পোস্টিং'
              : 'Factory overheads, fuel, labor wages, power bills, and double-entry accounting posting'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineRoundedIcon />}
          onClick={handleOpenNew}
          sx={{ borderRadius: 2, px: 2.5, py: 1 }}
        >
          {isBn ? 'নতুন খরচ ভাউচার' : 'New Expense Voucher'}
        </Button>
      </Stack>

      {/* KPI Summary Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderLeft: '4px solid #1976d2',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {isBn ? 'মোট ব্যয় (সর্বমোট)' : 'TOTAL EXPENSES'}
          </Typography>
          <Typography variant="h5" fontWeight={700} mt={0.5}>
            ৳ {(summary?.totalExpenseAmount || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isBn ? `মোট ভাউচার: ${summary?.totalCount || 0}` : `${summary?.totalCount || 0} Total Vouchers`}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderLeft: '4px solid #2e7d32',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {isBn ? 'লেজারে পোস্টকৃত ব্যয়' : 'POSTED TO GL'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="success.main" mt={0.5}>
            ৳ {(summary?.postedExpenseAmount || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'হিসাবভুক্ত চূড়ান্ত খরচ' : 'Recognized Double-Entry Expense'}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderLeft: '4px solid #ed6c02',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {isBn ? 'অনুমোদনের অপেক্ষায়' : 'PENDING APPROVAL'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="warning.main" mt={0.5}>
            ৳ {(summary?.pendingApprovalAmount || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isBn
              ? `${summary?.pendingApprovalCount || 0} টি ভাউচার অনুমোদনাধীন`
              : `${summary?.pendingApprovalCount || 0} Vouchers Pending`}
          </Typography>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            borderLeft: '4px solid #9c27b0',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {isBn ? 'উৎপাদন ও কারখানা খরচ' : 'MILLING & OVERHEAD'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="secondary.main" mt={0.5}>
            ৳{' '}
            {(
              (summary?.byType?.FACTORY_EXPENSE || 0) +
              (summary?.byType?.PRODUCTION_EXPENSE || 0)
            ).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'সরাসরি প্রডাকশন ও প্ল্যান্ট' : 'Factory & Production Overheads'}
          </Typography>
        </Paper>
      </Box>

      {/* Filter and Search Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <TextField
            size="small"
            label={isBn ? 'অনুসন্ধান (ভাউচার, শিরোনাম, প্রাপক)' : 'Search voucher, title, payee'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 1 }}
          />

          <TextField
            select
            size="small"
            label={isBn ? 'স্ট্যাটাস' : 'Status'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">{isBn ? 'সকল স্ট্যাটাস' : 'All Status'}</MenuItem>
            <MenuItem value="DRAFT">DRAFT</MenuItem>
            <MenuItem value="SUBMITTED">SUBMITTED</MenuItem>
            <MenuItem value="APPROVED">APPROVED</MenuItem>
            <MenuItem value="POSTED">POSTED</MenuItem>
            <MenuItem value="REJECTED">REJECTED</MenuItem>
            <MenuItem value="CANCELLED">CANCELLED</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label={isBn ? 'ক্যাটাগরি' : 'Category'}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">{isBn ? 'সকল ক্যাটাগরি' : 'All Categories'}</MenuItem>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <MenuItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat as ExpenseCategory][isBn ? 'bn' : 'en']}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={isBn ? 'ব্যয়ের ধরন' : 'Cost Center'}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">{isBn ? 'সকল ধরন' : 'All Types'}</MenuItem>
            {Object.keys(TYPE_LABELS).map((t) => (
              <MenuItem key={t} value={t}>
                {TYPE_LABELS[t as ExpenseType][isBn ? 'bn' : 'en']}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Expense Vouchers Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'ভাউচার নং' : 'Voucher #'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'তারিখ' : 'Date'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'শিরোনাম ও বিবরণ' : 'Title & Purpose'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'ক্যাটাগরি' : 'Category'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'ব্যয়ের ধরন' : 'Cost Center'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'প্রাপক / ভেন্ডর' : 'Payee / Vendor'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'পরিশোধ মাধ্যম' : 'Payment Mode'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {isBn ? 'মোট টাকা' : 'Total (BDT)'}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {isBn ? 'স্ট্যাটাস' : 'Status'}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {isBn ? 'পদক্ষেপ' : 'Actions'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {isBn ? 'কোন ব্যয়ের ভাউচার পাওয়া যায়নি' : 'No expense vouchers found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{exp.voucherNumber}</TableCell>
                  <TableCell>{new Date(exp.expenseDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {exp.title}
                    </Typography>
                    {exp.billReference && (
                      <Typography variant="caption" color="text.secondary">
                        Ref: {exp.billReference}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={CATEGORY_LABELS[exp.category]?.[isBn ? 'bn' : 'en'] || exp.category}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {TYPE_LABELS[exp.type]?.[isBn ? 'bn' : 'en'] || exp.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {exp.payeePartner?.name || exp.payeeName || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={PAYMENT_MODE_LABELS[exp.paymentMode]?.[isBn ? 'bn' : 'en'] || exp.paymentMode}
                      sx={{ fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    ৳ {Number(exp.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={exp.status}
                      color={getStatusColor(exp.status)}
                    />
                    {exp.status === 'REJECTED' && exp.rejectionReason && (
                      <Typography
                        variant="caption"
                        color="error"
                        display="block"
                        sx={{ fontSize: 10, mt: 0.5 }}
                      >
                        {exp.rejectionReason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {/* View / Print */}
                      <IconButton
                        size="small"
                        title={isBn ? 'ভাউচার প্রিন্ট' : 'Print Voucher'}
                        onClick={() => setPrintExpense(exp)}
                      >
                        <PrintRoundedIcon fontSize="small" />
                      </IconButton>

                      {/* Edit (Draft or Rejected only) */}
                      {(exp.status === 'DRAFT' || exp.status === 'REJECTED') && (
                        <IconButton
                          size="small"
                          color="primary"
                          title={isBn ? 'সম্পাদনা' : 'Edit'}
                          onClick={() => handleOpenEdit(exp)}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      )}

                      {/* Submit (Draft only) */}
                      {exp.status === 'DRAFT' && (
                        <IconButton
                          size="small"
                          color="info"
                          title={isBn ? 'অনুমোদনের জন্য জমা দিন' : 'Submit for approval'}
                          onClick={() => handleSubmit(exp)}
                        >
                          <SendRoundedIcon fontSize="small" />
                        </IconButton>
                      )}

                      {/* Approve (Submitted or Draft) */}
                      {(exp.status === 'SUBMITTED' || exp.status === 'DRAFT') && (
                        <IconButton
                          size="small"
                          color="success"
                          title={isBn ? 'অনুমোদন করুন' : 'Approve'}
                          onClick={() => handleApprove(exp)}
                        >
                          <CheckCircleOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      )}

                      {/* Reject (Submitted or Draft) */}
                      {(exp.status === 'SUBMITTED' || exp.status === 'DRAFT') && (
                        <IconButton
                          size="small"
                          color="error"
                          title={isBn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                          onClick={() => {
                            setRejectDialogExpense(exp);
                            setRejectionReason('');
                          }}
                        >
                          <BlockRoundedIcon fontSize="small" />
                        </IconButton>
                      )}

                      {/* Post to GL (Approved only) */}
                      {exp.status === 'APPROVED' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<AccountBalanceRoundedIcon />}
                          sx={{ py: 0.2, px: 1, fontSize: 11, borderRadius: 1.5 }}
                          onClick={() => setPostDialogExpense(exp)}
                        >
                          {isBn ? 'পোস্ট' : 'Post GL'}
                        </Button>
                      )}

                      {/* Cancel (Draft, Submitted, Approved) */}
                      {exp.status !== 'POSTED' && exp.status !== 'CANCELLED' && (
                        <IconButton
                          size="small"
                          color="default"
                          title={isBn ? 'বাতিল করুন' : 'Cancel'}
                          onClick={() => handleCancel(exp)}
                        >
                          <CancelOutlinedIcon fontSize="small" />
                        </IconButton>
                      )}

                      {/* Delete (Draft only) */}
                      {exp.status === 'DRAFT' && (
                        <IconButton
                          size="small"
                          color="error"
                          title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                          onClick={() => handleDelete(exp)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
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

      {/* New / Edit Expense Voucher Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => !busy && setFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={(e) => handleSaveForm(e, false)}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingExpense
              ? isBn
                ? `ভাউচার সম্পাদনা: ${editingExpense.voucherNumber}`
                : `Edit Expense Voucher: ${editingExpense.voucherNumber}`
              : isBn
              ? 'নতুন খরচ ভাউচার তৈরি করুন'
              : 'Create New Expense Voucher'}
          </DialogTitle>
          <DialogContent dividers>
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                required
                size="small"
                label={isBn ? 'খরচের শিরোনাম' : 'Expense Title'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Factory Electricity Bill Oct 2026"
              />
              <TextField
                required
                type="date"
                size="small"
                label={isBn ? 'তারিখ' : 'Date'}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                select
                required
                size="small"
                label={isBn ? 'ক্যাটাগরি' : 'Category'}
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {Object.keys(CATEGORY_LABELS).map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat as ExpenseCategory][isBn ? 'bn' : 'en']}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                required
                size="small"
                label={isBn ? 'ব্যয়ের ধরন (Cost Center)' : 'Cost Center Type'}
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
              >
                {Object.keys(TYPE_LABELS).map((t) => (
                  <MenuItem key={t} value={t}>
                    {TYPE_LABELS[t as ExpenseType][isBn ? 'bn' : 'en']}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                required
                size="small"
                label={isBn ? 'পরিশোধ মাধ্যম' : 'Payment Mode'}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as ExpensePaymentMode)}
              >
                {Object.keys(PAYMENT_MODE_LABELS).map((pm) => (
                  <MenuItem key={pm} value={pm}>
                    {PAYMENT_MODE_LABELS[pm as ExpensePaymentMode][isBn ? 'bn' : 'en']}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                size="small"
                label={isBn ? 'প্রাপকের নাম' : 'Payee Name (Person/Party)'}
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
              />

              <TextField
                select
                size="small"
                label={isBn ? 'রেজিস্টার্ড ভেন্ডর / সরবরাহকারী (ঐচ্ছিক)' : 'Registered Vendor (Optional)'}
                value={payeePartnerId}
                onChange={(e) => setPayeePartnerId(e.target.value)}
              >
                <MenuItem value="">{isBn ? '-- কোনটি নয় --' : '-- None --'}</MenuItem>
                {(partnersQuery.data || []).map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Optional Allocation Links */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                select
                size="small"
                label={isBn ? 'সংযুক্ত গাড়ি / পরিবহন (ঐচ্ছিক)' : 'Linked Vehicle (Optional)'}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <MenuItem value="">{isBn ? '-- কোনটি নয় --' : '-- None --'}</MenuItem>
                {(vehiclesQuery.data || []).map((v: any) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.vehicleType})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label={isBn ? 'সংযুক্ত মিলিং লাইন (ঐচ্ছিক)' : 'Linked Milling Line (Optional)'}
                value={productionLineId}
                onChange={(e) => setProductionLineId(e.target.value)}
              >
                <MenuItem value="">{isBn ? '-- কোনটি নয় --' : '-- None --'}</MenuItem>
                {(linesQuery.data || []).map((l: any) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Banking Details (Shown if Bank payment selected) */}
            {paymentMode === 'BANK' && (
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                  gap: 1.5,
                }}
              >
                <TextField
                  size="small"
                  label={isBn ? 'ব্যাংকের নাম' : 'Bank Name'}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <TextField
                  size="small"
                  label={isBn ? 'হিসাব নম্বর' : 'Account Number'}
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
                <TextField
                  size="small"
                  label={isBn ? 'চেক / ট্রানজেকশন নং' : 'Cheque / Txn Ref'}
                  value={chequeOrTxnNumber}
                  onChange={(e) => setChequeOrTxnNumber(e.target.value)}
                />
              </Box>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' },
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                size="small"
                label={isBn ? 'বিল / ক্যাশমেমো রেফারেন্স' : 'Bill / Invoice Ref #'}
                value={billReference}
                onChange={(e) => setBillReference(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'মন্তব্য ও নোট' : 'Remarks / Notes'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Line Items Table */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {isBn ? 'খরচের বিবরণ ও আইটেম লাইন' : 'Expense Breakdown Lines'}
            </Typography>

            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell width="40%">{isBn ? 'বিবরণ' : 'Description'}</TableCell>
                  <TableCell width="15%">{isBn ? 'পরিমাণ' : 'Qty'}</TableCell>
                  <TableCell width="15%">{isBn ? 'দর (টাকা)' : 'Rate'}</TableCell>
                  <TableCell width="20%">{isBn ? 'মোট টাকা' : 'Amount (BDT)'}</TableCell>
                  <TableCell width="10%" align="center"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        required
                        size="small"
                        fullWidth
                        placeholder="e.g. Unit charges, parts, contract labor"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="0"
                        value={line.quantity || ''}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="0.00"
                        value={line.unitPrice || ''}
                        onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        required
                        size="small"
                        type="number"
                        placeholder="0.00"
                        value={line.amount}
                        onChange={(e) => handleLineChange(idx, 'amount', e.target.value)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={lines.length <= 1}
                        onClick={() => handleRemoveLine(idx)}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              size="small"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={handleAddLine}
              sx={{ mt: 1 }}
            >
              {isBn ? '+ আরও লাইন যোগ করুন' : '+ Add Line Item'}
            </Button>

            {/* Totals Summary */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1,
              }}
            >
              <Typography variant="body2">
                {isBn ? 'সাবটোটাল:' : 'Subtotal:'}{' '}
                <strong>৳ {formSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">{isBn ? 'ভ্যাট / ট্যাক্স:' : 'Tax / VAT:'}</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  sx={{ width: 120 }}
                />
              </Stack>
              <Divider sx={{ width: 220, my: 0.5 }} />
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {isBn ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'} ৳{' '}
                {formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setFormOpen(false)} disabled={busy}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="outlined" disabled={busy}>
              {isBn ? 'ড্রাফট হিসেবে সংরক্ষণ' : 'Save as Draft'}
            </Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={(e) => handleSaveForm(e, true)}
            >
              {isBn ? 'সংরক্ষণ ও অনুমোদন জমা' : 'Save & Submit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reject Voucher Dialog */}
      <Dialog
        open={Boolean(rejectDialogExpense)}
        onClose={() => setRejectDialogExpense(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          {isBn ? 'খরচ ভাউচার প্রত্যাখ্যান' : 'Reject Expense Voucher'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            {isBn
              ? `ভাউচার ${rejectDialogExpense?.voucherNumber} প্রত্যাখ্যানের কারণ উল্লেখ করুন:`
              : `Specify reason for rejecting ${rejectDialogExpense?.voucherNumber}:`}
          </Typography>
          <TextField
            autoFocus
            required
            fullWidth
            size="small"
            multiline
            rows={3}
            label={isBn ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialogExpense(null)}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim()}
            onClick={handleReject}
          >
            {isBn ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Post to GL Dialog with Accounting Impact Preview */}
      <Dialog
        open={Boolean(postDialogExpense)}
        onClose={() => setPostDialogExpense(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'success.main' }}>
          {isBn
            ? 'জেনারেল লেজারে পোস্টিং নিশ্চিতকরণ (GL Double-Entry)'
            : 'Confirm Double-Entry GL Posting'}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            {isBn
              ? 'এই ভাউচার পোস্ট করার পর স্বয়ংক্রিয়ভাবে ব্যালেন্সড জার্নাল ভাউচার (JV) তৈরি হবে এবং ক্যাশ/ব্যাংক হিসাব থেকে অর্থ সমন্বয় করা হবে।'
              : 'Posting this voucher will generate a balanced double-entry Journal Voucher in the General Ledger (Debit = Credit).'}
          </Alert>

          {postDialogExpense && (
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                {postDialogExpense.voucherNumber} — {postDialogExpense.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {isBn ? 'মোট ব্যয়:' : 'Total Expense Amount:'}{' '}
                <strong>৳ {Number(postDialogExpense.totalAmount).toLocaleString()}</strong> (
                {PAYMENT_MODE_LABELS[postDialogExpense.paymentMode][isBn ? 'bn' : 'en']})
              </Typography>

              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                {isBn ? 'অ্যাকাউন্টিং এন্ট্রি (জার্নাল প্রভাব):' : 'Accounting Impact (Double-Entry):'}
              </Typography>

              <Table size="small" sx={{ bgcolor: 'background.paper', borderRadius: 1.5 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{isBn ? 'লেজার অ্যাকাউন্ট' : 'Ledger Account'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{isBn ? 'ডেবিট (Dr)' : 'Debit (Dr)'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{isBn ? 'ক্রেডিট (Cr)' : 'Credit (Cr)'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <code>EXP_{postDialogExpense.category}</code> ({CATEGORY_LABELS[postDialogExpense.category][isBn ? 'bn' : 'en']})
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ৳ {Number(postDialogExpense.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">৳ 0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <code>
                        {postDialogExpense.paymentMode === 'CASH'
                          ? 'ASSET_CASH'
                          : postDialogExpense.paymentMode === 'BANK'
                          ? 'ASSET_BANK'
                          : postDialogExpense.paymentMode === 'PETTY_CASH'
                          ? 'ASSET_PETTY_CASH'
                          : 'LIABILITY_ACCOUNTS_PAYABLE'}
                      </code>{' '}
                      ({PAYMENT_MODE_LABELS[postDialogExpense.paymentMode][isBn ? 'bn' : 'en']})
                    </TableCell>
                    <TableCell align="right">৳ 0.00</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                      ৳ {Number(postDialogExpense.totalAmount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'মোট (ডেবিট = ক্রেডিট)' : 'Total (Balanced)'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ৳ {Number(postDialogExpense.totalAmount).toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ৳ {Number(postDialogExpense.totalAmount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPostDialogExpense(null)}>
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button variant="contained" color="success" onClick={handleConfirmPost}>
            {isBn ? 'লেজারে পোস্ট করুন' : 'Post to General Ledger'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Printable Expense Voucher Dialog */}
      <Dialog
        open={Boolean(printExpense)}
        onClose={() => setPrintExpense(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            {isBn ? 'অফিসিয়াল খরচ ভাউচার' : 'Official Expense Voucher'}
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
          {printExpense && (
            <Box sx={{ maxWidth: 700, mx: 'auto', p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
              {/* Mill Header */}
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                  RICE MILL INDUSTRIES ERP
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  FACTORY EXPENSE & PAYMENT VOUCHER
                </Typography>
                <Divider sx={{ my: 1.5 }} />
              </Box>

              {/* Voucher Meta */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                  mb: 3,
                }}
              >
                <Typography variant="body2">
                  <strong>Voucher #:</strong> {printExpense.voucherNumber}
                </Typography>
                <Typography variant="body2" textAlign="right">
                  <strong>Date:</strong> {new Date(printExpense.expenseDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {CATEGORY_LABELS[printExpense.category]?.en || printExpense.category}
                </Typography>
                <Typography variant="body2" textAlign="right">
                  <strong>Cost Center:</strong> {TYPE_LABELS[printExpense.type]?.en || printExpense.type}
                </Typography>
                <Typography variant="body2">
                  <strong>Payee:</strong> {printExpense.payeePartner?.name || printExpense.payeeName || 'N/A'}
                </Typography>
                <Typography variant="body2" textAlign="right">
                  <strong>Payment Mode:</strong> {printExpense.paymentMode}
                </Typography>
                {printExpense.billReference && (
                  <Typography variant="body2">
                    <strong>Bill Ref:</strong> {printExpense.billReference}
                  </Typography>
                )}
                {printExpense.chequeOrTxnNumber && (
                  <Typography variant="body2" textAlign="right">
                    <strong>Cheque/Txn #:</strong> {printExpense.chequeOrTxnNumber}
                  </Typography>
                )}
              </Box>

              {/* Items Breakdown */}
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead sx={{ bgcolor: '#eee' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Rate (BDT)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount (BDT)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {printExpense.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{l.description}</TableCell>
                      <TableCell align="right">{l.quantity || '—'}</TableCell>
                      <TableCell align="right">
                        {l.unitPrice ? Number(l.unitPrice).toFixed(2) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {Number(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                      Subtotal:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ৳ {Number(printExpense.subtotalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  {Number(printExpense.taxAmount) > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                        Tax / VAT:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ৳ {Number(printExpense.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell colSpan={4} align="right" sx={{ fontWeight: 800, fontSize: 15 }}>
                      NET TOTAL:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: 15 }}>
                      ৳ {Number(printExpense.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Signatures */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                  mt: 6,
                  pt: 2,
                  textAlign: 'center',
                }}
              >
                <Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>Prepared By</Typography>
                </Box>
                <Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>Verified By</Typography>
                </Box>
                <Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>Accounts Officer</Typography>
                </Box>
                <Box>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" fontWeight={600}>Factory Manager</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setPrintExpense(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

