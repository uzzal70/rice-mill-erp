'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { AppAutocomplete, AppTextField, FormGrid, FormSection } from '@/components/form';
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
  channel: string;
  status: string;
  currency: string;
  totalAmount: string;
  customer: Customer;
  lines: SalesOrderLine[];
};

type DispatchLine = {
  id: string;
  salesOrderLineId: string;
  itemId: string;
  stackId: string;
  bagCount: number;
  grossWeightKg?: string | null;
  tareWeightKg?: string | null;
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
  status: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile?: string | null;
  totalBags: number;
  totalWeightKg: string;
  remarks?: string | null;
  postedAt?: string | null;
  customer: Customer;
  salesOrder: {
    id: string;
    orderNumber: string;
    channel: string;
    currency: string;
  };
  lines: DispatchLine[];
};

type FormLine = {
  salesOrderLineId: string;
  itemId: string;
  stackId: string;
  itemName: string;
  stackCode: string;
  orderedKg: string;
  fulfilledKg: string;
  remainingKg: string;
  unitRate: string;
  bagCount: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
};

const blankDispatchForm = () => ({
  salesOrderId: '',
  challanNumber: `DC-${Date.now().toString().slice(-6)}`,
  gatePassNumber: `GP-${Date.now().toString().slice(-6)}`,
  dispatchDate: new Date().toISOString().split('T')[0],
  vehicleNumber: '',
  driverName: '',
  driverMobile: '',
  remarks: '',
  lines: [] as FormLine[],
});

