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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { AppAutocomplete, AppSelect, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

type Row<T> = { data: T[]; meta?: { total: number } };

type Customer = {
  id: string;
  name: string;
  businessName?: string | null;
  phone?: string | null;
  code: string;
};

type Item = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

type StackLocation = {
  id: string;
  code: string;
  godown: { name: string };
};

type SalesOrderLine = {
  id: string;
  itemId: string;
  stackId: string;
  bagCount?: number | null;
  quantityKg: string;
  fulfilledKg: string;
  unitRate: string;
  lineAmount: string;
  item: Item;
  stack: StackLocation;
};

type SalesOrder = {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  customerId: string;
  customer: Customer;
  lines: SalesOrderLine[];
};

type DispatchLine = {
  id: string;
  salesOrderLineId: string;
  itemId: string;
  stackId: string;
  bagCount: number;
  netWeightKg: string;
  unitRate: string;
  lineAmount: string;
  item: Item;
  stack: StackLocation;
};

type Dispatch = {
  id: string;
  challanNumber: string;
  gatePassNumber: string;
  vehicleNumber: string;
  salesOrderId: string;
  status: string;
  lines: DispatchLine[];
};

type SalesReturnLine = {
  id: string;
  salesOrderLineId: string;
  dispatchLineId?: string | null;
  itemId: string;
  restockStackId: string;
  condition: 'INTACT' | 'DAMAGED';
  bagCount: number;
  returnKg: string;
  unitRate: string;
  lineAmount: string;
  damageNotes?: string | null;
  item: Item;
  restockStack: StackLocation;
  salesOrderLine: { id: string; quantityKg: string; fulfilledKg: string; unitRate: string };
  dispatchLine?: { id: string; netWeightKg: string; unitRate: string } | null;
};

type SalesReturn = {
  id: string;
  returnNumber: string;
  creditNoteNumber?: string | null;
  salesOrderId: string;
  dispatchId?: string | null;
  customerId: string;
  type: 'FULL' | 'PARTIAL' | 'DAMAGED';
  settlement: 'CREDIT_NOTE' | 'REPLACEMENT' | 'REFUND';
  status: 'DRAFT' | 'APPROVED' | 'POSTED' | 'CANCELLED';
  returnDate: string;
  reason: string;
  totalBags: number;
  totalWeightKg: string;
  totalAmount: string;
  remarks?: string | null;
  createdAt: string;
  customer: Customer;
  salesOrder: { id: string; orderNumber: string; status: string; channel: string };
  dispatch?: { id: string; challanNumber: string; gatePassNumber: string; vehicleNumber: string } | null;
  lines: SalesReturnLine[];
};

interface SalesReturnPageProps {
  companyId: string;
  factoryId: string;
  language: string;
  onSaved: (message: string) => void;
}

export function SalesReturnPage({ companyId, factoryId, language, onSaved }: SalesReturnPageProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';
  const lang = isBn ? 'bn' : 'en';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<SalesReturn | null>(null);

  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedDispatchId, setSelectedDispatchId] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnType, setReturnType] = useState<'FULL' | 'PARTIAL' | 'DAMAGED'>('PARTIAL');
  const [settlement, setSettlement] = useState<'CREDIT_NOTE' | 'REPLACEMENT' | 'REFUND'>('CREDIT_NOTE');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  type ReturnFormLine = {
    salesOrderLineId: string;
    dispatchLineId?: string;
    itemId: string;
    itemName: string;
    restockStackId: string;
    condition: 'INTACT' | 'DAMAGED';
    bagCount: number;
    returnKg: string;
    unitRate: string;
    lineAmount: string;
    damageNotes: string;
    maxKg: number;
  };
  const [formLines, setFormLines] = useState<ReturnFormLine[]>([]);

  // Fetch returns list
  const { data: returnsData, isLoading } = useQuery<Row<SalesReturn>>({
    queryKey: ['sales-returns', companyId, factoryId, statusFilter, typeFilter, search],
    queryFn: () =>
      apiRequest(
        `/sales-returns${queryString({
          companyId,
          factoryId,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          search: search.trim() || undefined,
        })}`,
      ),
    enabled: Boolean(companyId && factoryId),
  });

  // Fetch approved/posted sales orders for creation
  const { data: ordersData } = useQuery<Row<SalesOrder>>({
    queryKey: ['sales-orders-for-return', companyId, factoryId],
    queryFn: () =>
      apiRequest(
        `/sales${queryString({
          companyId,
          factoryId,
          pageSize: 100,
        })}`,
      ),
    enabled: Boolean(companyId && factoryId && createOpen),
  });

  // Fetch posted dispatches for selected order
  const { data: dispatchesData } = useQuery<Row<Dispatch>>({
    queryKey: ['dispatches-for-return', companyId, factoryId, selectedOrderId],
    queryFn: () =>
      apiRequest(
        `/dispatch${queryString({
          companyId,
          factoryId,
          salesOrderId: selectedOrderId || undefined,
          status: 'POSTED',
          pageSize: 100,
        })}`,
      ),
    enabled: Boolean(companyId && factoryId && createOpen && selectedOrderId),
  });

  // Fetch warehouse stacks for restock target
  const { data: stacksData } = useQuery<Array<{ id: string; code: string; godown: { name: string } }>>({
    queryKey: ['stacks', companyId, factoryId],
    queryFn: () => apiRequest(`/stacks${queryString({ companyId, factoryId })}`),
    enabled: Boolean(companyId && factoryId),
  });

  const returns = useMemo(() => returnsData?.data ?? [], [returnsData]);
  const availableOrders = useMemo(
    () => (ordersData?.data ?? []).filter((o) => o.status === 'APPROVED' || o.status === 'POSTED'),
    [ordersData],
  );
  const availableDispatches = useMemo(() => dispatchesData?.data ?? [], [dispatchesData]);
  const availableStacks = useMemo(() => stacksData ?? [], [stacksData]);

  // Handle order selection
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedDispatchId('');
    setFieldErrors({});
    setError(null);
    const order = availableOrders.find((o) => o.id === orderId);
    if (!order) {
      setFormLines([]);
      return;
    }

    const defaultStackId = availableStacks[0]?.id || '';
    const lines: ReturnFormLine[] = order.lines.map((l) => {
      const fulfilled = Number(l.fulfilledKg || l.quantityKg);
      const rate = Number(l.unitRate);
      return {
        salesOrderLineId: l.id,
        itemId: l.itemId,
        itemName: l.item?.name || 'Rice Product',
        restockStackId: l.stackId || defaultStackId,
        condition: 'INTACT',
        bagCount: l.bagCount || 0,
        returnKg: fulfilled.toString(),
        unitRate: rate.toFixed(2),
        lineAmount: (fulfilled * rate).toFixed(2),
        damageNotes: '',
        maxKg: fulfilled,
      };
    });
    setFormLines(lines);
  };

  // Handle dispatch selection (refines max allowed weight based on specific challan)
  const handleDispatchChange = (dispatchId: string) => {
    setSelectedDispatchId(dispatchId);
    setFieldErrors((p) => {
      const next = { ...p };
      Object.keys(next).forEach((k) => {
        if (k.startsWith('line-')) delete next[k];
      });
      return next;
    });
    if (!dispatchId) {
      if (selectedOrderId) handleOrderChange(selectedOrderId);
      return;
    }

    const dispatch = availableDispatches.find((d) => d.id === dispatchId);
    if (!dispatch) return;

    const defaultStackId = availableStacks[0]?.id || '';
    const lines: ReturnFormLine[] = dispatch.lines.map((dl) => {
      const weight = Number(dl.netWeightKg);
      const rate = Number(dl.unitRate);
      return {
        salesOrderLineId: dl.salesOrderLineId,
        dispatchLineId: dl.id,
        itemId: dl.itemId,
        itemName: dl.item?.name || 'Rice Product',
        restockStackId: dl.stackId || defaultStackId,
        condition: 'INTACT',
        bagCount: dl.bagCount || 0,
        returnKg: weight.toString(),
        unitRate: rate.toFixed(2),
        lineAmount: (weight * rate).toFixed(2),
        damageNotes: '',
        maxKg: weight,
      };
    });
    setFormLines(lines);
  };

  const handleLineKgChange = (index: number, newKg: string) => {
    setFieldErrors((p) => ({ ...p, [`line-${index}-returnKg`]: '' }));
    setFormLines((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (!target) return prev;
      const kgNum = Math.max(0, Number(newKg) || 0);
      const rateNum = Number(target.unitRate) || 0;
      target.returnKg = newKg;
      target.lineAmount = (kgNum * rateNum).toFixed(2);
      return copy;
    });
  };

  const handleOpenCreate = () => {
    setSelectedOrderId('');
    setSelectedDispatchId('');
    setReturnNumber(`RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCreditNoteNumber(`CN-${Date.now().toString().slice(-6)}`);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setReturnType('PARTIAL');
    setSettlement('CREDIT_NOTE');
    setReason('');
    setRemarks('');
    setFormLines([]);
    setFieldErrors({});
    setError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'selectedOrderId', label: isBn ? 'বিক্রয় আদেশ' : 'Sales Order', value: selectedOrderId, required: true, isSelect: true },
      { name: 'returnNumber', label: isBn ? 'ফেরত নং' : 'Return Number', value: returnNumber, required: true },
      { name: 'returnDate', label: isBn ? 'ফেরত তারিখ' : 'Return Date', value: returnDate, required: true, type: 'date' },
      { name: 'reason', label: isBn ? 'ফেরতের কারণ' : 'Reason for Return', value: reason, required: true },
    ];

    if (selectedOrderId && formLines.length > 0) {
      const validLines = formLines.filter((l) => Number(l.returnKg) > 0);
      if (!validLines.length) {
        rules.push({
          name: 'line-0-returnKg',
          label: `${isBn ? 'ফেরত কেজি' : 'Return KG'} (#1)`,
          value: formLines[0]?.returnKg,
          custom: () =>
            isBn
              ? 'কমপক্ষে একটি পণ্যের ফেরত পরিমাণ ০ কেজির বেশি হতে হবে।'
              : 'At least one line must have a return quantity greater than 0 KG.',
        });
      }
      formLines.forEach((l, i) => {
        if (Number(l.returnKg) > 0) {
          rules.push({
            name: `line-${i}-restockStackId`,
            label: `${isBn ? 'ফেরত স্ট্যাক' : 'Restock Stack'} (${l.itemName})`,
            value: l.restockStackId,
            required: true,
            isSelect: true,
          });
          if (Number(l.returnKg) > l.maxKg) {
            rules.push({
              name: `line-${i}-returnKg`,
              label: `${isBn ? 'ফেরত কেজি' : 'Return KG'} (${l.itemName})`,
              value: l.returnKg,
              custom: () =>
                isBn
                  ? `সর্বোচ্চ অনুমোদিত ${l.maxKg} KG এর বেশি ফেরত দেওয়া যাবে না।`
                  : `Cannot exceed maximum returnable ${l.maxKg} KG.`,
            });
          }
          if (Number(l.unitRate) < 0) {
            rules.push({
              name: `line-${i}-unitRate`,
              label: `${isBn ? 'দর/কেজি' : 'Rate/KG'} (${l.itemName})`,
              value: l.unitRate,
              type: 'nonNegativeNumber',
            });
          }
        } else if (Number(l.returnKg) < 0) {
          rules.push({
            name: `line-${i}-returnKg`,
            label: `${isBn ? 'ফেরত কেজি' : 'Return KG'} (${l.itemName})`,
            value: l.returnKg,
            type: 'nonNegativeNumber',
          });
        }
      });
    }

    const validation = validateFormFields(rules, lang);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    const order = availableOrders.find((o) => o.id === selectedOrderId);
    if (!order) return;
    const validLines = formLines.filter((l) => Number(l.returnKg) > 0);

    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await apiRequest('/sales-returns', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          salesOrderId: selectedOrderId,
          dispatchId: selectedDispatchId || undefined,
          customerId: order.customerId,
          returnNumber: returnNumber.trim(),
          creditNoteNumber: creditNoteNumber.trim() || undefined,
          type: returnType,
          settlement,
          returnDate: new Date(returnDate).toISOString(),
          reason: reason.trim(),
          remarks: remarks.trim() || undefined,
          lines: validLines.map((l) => ({
            salesOrderLineId: l.salesOrderLineId,
            dispatchLineId: l.dispatchLineId || undefined,
            itemId: l.itemId,
            restockStackId: l.restockStackId,
            condition: l.condition,
            bagCount: l.bagCount || 0,
            returnKg: l.returnKg,
            unitRate: l.unitRate,
            damageNotes: l.condition === 'DAMAGED' ? l.damageNotes : undefined,
          })),
        }),
      });
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      onSaved(isBn ? 'বিক্রয় ফেরত রেকর্ড সফলভাবে তৈরি হয়েছে।' : 'Sales return record created successfully.');
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to create sales return.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (ret: SalesReturn) => {
    if (!confirm(isBn ? `ফেরত #${ret.returnNumber} অনুমোদন করবেন?` : `Approve return #${ret.returnNumber}?`)) return;
    setActionBusyId(ret.id);
    try {
      await apiRequest(`/sales-returns/${ret.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      onSaved(isBn ? 'বিক্রয় ফেরত অনুমোদিত হয়েছে।' : 'Sales return approved.');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Approval failed.'));
    } finally {
      setActionBusyId('');
    }
  };

  const handlePost = async (ret: SalesReturn) => {
    if (
      !confirm(
        isBn
          ? `ফেরত #${ret.returnNumber} পোস্ট করবেন? এটি গুদামে পণ্য মজুদ যোগ করবে এবং ক্রেডিট নোট প্রস্তুত করবে।`
          : `Post return #${ret.returnNumber}? This will restock inventory and finalize customer credit/ledger impact.`,
      )
    )
      return;
    setActionBusyId(ret.id);
    try {
      await apiRequest(`/sales-returns/${ret.id}/post`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onSaved(isBn ? 'বিক্রয় ফেরত পোস্ট হয়েছে এবং মজুদ আপডেট করা হয়েছে।' : 'Sales return posted and inventory restocked.');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Posting failed.'));
    } finally {
      setActionBusyId('');
    }
  };

  const handleCancel = async (ret: SalesReturn) => {
    if (!confirm(isBn ? `ফেরত #${ret.returnNumber} বাতিল করবেন?` : `Cancel return #${ret.returnNumber}?`)) return;
    setActionBusyId(ret.id);
    try {
      await apiRequest(`/sales-returns/${ret.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      onSaved(isBn ? 'বিক্রয় ফেরত বাতিল হয়েছে।' : 'Sales return cancelled.');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Cancellation failed.'));
    } finally {
      setActionBusyId('');
    }
  };

  // KPI Calculations
  const totalCount = returns.length;
  const draftCount = returns.filter((r) => r.status === 'DRAFT').length;
  const approvedCount = returns.filter((r) => r.status === 'APPROVED').length;
  const postedCount = returns.filter((r) => r.status === 'POSTED').length;
  const totalReturnAmount = returns
    .filter((r) => r.status !== 'CANCELLED')
    .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

  const formTotalWeight = formLines.reduce((sum, l) => sum + (Number(l.returnKg) || 0), 0);
  const formTotalAmount = formLines.reduce((sum, l) => sum + (Number(l.lineAmount) || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'মোট ফেরত' : 'Total Returns'}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {totalCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'খসড়া' : 'Drafts'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="warning.main">
            {draftCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'অনুমোদিত' : 'Approved'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="info.main">
            {approvedCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'পোস্টেড' : 'Posted / Settled'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">
            {postedCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'মোট ফেরত মূল্য' : 'Total Return Value'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            ৳ {totalReturnAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Paper>
      </Box>

      {/* Action and Filter Bar */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
            <AppTextField
              fieldName="searchReturns"
              fullWidth={false}
              placeholder={isBn ? 'খুঁজুন (ফেরত নং, ক্রেডিট নোট, ক্রেতা)...' : 'Search returns, credit note, customer...'}
              value={search}
              onValueChange={(val) => setSearch(val)}
              sx={{ minWidth: 240 }}
            />
            <AppSelect
              fieldName="statusFilter"
              fullWidth={false}
              label={isBn ? 'অবস্থা' : 'Status'}
              value={statusFilter}
              options={[
                { value: 'ALL', label: isBn ? 'সকল অবস্থা' : 'All Statuses' },
                { value: 'DRAFT', label: isBn ? 'খসড়া (Draft)' : 'Draft' },
                { value: 'APPROVED', label: isBn ? 'অনুমোদিত (Approved)' : 'Approved' },
                { value: 'POSTED', label: isBn ? 'পোস্টেড (Posted)' : 'Posted' },
                { value: 'CANCELLED', label: isBn ? 'বাতিল (Cancelled)' : 'Cancelled' },
              ]}
              onChange={(val) => setStatusFilter(val)}
              sx={{ minWidth: 165 }}
            />
            <AppSelect
              fieldName="typeFilter"
              fullWidth={false}
              label={isBn ? 'ফেরতের ধরন' : 'Return Type'}
              value={typeFilter}
              options={[
                { value: 'ALL', label: isBn ? 'সকল ধরন' : 'All Types' },
                { value: 'FULL', label: isBn ? 'পূর্ণাঙ্গ ফেরত (Full)' : 'Full Return' },
                { value: 'PARTIAL', label: isBn ? 'আংশিক ফেরত (Partial)' : 'Partial Return' },
                { value: 'DAMAGED', label: isBn ? 'ক্ষতিগ্রস্ত ফেরত (Damaged)' : 'Damaged Return' },
              ]}
              onChange={(val) => setTypeFilter(val)}
              sx={{ minWidth: 175 }}
            />
          </Stack>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentReturnRoundedIcon />}
            onClick={handleOpenCreate}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {isBn ? '+ নতুন বিক্রয় ফেরত' : '+ New Sales Return'}
          </Button>
        </Stack>
      </Paper>

      {/* Main Register Table */}
      <Paper sx={{ borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1150 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফেরত নং' : 'Return No'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ক্রেডিট নোট' : 'Credit Note'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ক্রেতা' : 'Customer'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বিক্রয় আদেশ / চালান' : 'Order / Challan'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ধরন ও নিষ্পত্তি' : 'Type & Settlement'}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বস্তা' : 'Bags'}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফেরত ওজন (কেজি)' : 'Return KG'}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মোট মূল্য' : 'Amount'}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'অবস্থা' : 'Status'}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'কার্যক্রম' : 'Actions'}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{isBn ? 'লোড হচ্ছে...' : 'Loading sales returns...'}</Typography>
                </TableCell>
              </TableRow>
            ) : returns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{isBn ? 'কোনো বিক্রয় ফেরত রেকর্ড পাওয়া যায়নি।' : 'No sales returns found.'}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              returns.map((ret) => (
                <TableRow key={ret.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{ret.returnNumber}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {ret.creditNoteNumber ? (
                      <Chip label={ret.creditNoteNumber} size="small" variant="outlined" color="primary" />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{ret.returnDate ? new Date(ret.returnDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600} noWrap title={ret.customer?.name}>
                      {ret.customer?.name}
                    </Typography>
                    {ret.customer?.businessName && (
                      <Typography variant="caption" color="text.secondary" noWrap title={ret.customer.businessName}>
                        {ret.customer.businessName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{ret.salesOrder?.orderNumber}</Typography>
                    {ret.dispatch && (
                      <Typography variant="caption" color="text.secondary">
                        Challan: {ret.dispatch.challanNumber}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        label={ret.type}
                        size="small"
                        color={ret.type === 'DAMAGED' ? 'error' : ret.type === 'FULL' ? 'warning' : 'default'}
                      />
                      <Chip label={ret.settlement} size="small" variant="outlined" />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{ret.totalBags}</TableCell>
                  <TableCell align="right">
                    {Number(ret.totalWeightKg).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ৳ {Number(ret.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={ret.status}
                      color={
                        ret.status === 'POSTED'
                          ? 'success'
                          : ret.status === 'APPROVED'
                          ? 'info'
                          : ret.status === 'DRAFT'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {ret.status === 'DRAFT' && (
                        <Button size="small" variant="outlined" color="info" onClick={() => handleApprove(ret)} disabled={actionBusyId === ret.id || busy}>
                          {isBn ? 'অনুমোদন' : 'Approve'}
                        </Button>
                      )}
                      {(ret.status === 'DRAFT' || ret.status === 'APPROVED') && (
                        <Button size="small" variant="contained" color="success" onClick={() => handlePost(ret)} disabled={actionBusyId === ret.id || busy}>
                          {isBn ? 'পোস্ট' : 'Post'}
                        </Button>
                      )}
                      {(ret.status === 'DRAFT' || ret.status === 'APPROVED') && (
                        <Button size="small" variant="text" color="error" onClick={() => handleCancel(ret)} disabled={actionBusyId === ret.id || busy}>
                          {isBn ? 'বাতিল' : 'Cancel'}
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PrintRoundedIcon />}
                        onClick={() => setPrintDoc(ret)}
                      >
                        {isBn ? 'ক্রেডিট নোট' : 'Credit Note'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* CREATE RETURN DIALOG */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        title={isBn ? 'নতুন বিক্রয় ফেরত ও ক্রেডিট নোট তৈরি' : 'Create Sales Return & Credit Note'}
        error={error}
        onClearError={() => setError(null)}
        loading={busy}
        submitLabel={isBn ? 'সংরক্ষণ করুন (খসড়া)' : 'Save (Draft)'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="md"
      >
        <FormSection title={isBn ? 'আদেশ ও চালানের তথ্য' : 'Order & Challan Reference'}>
          <FormGrid columns={{ xs: 1, sm: 2 }}>
            <AppAutocomplete
              fieldName="selectedOrderId"
              required
              label={isBn ? 'বিক্রয় আদেশ নির্বাচন করুন' : 'Select Sales Order'}
              value={selectedOrderId}
              errorText={fieldErrors.selectedOrderId}
              options={availableOrders.map((ord) => ({
                value: ord.id,
                label: `${ord.orderNumber} — ${ord.customer?.name || ''}`,
                badge: ord.status,
              }))}
              emptyMessage={isBn ? 'কোনো অনুমোদিত বিক্রয় আদেশ নেই' : 'No approved/posted sales orders available'}
              onChange={(val) => handleOrderChange(val)}
            />

            <AppAutocomplete
              fieldName="selectedDispatchId"
              label={isBn ? 'চালান নির্বাচন করুন (ঐচ্ছিক)' : 'Select Challan (Optional)'}
              value={selectedDispatchId}
              prerequisite={{
                met: Boolean(selectedOrderId),
                message: isBn
                  ? 'চালান নির্বাচনের আগে অনুগ্রহ করে বিক্রয় আদেশ নির্বাচন করুন।'
                  : 'Please select a Sales Order first before linking a specific Challan.',
                focusField: 'selectedOrderId',
              }}
              helperText={isBn ? 'নির্দিষ্ট ডেলিভারি চালানের রেফারেন্স' : 'Link to specific Delivery Challan'}
              options={availableDispatches.map((dsp) => ({
                value: dsp.id,
                label: `${dsp.challanNumber} (Gate: ${dsp.gatePassNumber}, ${dsp.vehicleNumber})`,
              }))}
              emptyMessage={isBn ? 'এই আদেশের কোনো পোস্ট করা চালান নেই' : 'No posted challans for this order'}
              onChange={(val) => handleDispatchChange(val)}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={isBn ? 'ফেরত বিবরণ ও নিষ্পত্তি' : 'Return Metadata & Settlement'}>
          <FormGrid columns={{ xs: 1, sm: 2, md: 4 }}>
            <AppTextField
              fieldName="returnNumber"
              required
              label={isBn ? 'ফেরত নং' : 'Return Number'}
              value={returnNumber}
              errorText={fieldErrors.returnNumber}
              onValueChange={(val) => {
                setReturnNumber(val);
                setFieldErrors((p) => ({ ...p, returnNumber: '' }));
              }}
            />
            <AppTextField
              fieldName="creditNoteNumber"
              label={isBn ? 'ক্রেডিট নোট নং' : 'Credit Note Number'}
              value={creditNoteNumber}
              onValueChange={(val) => setCreditNoteNumber(val)}
            />
            <AppTextField
              fieldName="returnDate"
              type="date"
              required
              label={isBn ? 'ফেরত তারিখ' : 'Return Date'}
              value={returnDate}
              errorText={fieldErrors.returnDate}
              onValueChange={(val) => {
                setReturnDate(val);
                setFieldErrors((p) => ({ ...p, returnDate: '' }));
              }}
              InputLabelProps={{ shrink: true }}
            />
            <AppSelect
              fieldName="returnType"
              label={isBn ? 'ফেরতের ধরন' : 'Return Type'}
              value={returnType}
              options={[
                { value: 'PARTIAL', label: isBn ? 'আংশিক ফেরত (Partial)' : 'Partial Return' },
                { value: 'FULL', label: isBn ? 'সম্পূর্ণ ফেরত (Full)' : 'Full Return' },
                { value: 'DAMAGED', label: isBn ? 'ক্ষতিগ্রস্ত ফেরত (Damaged)' : 'Damaged Return' },
              ]}
              onChange={(val) => setReturnType(val as 'FULL' | 'PARTIAL' | 'DAMAGED')}
            />
          </FormGrid>

          <FormGrid columns={{ xs: 1, sm: 3 }} sx={{ mt: 2 }}>
            <AppSelect
              fieldName="settlement"
              label={isBn ? 'নিষ্পত্তির মাধ্যম' : 'Settlement Method'}
              value={settlement}
              options={[
                { value: 'CREDIT_NOTE', label: isBn ? 'ক্রেডিট নোট (লেজার সমন্বয়)' : 'Credit Note (Ledger Credit)' },
                { value: 'REPLACEMENT', label: isBn ? 'পণ্য প্রতিস্থাপন (পুনরায় সরবরাহ)' : 'Replacement (Re-dispatch)' },
                { value: 'REFUND', label: isBn ? 'অর্থ ফেরত (Cash / Bank Refund)' : 'Direct Refund' },
              ]}
              onChange={(val) => setSettlement(val as 'CREDIT_NOTE' | 'REPLACEMENT' | 'REFUND')}
            />
            <Box sx={{ gridColumn: { sm: 'span 2' } }}>
              <AppTextField
                fieldName="reason"
                required
                label={isBn ? 'ফেরতের কারণ' : 'Reason for Return'}
                placeholder={isBn ? 'যেমন: আর্দ্রতা বেশি / ভাঙা দানা / অতিরিক্ত পাঠানো হয়েছে' : 'e.g., High moisture, broken grains, over shipment'}
                value={reason}
                errorText={fieldErrors.reason}
                onValueChange={(val) => {
                  setReason(val);
                  setFieldErrors((p) => ({ ...p, reason: '' }));
                }}
              />
            </Box>
          </FormGrid>
        </FormSection>

        <FormSection title={isBn ? 'ফেরত পণ্যের তালিকা' : 'Return Items & Restock Stacks'}>
          {formLines.length === 0 ? (
            <Alert severity="info">
              {isBn ? 'উপরে বিক্রয় আদেশ নির্বাচন করুন।' : 'Please select a sales order above to load line items.'}
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'auto', borderRadius: 2 }}>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পণ্য' : 'Item'}</strong></TableCell>
                    <TableCell sx={{ minWidth: 130, whiteSpace: 'nowrap' }}><strong>{isBn ? 'অবস্থা' : 'Condition'}</strong></TableCell>
                    <TableCell sx={{ minWidth: 200, whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফেরত স্ট্যাক' : 'Restock Stack'}</strong></TableCell>
                    <TableCell sx={{ width: 95, whiteSpace: 'nowrap' }}><strong>{isBn ? 'বস্তা' : 'Bags'}</strong></TableCell>
                    <TableCell sx={{ width: 135, whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফেরত কেজি' : 'Return KG'}</strong></TableCell>
                    <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}><strong>{isBn ? 'দর/কেজি' : 'Rate/KG'}</strong></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মোট' : 'Amount'}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formLines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {line.itemName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Max available: {line.maxKg} KG
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <AppSelect
                          fieldName={`line-${idx}-condition`}
                          label={isBn ? 'অবস্থা' : 'Condition'}
                          value={line.condition}
                          options={[
                            { value: 'INTACT', label: isBn ? 'ভালো (Intact)' : 'Intact' },
                            { value: 'DAMAGED', label: isBn ? 'ক্ষতিগ্রস্ত (Damaged)' : 'Damaged' },
                          ]}
                          onChange={(val) => {
                            const cVal = val as 'INTACT' | 'DAMAGED';
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.condition = cVal;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppAutocomplete
                          fieldName={`line-${idx}-restockStackId`}
                          required
                          label={isBn ? 'স্ট্যাক' : 'Stack'}
                          value={line.restockStackId}
                          errorText={fieldErrors[`line-${idx}-restockStackId`]}
                          options={availableStacks.map((stk) => ({
                            value: stk.id,
                            label: `${stk.code} (${stk.godown?.name || ''})`,
                          }))}
                          onChange={(val) => {
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.restockStackId = val;
                              return c;
                            });
                            setFieldErrors((p) => ({ ...p, [`line-${idx}-restockStackId`]: '' }));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${idx}-bagCount`}
                          type="number"
                          value={line.bagCount}
                          inputProps={{ min: 0 }}
                          onValueChange={(val) => {
                            const num = parseInt(val, 10) || 0;
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.bagCount = num;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${idx}-returnKg`}
                          type="number"
                          unit="KG"
                          value={line.returnKg}
                          errorText={fieldErrors[`line-${idx}-returnKg`]}
                          inputProps={{ min: 0, max: line.maxKg, step: '.001' }}
                          onValueChange={(val) => handleLineKgChange(idx, val)}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${idx}-unitRate`}
                          type="number"
                          prefixText="৳"
                          value={line.unitRate}
                          errorText={fieldErrors[`line-${idx}-unitRate`]}
                          inputProps={{ min: 0, step: '.01' }}
                          onValueChange={(val) => {
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.unitRate = val;
                              c[idx]!.lineAmount = (Number(c[idx]!.returnKg || 0) * Number(val || 0)).toFixed(2);
                              return c;
                            });
                            setFieldErrors((p) => ({ ...p, [`line-${idx}-unitRate`]: '' }));
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ৳ {Number(line.lineAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </FormSection>

        {formLines.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {isBn ? 'মোট ফেরত ওজন:' : 'Total Return Weight:'}{' '}
                <strong>{formTotalWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} KG</strong>
              </Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {isBn ? 'মোট ক্রেডিট মূল্য:' : 'Total Credit Amount:'}{' '}
                ৳ {formTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Stack>
          </Paper>
        )}

        <AppTextField
          fieldName="returnRemarks"
          multiline
          rows={2}
          label={isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Remarks (Optional)'}
          value={remarks}
          onValueChange={(val) => setRemarks(val)}
        />
      </FormDialog>

      {/* PRINTABLE CREDIT NOTE DIALOG */}
      <Dialog open={Boolean(printDoc)} onClose={() => setPrintDoc(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{isBn ? 'বিক্রয় ফেরত ও ক্রেডিট নোট' : 'Sales Return & Credit Note Voucher'}</span>
          <Button variant="contained" size="small" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
            {isBn ? 'প্রিন্ট করুন' : 'Print Credit Note'}
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {printDoc && (
            <Box sx={{ p: 2, fontFamily: 'serif' }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                  RICE MILL ERP
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  OFFICIAL SALES RETURN & CREDIT NOTE
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Factory Operations & Accounts Department
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Meta Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {isBn ? 'ক্রেতার তথ্য' : 'Customer Information'}
                  </Typography>
                  <Typography variant="body2"><strong>{printDoc.customer?.name}</strong></Typography>
                  {printDoc.customer?.businessName && (
                    <Typography variant="body2">{printDoc.customer.businessName}</Typography>
                  )}
                  {printDoc.customer?.phone && (
                    <Typography variant="body2">Phone: {printDoc.customer.phone}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Code: {printDoc.customer?.code}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {isBn ? 'ভাউচার ও রেফারেন্স' : 'Voucher & References'}
                  </Typography>
                  <Typography variant="body2">
                    Return No: <strong>{printDoc.returnNumber}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Credit Note: <strong>{printDoc.creditNoteNumber || 'N/A'}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Order Ref: <strong>{printDoc.salesOrder?.orderNumber}</strong>
                  </Typography>
                  {printDoc.dispatch && (
                    <Typography variant="body2">
                      Challan: <strong>{printDoc.dispatch.challanNumber}</strong>
                    </Typography>
                  )}
                  <Typography variant="body2">
                    Date: {new Date(printDoc.returnDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Settlement: <strong>{printDoc.settlement}</strong> ({printDoc.type})
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Reason:</strong> {printDoc.reason}
                </Typography>
                {printDoc.remarks && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Remarks:</strong> {printDoc.remarks}
                  </Typography>
                )}
              </Box>

              {/* Line items table */}
              <Table size="small" sx={{ border: '1px solid #ccc', mb: 3 }}>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>SL</strong></TableCell>
                    <TableCell><strong>Item Description</strong></TableCell>
                    <TableCell><strong>Condition</strong></TableCell>
                    <TableCell><strong>Restock Stack</strong></TableCell>
                    <TableCell align="right"><strong>Bags</strong></TableCell>
                    <TableCell align="right"><strong>Returned KG</strong></TableCell>
                    <TableCell align="right"><strong>Unit Rate (৳)</strong></TableCell>
                    <TableCell align="right"><strong>Credit Amount (৳)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {printDoc.lines.map((ln, i) => (
                    <TableRow key={ln.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{ln.item?.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={ln.condition}
                          size="small"
                          color={ln.condition === 'DAMAGED' ? 'error' : 'success'}
                        />
                      </TableCell>
                      <TableCell>{ln.restockStack?.code} ({ln.restockStack?.godown?.name})</TableCell>
                      <TableCell align="right">{ln.bagCount}</TableCell>
                      <TableCell align="right">
                        {Number(ln.returnKg).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        {Number(ln.unitRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {Number(ln.lineAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={4}><strong>TOTAL</strong></TableCell>
                    <TableCell align="right"><strong>{printDoc.totalBags}</strong></TableCell>
                    <TableCell align="right">
                      <strong>{Number(printDoc.totalWeightKg).toLocaleString('en-US', { minimumFractionDigits: 2 })} KG</strong>
                    </TableCell>
                    <TableCell />
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      <strong>৳ {Number(printDoc.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Signatures */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, pt: 6, mt: 4 }}>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Prepared By (Store Officer)</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Inspected By (Quality/QC)</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Authorized By (Accounts Manager)</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDoc(null)}>{isBn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

