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
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';

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
  const isBn = language === 'bn';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setError(isBn ? 'বিক্রয় আদেশ নির্বাচন করুন।' : 'Please select a sales order.');
      return;
    }
    const order = availableOrders.find((o) => o.id === selectedOrderId);
    if (!order) return;

    const validLines = formLines.filter((l) => Number(l.returnKg) > 0);
    if (!validLines.length) {
      setError(isBn ? 'কমপক্ষে একটি পণ্যের ফেরত পরিমাণ দিন।' : 'At least one line must have a return quantity greater than 0.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiRequest('/sales-returns', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          salesOrderId: selectedOrderId,
          dispatchId: selectedDispatchId || undefined,
          customerId: order.customerId,
          returnNumber,
          creditNoteNumber: creditNoteNumber.trim() || undefined,
          type: returnType,
          settlement,
          returnDate: new Date(returnDate).toISOString(),
          reason: reason.trim() || (isBn ? 'গ্রাহক পণ্য ফেরত' : 'Customer Sales Return'),
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
      setError(err instanceof Error ? err.message : 'Failed to create sales return.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (ret: SalesReturn) => {
    if (!confirm(isBn ? `ফেরত #${ret.returnNumber} অনুমোদন করবেন?` : `Approve return #${ret.returnNumber}?`)) return;
    setBusy(true);
    try {
      await apiRequest(`/sales-returns/${ret.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      onSaved(isBn ? 'বিক্রয় ফেরত অনুমোদিত হয়েছে।' : 'Sales return approved.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy(false);
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
    setBusy(true);
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
      alert(err instanceof Error ? err.message : 'Posting failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (ret: SalesReturn) => {
    if (!confirm(isBn ? `ফেরত #${ret.returnNumber} বাতিল করবেন?` : `Cancel return #${ret.returnNumber}?`)) return;
    setBusy(true);
    try {
      await apiRequest(`/sales-returns/${ret.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      qc.invalidateQueries({ queryKey: ['sales-returns'] });
      onSaved(isBn ? 'বিক্রয় ফেরত বাতিল হয়েছে।' : 'Sales return cancelled.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cancellation failed.');
    } finally {
      setBusy(false);
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder={isBn ? 'খুঁজুন (ফেরত নং, ক্রেডিট নোট, ক্রেতা)...' : 'Search returns, credit note, customer...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <TextField
              select
              size="small"
              label={isBn ? 'অবস্থা' : 'Status'}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">{isBn ? 'সকল অবস্থা' : 'All Statuses'}</MenuItem>
              <MenuItem value="DRAFT">{isBn ? 'খসড়া (Draft)' : 'Draft'}</MenuItem>
              <MenuItem value="APPROVED">{isBn ? 'অনুমোদিত (Approved)' : 'Approved'}</MenuItem>
              <MenuItem value="POSTED">{isBn ? 'পোস্টেড (Posted)' : 'Posted'}</MenuItem>
              <MenuItem value="CANCELLED">{isBn ? 'বাতিল (Cancelled)' : 'Cancelled'}</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={isBn ? 'ফেরতের ধরন' : 'Return Type'}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">{isBn ? 'সকল ধরন' : 'All Types'}</MenuItem>
              <MenuItem value="FULL">{isBn ? 'পূর্ণাঙ্গ ফেরত (Full)' : 'Full Return'}</MenuItem>
              <MenuItem value="PARTIAL">{isBn ? 'আংশিক ফেরত (Partial)' : 'Partial Return'}</MenuItem>
              <MenuItem value="DAMAGED">{isBn ? 'ক্ষতিগ্রস্ত ফেরত (Damaged)' : 'Damaged Return'}</MenuItem>
            </TextField>
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
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell><strong>{isBn ? 'ফেরত নং' : 'Return No'}</strong></TableCell>
              <TableCell><strong>{isBn ? 'ক্রেডিট নোট' : 'Credit Note'}</strong></TableCell>
              <TableCell><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
              <TableCell><strong>{isBn ? 'ক্রেতা' : 'Customer'}</strong></TableCell>
              <TableCell><strong>{isBn ? 'বিক্রয় আদেশ / চালান' : 'Order / Challan'}</strong></TableCell>
              <TableCell><strong>{isBn ? 'ধরন ও নিষ্পত্তি' : 'Type & Settlement'}</strong></TableCell>
              <TableCell align="right"><strong>{isBn ? 'বস্তা' : 'Bags'}</strong></TableCell>
              <TableCell align="right"><strong>{isBn ? 'ফেরত ওজন (কেজি)' : 'Return KG'}</strong></TableCell>
              <TableCell align="right"><strong>{isBn ? 'মোট মূল্য' : 'Amount'}</strong></TableCell>
              <TableCell align="center"><strong>{isBn ? 'অবস্থা' : 'Status'}</strong></TableCell>
              <TableCell align="right"><strong>{isBn ? 'কার্যক্রম' : 'Actions'}</strong></TableCell>
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
                  <TableCell sx={{ fontWeight: 600 }}>{ret.returnNumber}</TableCell>
                  <TableCell>
                    {ret.creditNoteNumber ? (
                      <Chip label={ret.creditNoteNumber} size="small" variant="outlined" color="primary" />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{ret.returnDate ? new Date(ret.returnDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {ret.customer?.name}
                    </Typography>
                    {ret.customer?.businessName && (
                      <Typography variant="caption" color="text.secondary">
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
                        <Button size="small" variant="outlined" color="info" onClick={() => handleApprove(ret)} disabled={busy}>
                          {isBn ? 'অনুমোদন' : 'Approve'}
                        </Button>
                      )}
                      {(ret.status === 'DRAFT' || ret.status === 'APPROVED') && (
                        <Button size="small" variant="contained" color="success" onClick={() => handlePost(ret)} disabled={busy}>
                          {isBn ? 'পোস্ট' : 'Post'}
                        </Button>
                      )}
                      {(ret.status === 'DRAFT' || ret.status === 'APPROVED') && (
                        <Button size="small" variant="text" color="error" onClick={() => handleCancel(ret)} disabled={busy}>
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
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isBn ? 'নতুন বিক্রয় ফেরত ও ক্রেডিট নোট তৈরি' : 'Create Sales Return & Credit Note'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'বিক্রয় আদেশ নির্বাচন করুন' : 'Select Sales Order'}
                value={selectedOrderId}
                onChange={(e) => handleOrderChange(e.target.value)}
              >
                {availableOrders.map((ord) => (
                  <MenuItem key={ord.id} value={ord.id}>
                    {ord.orderNumber} — {ord.customer?.name} ({ord.status})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label={isBn ? 'চালান নির্বাচন করুন (ঐচ্ছিক)' : 'Select Challan (Optional)'}
                value={selectedDispatchId}
                onChange={(e) => handleDispatchChange(e.target.value)}
                disabled={!selectedOrderId}
                helperText={isBn ? 'নির্দিষ্ট ডেলিভারি চালানের রেফারেন্স' : 'Link to specific Delivery Challan'}
              >
                <MenuItem value="">{isBn ? '— কোনো নির্দিষ্ট চালান ছাড়া —' : '— None / General Order Return —'}</MenuItem>
                {availableDispatches.map((dsp) => (
                  <MenuItem key={dsp.id} value={dsp.id}>
                    Challan: {dsp.challanNumber} (Gate: {dsp.gatePassNumber}, Truck: {dsp.vehicleNumber})
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'ফেরত নং' : 'Return Number'}
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'ক্রেডিট নোট নং' : 'Credit Note Number'}
                value={creditNoteNumber}
                onChange={(e) => setCreditNoteNumber(e.target.value)}
              />
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'ফেরত তারিখ' : 'Return Date'}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                size="small"
                label={isBn ? 'ফেরতের ধরন' : 'Return Type'}
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as 'FULL' | 'PARTIAL' | 'DAMAGED')}
              >
                <MenuItem value="PARTIAL">{isBn ? 'আংশিক ফেরত (Partial)' : 'Partial Return'}</MenuItem>
                <MenuItem value="FULL">{isBn ? 'সম্পূর্ণ ফেরত (Full)' : 'Full Return'}</MenuItem>
                <MenuItem value="DAMAGED">{isBn ? 'ক্ষতিগ্রস্ত ফেরত (Damaged)' : 'Damaged Return'}</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
              <TextField
                select
                size="small"
                label={isBn ? 'নিষ্পত্তির মাধ্যম' : 'Settlement Method'}
                value={settlement}
                onChange={(e) => setSettlement(e.target.value as 'CREDIT_NOTE' | 'REPLACEMENT' | 'REFUND')}
              >
                <MenuItem value="CREDIT_NOTE">{isBn ? 'ক্রেডিট নোট (লেজার সমন্বয়)' : 'Credit Note (Ledger Credit)'}</MenuItem>
                <MenuItem value="REPLACEMENT">{isBn ? 'পণ্য প্রতিস্থাপন (পুনরায় সরবরাহ)' : 'Replacement (Re-dispatch)'}</MenuItem>
                <MenuItem value="REFUND">{isBn ? 'অর্থ ফেরত (Cash / Bank Refund)' : 'Direct Refund'}</MenuItem>
              </TextField>
              <TextField
                required
                size="small"
                label={isBn ? 'ফেরতের কারণ' : 'Reason for Return'}
                placeholder={isBn ? 'যেমন: আর্দ্রতা বেশি / ভাঙা দানা / অতিরিক্ত পাঠানো হয়েছে' : 'e.g., High moisture, broken grains, over shipment'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>

            {/* Item Lines */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
              {isBn ? 'ফেরত পণ্যের তালিকা' : 'Return Items & Stacks'}
            </Typography>

            {formLines.length === 0 ? (
              <Typography color="text.secondary" fontSize={13}>
                {isBn ? 'উপরে বিক্রয় আদেশ নির্বাচন করুন।' : 'Please select a sales order above to view line items.'}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell><strong>{isBn ? 'পণ্য' : 'Item'}</strong></TableCell>
                    <TableCell><strong>{isBn ? 'অবস্থা' : 'Condition'}</strong></TableCell>
                    <TableCell><strong>{isBn ? 'ফেরত স্ট্যাক' : 'Restock Stack'}</strong></TableCell>
                    <TableCell width={90}><strong>{isBn ? 'বস্তা' : 'Bags'}</strong></TableCell>
                    <TableCell width={120}><strong>{isBn ? 'ফেরত কেজি' : 'Return KG'}</strong></TableCell>
                    <TableCell width={100}><strong>{isBn ? 'দর/কেজি' : 'Rate/KG'}</strong></TableCell>
                    <TableCell align="right"><strong>{isBn ? 'মোট' : 'Amount'}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formLines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {line.itemName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Max available: {line.maxKg} KG
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={line.condition}
                          onChange={(e) => {
                            const val = e.target.value as 'INTACT' | 'DAMAGED';
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.condition = val;
                              return c;
                            });
                          }}
                          sx={{ minWidth: 100 }}
                        >
                          <MenuItem value="INTACT">{isBn ? 'ভালো (Intact)' : 'Intact'}</MenuItem>
                          <MenuItem value="DAMAGED">{isBn ? 'ক্ষতিগ্রস্ত (Damaged)' : 'Damaged'}</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={line.restockStackId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.restockStackId = val;
                              return c;
                            });
                          }}
                          sx={{ minWidth: 140 }}
                        >
                          {availableStacks.map((stk) => (
                            <MenuItem key={stk.id} value={stk.id}>
                              {stk.code} ({stk.godown?.name})
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={line.bagCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.bagCount = val;
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={line.returnKg}
                          onChange={(e) => handleLineKgChange(idx, e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={line.unitRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormLines((prev) => {
                              const c = [...prev];
                              c[idx]!.unitRate = val;
                              c[idx]!.lineAmount = (Number(c[idx]!.returnKg || 0) * Number(val || 0)).toFixed(2);
                              return c;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ৳ {Number(line.lineAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Total Footer */}
            {formLines.length > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
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

            <TextField
              size="small"
              multiline
              rows={2}
              label={isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Remarks (Optional)'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCreateOpen(false)} color="inherit">
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={busy || !formLines.length}>
              {isBn ? 'সংরক্ষণ করুন (খসড়া)' : 'Save (Draft)'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

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