export function DispatchPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (s: string) => void;
}) {
  const bn = language === 'bn';
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(blankDispatchForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [challanDoc, setChallanDoc] = useState<Dispatch | null>(null);
  const [gatePassDoc, setGatePassDoc] = useState<Dispatch | null>(null);

  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });

  const dispatches = useQuery({
    queryKey: ['dispatches', companyId, factoryId],
    queryFn: () => apiRequest<Row<Dispatch>>(`/dispatch?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });

  const approvedOrders = useQuery({
    queryKey: ['approved-sales-orders', companyId, factoryId],
    queryFn: () =>
      apiRequest<Row<SalesOrder>>(
        `/sales/orders?${queryString({ companyId, factoryId, status: 'APPROVED', page: 1, pageSize: 100 })}`,
      ),
    enabled: Boolean(companyId && factoryId),
  });

  const selectedOrder = useMemo(() => {
    return (approvedOrders.data?.data ?? []).find((o) => o.id === form.salesOrderId);
  }, [approvedOrders.data, form.salesOrderId]);

  function handleOrderSelect(orderId: string) {
    setFieldErrors({});
    setError('');
    const order = (approvedOrders.data?.data ?? []).find((o) => o.id === orderId);
    if (!order) {
      setForm((prev) => ({ ...prev, salesOrderId: '', lines: [] }));
      return;
    }

    const lines: FormLine[] = order.lines.map((l) => {
      const remaining = Math.max(0, Number(l.quantityKg) - Number(l.fulfilledKg));
      return {
        salesOrderLineId: l.id,
        itemId: l.itemId,
        stackId: l.stackId,
        itemName: l.item.name,
        stackCode: `${l.stack.godown.name} / ${l.stack.code}`,
        orderedKg: l.quantityKg,
        fulfilledKg: l.fulfilledKg,
        remainingKg: remaining.toFixed(3),
        unitRate: l.unitRate,
        bagCount: l.bagCount ? String(l.bagCount) : '',
        grossWeightKg: '',
        tareWeightKg: '',
        netWeightKg: remaining > 0 ? remaining.toFixed(3) : '0',
      };
    });

    setForm((prev) => ({
      ...prev,
      salesOrderId: orderId,
      lines,
    }));
  }

  function handleWeightChange(index: number, field: 'grossWeightKg' | 'tareWeightKg' | 'netWeightKg', value: string) {
    setFieldErrors((prev) => ({
      ...prev,
      [`line-${index}-${field}`]: '',
      [`line-${index}-netWeightKg`]: field === 'netWeightKg' || field === 'grossWeightKg' || field === 'tareWeightKg' ? '' : prev[`line-${index}-netWeightKg`],
    }));
    setForm((prev) => {
      const updatedLines = [...prev.lines];
      const target = { ...updatedLines[index], [field]: value };
      if (field === 'grossWeightKg' || field === 'tareWeightKg') {
        const gross = Number(field === 'grossWeightKg' ? value : target.grossWeightKg);
        const tare = Number(field === 'tareWeightKg' ? value : target.tareWeightKg);
        if (gross > 0 && tare >= 0 && gross >= tare) {
          target.netWeightKg = (gross - tare).toFixed(3);
        }
      }
      updatedLines[index] = target;
      return { ...prev, lines: updatedLines };
    });
  }

  async function handleCreateDispatch(e: FormEvent) {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'salesOrderId', label: text.selectOrder, value: form.salesOrderId, required: true, isSelect: true },
      { name: 'challanNumber', label: text.challanNo, value: form.challanNumber, required: true },
      { name: 'gatePassNumber', label: text.gatePassNo, value: form.gatePassNumber, required: true },
      { name: 'dispatchDate', label: text.date, value: form.dispatchDate, required: true, type: 'date' },
      { name: 'vehicleNumber', label: text.vehicle, value: form.vehicleNumber, required: true },
      { name: 'driverName', label: text.driver, value: form.driverName, required: true },
    ];

    if (form.salesOrderId && form.lines.length > 0) {
      const hasAnyNet = form.lines.some((l) => Number(l.netWeightKg) > 0);
      if (!hasAnyNet) {
        rules.push({
          name: 'line-0-netWeightKg',
          label: `${text.net} (#1)`,
          value: form.lines[0]?.netWeightKg,
          custom: () =>
            bn
              ? 'অন্তত একটি পণ্যের নিট ওজন ০ কেজির বেশি হতে হবে।'
              : 'At least one item must have a net dispatch weight greater than 0 KG.',
        });
      }
      form.lines.forEach((l, i) => {
        if (l.grossWeightKg || l.tareWeightKg) {
          const gross = Number(l.grossWeightKg || 0);
          const tare = Number(l.tareWeightKg || 0);
          if (gross > 0 && tare > gross) {
            rules.push({
              name: `line-${i}-grossWeightKg`,
              label: `${text.gross} (${l.itemName})`,
              value: l.grossWeightKg,
              custom: () =>
                bn
                  ? 'মোট ওজন গাড়ির খালি ওজনের চেয়ে কম হতে পারবে না।'
                  : 'Gross weight cannot be less than tare weight.',
            });
          }
        }
        if (Number(l.netWeightKg) < 0) {
          rules.push({
            name: `line-${i}-netWeightKg`,
            label: `${text.net} (${l.itemName})`,
            value: l.netWeightKg,
            type: 'nonNegativeNumber',
          });
        } else if (Number(l.netWeightKg) > Number(l.remainingKg)) {
          rules.push({
            name: `line-${i}-netWeightKg`,
            label: `${text.net} (${l.itemName})`,
            value: l.netWeightKg,
            custom: () =>
              bn
                ? `অবশিষ্ট পরিমাণ (${Number(l.remainingKg).toLocaleString()} KG) এর বেশি সরবরাহ করা যাবে না।`
                : `Cannot exceed remaining order quantity (${Number(l.remainingKg).toLocaleString()} KG).`,
          });
        }
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
      await apiRequest('/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          salesOrderId: form.salesOrderId,
          challanNumber: form.challanNumber.trim(),
          gatePassNumber: form.gatePassNumber.trim(),
          dispatchDate: form.dispatchDate,
          vehicleNumber: form.vehicleNumber.trim(),
          driverName: form.driverName.trim(),
          driverMobile: form.driverMobile.trim() || undefined,
          remarks: form.remarks.trim() || undefined,
          lines: form.lines
            .filter((l) => Number(l.netWeightKg) > 0)
            .map((l) => ({
              salesOrderLineId: l.salesOrderLineId,
              itemId: l.itemId,
              stackId: l.stackId,
              bagCount: l.bagCount ? Number(l.bagCount) : 0,
              grossWeightKg: l.grossWeightKg || undefined,
              tareWeightKg: l.tareWeightKg || undefined,
              netWeightKg: l.netWeightKg,
            })),
        }),
      });
      setForm(blankDispatchForm());
      onSaved(bn ? 'ডেলিভারি চালান তৈরি হয়েছে।' : 'Delivery challan created.');
      await qc.invalidateQueries({ queryKey: ['dispatches', companyId, factoryId] });
      await qc.invalidateQueries({ queryKey: ['approved-sales-orders', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Could not create dispatch.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(row: Dispatch, action: 'approve' | 'post' | 'cancel') {
    setError('');
    setActionBusyId(row.id);
    try {
      await apiRequest(`/dispatch/${encodeURIComponent(row.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      const msg =
        action === 'approve'
          ? bn
            ? 'চালান অনুমোদিত হয়েছে।'
            : 'Dispatch approved.'
          : action === 'post'
            ? bn
              ? 'স্টক খালাস ও চালান পোস্ট সম্পন্ন হয়েছে।'
              : 'Stock issued and dispatch posted.'
            : bn
              ? 'চালান বাতিল হয়েছে।'
              : 'Dispatch cancelled.';
      onSaved(msg);
      await qc.invalidateQueries({ queryKey: ['dispatches', companyId, factoryId] });
      await qc.invalidateQueries({ queryKey: ['approved-sales-orders', companyId, factoryId] });
      await qc.invalidateQueries({ queryKey: ['sales-orders', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Action failed.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }

  const text = {
    title: bn ? 'পণ্য সরবরাহ ও চালান ব্যবস্থাপনা (Dispatch)' : 'Goods Dispatch & Challan Management',
    subtitle: bn
      ? 'অনুমোদিত বিক্রয় আদেশের বিপরীতে ডেলিভারি চালান, গেট পাস তৈরি ও স্টক খালাস'
      : 'Issue Delivery Challan, Gate Pass, and deduct warehouse stock for approved sales orders.',
    newDispatch: bn ? 'নতুন ডেলিভারি চালান ও গেট পাস' : 'Create Delivery Challan & Gate Pass',
    selectOrder: bn ? 'অনুমোদিত বিক্রয় আদেশ নির্বাচন করুন' : 'Select Approved Sales Order',
    challanNo: bn ? 'চালান নং' : 'Challan No.',
    gatePassNo: bn ? 'গেট পাস নং' : 'Gate Pass No.',
    date: bn ? 'চালানের তারিখ' : 'Dispatch Date',
    vehicle: bn ? 'গাড়ি নং' : 'Vehicle Number',
    driver: bn ? 'চালকের নাম' : 'Driver Name',
    driverMobile: bn ? 'চালকের মোবাইল' : 'Driver Mobile',
    remarks: bn ? 'মন্তব্য' : 'Remarks',
    customer: bn ? 'ক্রেতা' : 'Customer',
    channel: bn ? 'চ্যানেল' : 'Channel',
    order: bn ? 'আদেশ নং' : 'Order No.',
    item: bn ? 'পণ্য' : 'Item',
    stack: bn ? 'স্ট্যাক' : 'Stack',
    ordered: bn ? 'আদেশকৃত' : 'Ordered',
    fulfilled: bn ? 'পূর্ববর্তী সরবরাহ' : 'Prev Dispatched',
    remaining: bn ? 'অবশিষ্ট' : 'Remaining',
    bags: bn ? 'বস্তা' : 'Bags',
    gross: bn ? 'মোট ওজন (Gross)' : 'Gross (KG)',
    tare: bn ? 'গাড়ির ওজন (Tare)' : 'Tare (KG)',
    net: bn ? 'নিট সরবরাহ (KG)' : 'Net Dispatch (KG)',
    totalWeight: bn ? 'সর্বমোট নিট ওজন' : 'Total Net Weight',
    totalBags: bn ? 'সর্বমোট বস্তা' : 'Total Bags',
    create: bn ? 'চালান তৈরি করুন' : 'Create Dispatch',
    status: bn ? 'অবস্থা' : 'Status',
    actions: bn ? 'পদক্ষেপ' : 'Actions',
    approve: bn ? 'অনুমোদন' : 'Approve',
    post: bn ? 'স্টক খালাস / পোস্ট' : 'Post Stock Issue',
    cancel: bn ? 'বাতিল' : 'Cancel',
    printChallan: bn ? 'চালান' : 'Challan',
    printGatePass: bn ? 'গেট পাস' : 'Gate Pass',
    noDispatches: bn ? 'কোনো চালান পাওয়া যায়নি।' : 'No dispatches recorded yet.',
    noCompany: bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.',
  };

  if (!companyId || !factoryId) return <Alert severity="info">{text.noCompany}</Alert>;

  return (
    <Stack spacing={2.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <LocalShippingRoundedIcon color="primary" /> {text.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text.subtitle}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* CREATE DISPATCH FORM */}
      <Paper component="form" noValidate onSubmit={handleCreateDispatch} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          {text.newDispatch}
        </Typography>

        <Stack spacing={2.5}>
          <FormSection title={bn ? 'চালান ও পরিবহন তথ্য' : 'Challan & Transport Details'}>
            <FormGrid columns={{ xs: 1, sm: 2, md: 4 }}>
              <AppAutocomplete
                fieldName="salesOrderId"
                required
                label={text.selectOrder}
                value={form.salesOrderId}
                errorText={fieldErrors.salesOrderId}
                options={(approvedOrders.data?.data ?? []).map((o) => ({
                  value: o.id,
                  label: `${o.orderNumber} · ${o.customer.name}`,
                  badge: o.channel,
                }))}
                emptyMessage={
                  bn
                    ? 'কোনো অনুমোদিত বিক্রয় আদেশ নেই — আগে সেলস মডিউল থেকে অর্ডার অনুমোদন করুন'
                    : 'No approved sales orders available — approve a sales order first'
                }
                onChange={(val) => handleOrderSelect(val)}
              />

              <AppTextField
                fieldName="challanNumber"
                required
                label={text.challanNo}
                value={form.challanNumber}
                errorText={fieldErrors.challanNumber}
                onValueChange={(val) => {
                  setForm({ ...form, challanNumber: val });
                  setFieldErrors((p) => ({ ...p, challanNumber: '' }));
                }}
              />

              <AppTextField
                fieldName="gatePassNumber"
                required
                label={text.gatePassNo}
                value={form.gatePassNumber}
                errorText={fieldErrors.gatePassNumber}
                onValueChange={(val) => {
                  setForm({ ...form, gatePassNumber: val });
                  setFieldErrors((p) => ({ ...p, gatePassNumber: '' }));
                }}
              />

              <AppTextField
                fieldName="dispatchDate"
                required
                type="date"
                InputLabelProps={{ shrink: true }}
                label={text.date}
                value={form.dispatchDate}
                errorText={fieldErrors.dispatchDate}
                onValueChange={(val) => {
                  setForm({ ...form, dispatchDate: val });
                  setFieldErrors((p) => ({ ...p, dispatchDate: '' }));
                }}
              />

              <AppTextField
                fieldName="vehicleNumber"
                required
                label={text.vehicle}
                placeholder="e.g. DHAKA METRO-TA-11-2233"
                value={form.vehicleNumber}
                errorText={fieldErrors.vehicleNumber}
                onValueChange={(val) => {
                  setForm({ ...form, vehicleNumber: val });
                  setFieldErrors((p) => ({ ...p, vehicleNumber: '' }));
                }}
              />

              <AppTextField
                fieldName="driverName"
                required
                label={text.driver}
                value={form.driverName}
                errorText={fieldErrors.driverName}
                onValueChange={(val) => {
                  setForm({ ...form, driverName: val });
                  setFieldErrors((p) => ({ ...p, driverName: '' }));
                }}
              />

              <AppTextField
                fieldName="driverMobile"
                label={text.driverMobile}
                value={form.driverMobile}
                onValueChange={(val) => setForm({ ...form, driverMobile: val })}
              />

              <AppTextField
                fieldName="dispatchRemarks"
                label={text.remarks}
                value={form.remarks}
                onValueChange={(val) => setForm({ ...form, remarks: val })}
              />
            </FormGrid>
          </FormSection>

          {selectedOrder && (
            <Alert severity="info">
              <strong>{text.customer}:</strong> {selectedOrder.customer.name}{' '}
              {selectedOrder.customer.phone && `(${selectedOrder.customer.phone})`} |{' '}
              <strong>{text.channel}:</strong> {selectedOrder.channel} |{' '}
              <strong>{text.order}:</strong> {selectedOrder.orderNumber}
            </Alert>
          )}

          {/* Lines Table */}
          {form.lines.length > 0 && (
            <Paper variant="outlined" sx={{ overflow: 'auto', borderRadius: 2 }}>
              <Table size="small" sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.item}</strong></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.stack}</strong></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.ordered}</strong></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.fulfilled}</strong></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.remaining}</strong></TableCell>
                    <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}><strong>{text.bags}</strong></TableCell>
                    <TableCell sx={{ width: 145, whiteSpace: 'nowrap' }}><strong>{text.gross}</strong></TableCell>
                    <TableCell sx={{ width: 145, whiteSpace: 'nowrap' }}><strong>{text.tare}</strong></TableCell>
                    <TableCell sx={{ width: 155, whiteSpace: 'nowrap' }}><strong>{text.net}</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.lines.map((line, index) => (
                    <TableRow key={line.salesOrderLineId}>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{line.itemName}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{line.stackCode}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{Number(line.orderedKg).toLocaleString()} KG</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{Number(line.fulfilledKg).toLocaleString()} KG</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          label={`${Number(line.remainingKg).toLocaleString()} KG`}
                          size="small"
                          color={Number(line.remainingKg) > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${index}-bagCount`}
                          type="number"
                          value={line.bagCount}
                          onValueChange={(val) =>
                            setForm((prev) => {
                              const updated = [...prev.lines];
                              updated[index] = { ...updated[index], bagCount: val };
                              return { ...prev, lines: updated };
                            })
                          }
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${index}-grossWeightKg`}
                          type="number"
                          unit="KG"
                          value={line.grossWeightKg}
                          errorText={fieldErrors[`line-${index}-grossWeightKg`]}
                          onValueChange={(val) => handleWeightChange(index, 'grossWeightKg', val)}
                          inputProps={{ min: 0, step: '.001' }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${index}-tareWeightKg`}
                          type="number"
                          unit="KG"
                          value={line.tareWeightKg}
                          onValueChange={(val) => handleWeightChange(index, 'tareWeightKg', val)}
                          inputProps={{ min: 0, step: '.001' }}
                        />
                      </TableCell>
                      <TableCell>
                        <AppTextField
                          fieldName={`line-${index}-netWeightKg`}
                          required
                          type="number"
                          unit="KG"
                          value={line.netWeightKg}
                          errorText={fieldErrors[`line-${index}-netWeightKg`]}
                          onValueChange={(val) => handleWeightChange(index, 'netWeightKg', val)}
                          inputProps={{ min: 0, step: '.001', max: line.remainingKg }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              {text.totalBags}:{' '}
              {form.lines.reduce((sum, l) => sum + Number(l.bagCount || 0), 0)} |{' '}
              {text.totalWeight}:{' '}
              {form.lines
                .reduce((sum, l) => sum + Number(l.netWeightKg || 0), 0)
                .toLocaleString()}{' '}
              KG
            </Typography>

            <Button
              type="submit"
              variant="contained"
              size="medium"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ px: 3, fontWeight: 700 }}
            >
              {text.create}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* DISPATCH REGISTER TABLE */}
      <Paper sx={{ p: 2, overflowX: 'auto', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>
          {bn ? 'চালান ও গেট পাস রেজিস্টার' : 'Dispatch & Gate Pass Register'}
        </Typography>

        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.challanNo}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.gatePassNo}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.order}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.customer}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.vehicle}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.driver}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.totalBags}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.totalWeight}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{text.status}</strong></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.actions}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(dispatches.data?.data ?? []).map((d) => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace' }}>{d.challanNumber}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace' }}>{d.gatePassNumber}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{d.salesOrder.orderNumber}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="body2" fontWeight={600} noWrap title={d.customer.name}>
                    {d.customer.name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{d.vehicleNumber}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {d.driverName}
                  {d.driverMobile && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {d.driverMobile}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{d.totalBags}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  <strong>{Number(d.totalWeightKg).toLocaleString()} KG</strong>
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <Chip
                    label={d.status}
                    size="small"
                    color={
                      d.status === 'POSTED'
                        ? 'success'
                        : d.status === 'APPROVED'
                          ? 'primary'
                          : d.status === 'CANCELLED'
                            ? 'error'
                            : 'default'
                    }
                  />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PrintRoundedIcon />}
                      onClick={() => setChallanDoc(d)}
                    >
                      {text.printChallan}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<PrintRoundedIcon />}
                      onClick={() => setGatePassDoc(d)}
                    >
                      {text.printGatePass}
                    </Button>

                    {d.status === 'DRAFT' && (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={actionBusyId === d.id}
                        onClick={() => handleAction(d, 'approve')}
                      >
                        {text.approve}
                      </Button>
                    )}

                    {(d.status === 'APPROVED' || d.status === 'DRAFT') && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={actionBusyId === d.id}
                        onClick={() => handleAction(d, 'post')}
                      >
                        {text.post}
                      </Button>
                    )}

                    {d.status !== 'POSTED' && d.status !== 'CANCELLED' && (
                      <Button
                        size="small"
                        color="error"
                        disabled={actionBusyId === d.id}
                        onClick={() => handleAction(d, 'cancel')}
                      >
                        {text.cancel}
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!(dispatches.data?.data ?? []).length && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {text.noDispatches}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* DELIVERY CHALLAN DOCUMENT DIALOG */}
      <Dialog open={Boolean(challanDoc)} onClose={() => setChallanDoc(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{bn ? 'ডেলিভারি চালান' : 'DELIVERY CHALLAN'}</span>
          <Button size="small" variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
            {bn ? 'প্রিন্ট' : 'Print'}
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {challanDoc && (
            <Box sx={{ p: 2, bgcolor: '#fff', color: '#000' }}>
              <Box textAlign="center" mb={2}>
                <Typography variant="h5" fontWeight={900}>
                  RICE MILL ERP & FACTORY
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Industrial Area, Bangladesh | Authorized Delivery Challan
                </Typography>
                <Divider sx={{ my: 1.5 }} />
              </Box>

              <Stack direction="row" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="body2"><strong>Challan No:</strong> {challanDoc.challanNumber}</Typography>
                  <Typography variant="body2"><strong>Date:</strong> {new Date(challanDoc.dispatchDate).toLocaleDateString()}</Typography>
                  <Typography variant="body2"><strong>Sales Order:</strong> {challanDoc.salesOrder.orderNumber}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="body2"><strong>Customer:</strong> {challanDoc.customer.name}</Typography>
                  <Typography variant="body2"><strong>Mobile:</strong> {challanDoc.customer.phone || '—'}</Typography>
                  <Typography variant="body2"><strong>Vehicle:</strong> {challanDoc.vehicleNumber}</Typography>
                  <Typography variant="body2"><strong>Driver:</strong> {challanDoc.driverName} ({challanDoc.driverMobile || '—'})</Typography>
                </Box>
              </Stack>

              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    <TableCell><strong>SL</strong></TableCell>
                    <TableCell><strong>Item Description</strong></TableCell>
                    <TableCell><strong>Stack Location</strong></TableCell>
                    <TableCell align="right"><strong>Bags</strong></TableCell>
                    <TableCell align="right"><strong>Net Weight (KG)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {challanDoc.lines.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{l.item.name} ({l.item.code})</TableCell>
                      <TableCell>{l.stack.godown.name} / {l.stack.code}</TableCell>
                      <TableCell align="right">{l.bagCount}</TableCell>
                      <TableCell align="right"><strong>{Number(l.netWeightKg).toLocaleString()} KG</strong></TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell colSpan={3}><strong>TOTAL</strong></TableCell>
                    <TableCell align="right"><strong>{challanDoc.totalBags}</strong></TableCell>
                    <TableCell align="right"><strong>{Number(challanDoc.totalWeightKg).toLocaleString()} KG</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box mt={6} display="flex" justifyContent="space-between">
                <Box textAlign="center" width={180} borderTop="1px solid #999" pt={1}>
                  <Typography variant="caption">Received By</Typography>
                </Box>
                <Box textAlign="center" width={180} borderTop="1px solid #999" pt={1}>
                  <Typography variant="caption">Driver Signature</Typography>
                </Box>
                <Box textAlign="center" width={180} borderTop="1px solid #999" pt={1}>
                  <Typography variant="caption">Authorized Officer</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChallanDoc(null)}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>

      {/* GATE PASS DOCUMENT DIALOG */}
      <Dialog open={Boolean(gatePassDoc)} onClose={() => setGatePassDoc(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{bn ? 'গেট পাস' : 'OUTWARD GATE PASS'}</span>
          <Button size="small" variant="contained" color="secondary" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
            {bn ? 'প্রিন্ট' : 'Print'}
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {gatePassDoc && (
            <Box sx={{ p: 2, bgcolor: '#fff', color: '#000' }}>
              <Box textAlign="center" mb={2}>
                <Typography variant="h6" fontWeight={900}>
                  SECURITY GATE PASS
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  FACTORY EXIT CLEARANCE
                </Typography>
                <Divider sx={{ my: 1 }} />
              </Box>

              <Stack spacing={1} mb={3}>
                <Typography variant="body2"><strong>Gate Pass No:</strong> {gatePassDoc.gatePassNumber}</Typography>
                <Typography variant="body2"><strong>Challan Ref:</strong> {gatePassDoc.challanNumber}</Typography>
                <Typography variant="body2"><strong>Date & Time:</strong> {new Date(gatePassDoc.dispatchDate).toLocaleString()}</Typography>
                <Typography variant="body2"><strong>Vehicle:</strong> {gatePassDoc.vehicleNumber}</Typography>
                <Typography variant="body2"><strong>Driver Name:</strong> {gatePassDoc.driverName}</Typography>
                <Typography variant="body2"><strong>Driver Mobile:</strong> {gatePassDoc.driverMobile || '—'}</Typography>
                <Typography variant="body2"><strong>Consignee:</strong> {gatePassDoc.customer.name}</Typography>
                <Typography variant="body2"><strong>Total Bags:</strong> {gatePassDoc.totalBags}</Typography>
                <Typography variant="body2"><strong>Total Net Weight:</strong> {Number(gatePassDoc.totalWeightKg).toLocaleString()} KG</Typography>
              </Stack>

              <Box mt={5} display="flex" justifyContent="space-between">
                <Box textAlign="center" width={140} borderTop="1px solid #999" pt={1}>
                  <Typography variant="caption">Driver Signature</Typography>
                </Box>
                <Box textAlign="center" width={140} borderTop="1px solid #999" pt={1}>
                  <Typography variant="caption">Security Officer</Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGatePassDoc(null)}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

