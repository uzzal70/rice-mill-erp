'use client';

import { FormEvent, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryString } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppAutocomplete, AppSelect, AppTextField, FormGrid, FormSection } from '@/components/form';

type Row<T> = { data: T[]; meta?: { total: number } };

type Customer = {
  id: string;
  name: string;
  businessName?: string | null;
  creditLimit?: string | null;
  openingBalance?: string | null;
};

type Item = {
  id: string;
  name: string;
  code: string;
  kind: string;
  baseUnit: string;
};

type StockStack = {
  id: string;
  code: string;
  godown: { name: string };
};

type QuotationLine = {
  id: string;
  itemId: string;
  quantityKg: string;
  unitRate: string;
  lineAmount: string;
  item: Item;
};

type Quotation = {
  id: string;
  quotationNumber: string;
  channel: string;
  status: string;
  validUntil: string;
  currency: string;
  exchangeRate: string;
  totalAmount: string;
  remarks?: string | null;
  customer: Customer;
  lines: QuotationLine[];
};

type OrderLine = {
  id: string;
  itemId: string;
  stackId: string;
  bagCount?: number | null;
  quantityKg: string;
  unitRate: string;
  lineAmount: string;
  reservedAt?: string | null;
  item: Item;
  stack: StockStack;
};

type Order = {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  currency: string;
  exchangeRate: string;
  exportCountry?: string | null;
  totalAmount: string;
  requestedDelivery?: string | null;
  customer: Customer;
  quotation?: { id: string; quotationNumber: string } | null;
  lines: OrderLine[];
};

const blankOrderLine = () => ({ itemId: '', stackId: '', bagCount: '', quantityKg: '', unitRate: '' });
const blankOrder = () => ({
  orderNumber: `SO-${Date.now()}`,
  customerId: '',
  channel: 'WHOLESALE',
  quotationId: '',
  requestedDelivery: '',
  currency: 'BDT',
  exchangeRate: '1',
  exportCountry: '',
  portOfDischarge: '',
  lcNumber: '',
  remarks: '',
  lines: [blankOrderLine()],
});

const blankQuoteLine = () => ({ itemId: '', quantityKg: '', unitRate: '' });
const blankQuote = () => ({
  quotationNumber: `QT-${Date.now()}`,
  customerId: '',
  channel: 'WHOLESALE',
  validUntil: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  currency: 'BDT',
  exchangeRate: '1',
  remarks: '',
  lines: [blankQuoteLine()],
});

export function SalesPage({
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
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'orders' | 'quotations'>('orders');
  const [orderForm, setOrderForm] = useState(blankOrder());
  const [quoteForm, setQuoteForm] = useState(blankQuote());
  const [error, setError] = useState('');
  const [orderFieldErrors, setOrderFieldErrors] = useState<Record<string, string>>({});
  const [quoteFieldErrors, setQuoteFieldErrors] = useState<Record<string, string>>({});
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');

  const scope = queryString({ companyId, factoryId, page: 1, pageSize: 100 });

  const orders = useQuery({
    queryKey: ['sales-orders', companyId, factoryId],
    queryFn: () => apiRequest<Row<Order>>(`/sales/orders?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });

  const quotations = useQuery({
    queryKey: ['sales-quotations', companyId, factoryId],
    queryFn: () => apiRequest<Row<Quotation>>(`/sales/quotations?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });

  const customers = useQuery({
    queryKey: ['sales-customers', companyId],
    queryFn: () =>
      apiRequest<Row<Customer>>(
        `/partners?${queryString({ companyId, type: 'CUSTOMER', active: true, page: 1, pageSize: 100 })}`,
      ),
    enabled: Boolean(companyId),
  });

  const items = useQuery({
    queryKey: ['sales-items', companyId],
    queryFn: () =>
      apiRequest<Row<Item>>(`/items?${queryString({ companyId, active: true, page: 1, pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });

  const stacks = useQuery({
    queryKey: ['sales-stacks', companyId, factoryId],
    queryFn: () => apiRequest<StockStack[]>(`/stacks?${scope}`),
    enabled: Boolean(companyId && factoryId),
  });

  const productItems = (items.data?.data ?? []).filter(
    (i) => (i.kind === 'RICE' || i.kind === 'BY_PRODUCT') && i.baseUnit === 'KG',
  );

  const selectedCustomer = (customers.data?.data ?? []).find(
    (c) => c.id === (tab === 'orders' ? orderForm.customerId : quoteForm.customerId),
  );

  // Translations
  const text = {
    title: bn ? 'বিক্রয় ও বাণিজ্য ব্যবস্থাপনা' : 'Sales & Commercial Management',
    tabOrders: bn ? 'বিক্রয় আদেশ (Sales Orders)' : 'Sales Orders',
    tabQuotes: bn ? 'দরপত্র / কোটেশন (Quotations)' : 'Quotations',
    noCompany: bn ? 'কোম্পানি ও কারখানা নির্বাচন করুন।' : 'Select a company and factory.',
    createOrder: bn ? 'খসড়া বিক্রয় আদেশ তৈরি' : 'Create Sales Order',
    createQuote: bn ? 'নতুন দরপত্র তৈরি' : 'Create Quotation',
    orderNo: bn ? 'আদেশ নং' : 'Order No.',
    quoteNo: bn ? 'দরপত্র নং' : 'Quotation No.',
    customer: bn ? 'ক্রেতা' : 'Customer',
    channel: bn ? 'বিক্রয়ের ধরন / চ্যানেল' : 'Sales Channel',
    quoteLink: bn ? 'সংযুক্ত দরপত্র (ঐচ্ছিক)' : 'Linked Quotation (Optional)',
    deliveryDate: bn ? 'কাঙ্ক্ষিত সরবরাহের তারিখ' : 'Requested Delivery',
    validUntil: bn ? 'মেয়াদ উত্তীর্ণের তারিখ' : 'Valid Until',
    currency: bn ? 'মুদ্রা' : 'Currency',
    exchangeRate: bn ? 'বিনিময় হার (BDT)' : 'Exchange Rate (BDT)',
    exportCountry: bn ? 'রপ্তানির দেশ' : 'Export Country',
    port: bn ? 'খালাসের বন্দর' : 'Port of Discharge',
    lcNo: bn ? 'এল/সি নং' : 'L/C No.',
    item: bn ? 'পণ্য' : 'Item',
    stack: bn ? 'স্ট্যাক / গোডাউন' : 'Stack / Godown',
    bags: bn ? 'বস্তার সংখ্যা' : 'Bags',
    qty: bn ? 'পরিমাণ (KG)' : 'Quantity (KG)',
    rate: bn ? 'দর / কেজি' : 'Rate / KG',
    lineTotal: bn ? 'মোট মূল্য' : 'Line Total',
    addLine: bn ? '+ পণ্য সারি যোগ করুন' : '+ Add Item Line',
    removeLine: bn ? 'মুছুন' : 'Remove',
    remarks: bn ? 'মন্তব্য' : 'Remarks',
    approve: bn ? 'অনুমোদন ও মজুদ সংরক্ষণ' : 'Approve & Reserve Stock',
    cancel: bn ? 'বাতিল' : 'Cancel',
    approveQuote: bn ? 'অনুমোদন' : 'Approve',
    rejectQuote: bn ? 'প্রত্যাখ্যান' : 'Reject',
    convertToOrder: bn ? 'আদেশে রূপান্তর' : 'Convert to Order',
    status: bn ? 'অবস্থা' : 'Status',
    actions: bn ? 'পদক্ষেপ' : 'Actions',
    noOrders: bn ? 'কোনো বিক্রয় আদেশ নেই।' : 'No sales orders yet.',
    noQuotes: bn ? 'কোনো দরপত্র নেই।' : 'No quotations yet.',
    creditLimitNotice: bn ? 'ক্রেতার অনুমোদিত বাকির সীমা:' : 'Customer Credit Limit:',
    priceNote: bn
      ? 'প্রতিটি লাইনের দর লেনদেন মূল্য হিসেবে সংরক্ষিত হবে; অনুমোদনের সাথে সাথে স্বয়ংক্রিয়ভাবে মজুদ সংরক্ষিত হবে।'
      : 'Each line rate is snapshotted as the transaction price; approval atomically reserves warehouse stock.',
  };

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'orderNumber', label: text.orderNo, value: orderForm.orderNumber, required: true },
      { name: 'customerId', label: text.customer, value: orderForm.customerId, required: true, isSelect: true },
      { name: 'channel', label: text.channel, value: orderForm.channel, required: true, isSelect: true },
      ...(orderForm.channel === 'EXPORT'
        ? [{ name: 'exportCountry', label: text.exportCountry, value: orderForm.exportCountry, required: true }]
        : []),
    ];
    orderForm.lines.forEach((l, i) => {
      rules.push(
        { name: `ord-${i}-itemId`, label: `${text.item} (#${i + 1})`, value: l.itemId, required: true, isSelect: true },
        { name: `ord-${i}-stackId`, label: `${text.stack} (#${i + 1})`, value: l.stackId, required: true, isSelect: true },
        { name: `ord-${i}-quantityKg`, label: `${text.qty} (#${i + 1})`, value: l.quantityKg, required: true, type: 'positiveNumber' },
        { name: `ord-${i}-unitRate`, label: `${text.rate} (#${i + 1})`, value: l.unitRate, required: true, type: 'positiveNumber' },
      );
    });
    const validation = validateFormFields(rules, language);
    if (!validation.valid) {
      setOrderFieldErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setError('');
    setOrderFieldErrors({});
    setSavingOrder(true);
    try {
      await apiRequest('/sales/orders', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          orderNumber: orderForm.orderNumber.trim(),
          customerId: orderForm.customerId,
          channel: orderForm.channel,
          quotationId: orderForm.quotationId || undefined,
          requestedDelivery: orderForm.requestedDelivery || undefined,
          currency: orderForm.currency || 'BDT',
          exchangeRate: orderForm.exchangeRate || '1',
          exportCountry: orderForm.exportCountry || undefined,
          portOfDischarge: orderForm.portOfDischarge || undefined,
          lcNumber: orderForm.lcNumber || undefined,
          remarks: orderForm.remarks || undefined,
          lines: orderForm.lines.map((l) => ({
            itemId: l.itemId,
            stackId: l.stackId,
            bagCount: l.bagCount ? Number(l.bagCount) : undefined,
            quantityKg: l.quantityKg,
            unitRate: l.unitRate,
          })),
        }),
      });
      setOrderForm(blankOrder());
      onSaved(bn ? 'বিক্রয় আদেশ তৈরি হয়েছে।' : 'Sales order created.');
      await qc.invalidateQueries({ queryKey: ['sales-orders', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Could not create sales order.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleCreateQuote(e: FormEvent) {
    e.preventDefault();
    const rules: FieldRule[] = [
      { name: 'quotationNumber', label: text.quoteNo, value: quoteForm.quotationNumber, required: true },
      { name: 'quoteCustomerId', label: text.customer, value: quoteForm.customerId, required: true, isSelect: true },
      { name: 'validUntil', label: text.validUntil, value: quoteForm.validUntil, required: true, type: 'date' },
    ];
    quoteForm.lines.forEach((l, i) => {
      rules.push(
        { name: `qt-${i}-itemId`, label: `${text.item} (#${i + 1})`, value: l.itemId, required: true, isSelect: true },
        { name: `qt-${i}-quantityKg`, label: `${text.qty} (#${i + 1})`, value: l.quantityKg, required: true, type: 'positiveNumber' },
        { name: `qt-${i}-unitRate`, label: `${text.rate} (#${i + 1})`, value: l.unitRate, required: true, type: 'positiveNumber' },
      );
    });
    const validation = validateFormFields(rules, language);
    if (!validation.valid) {
      setQuoteFieldErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setError('');
    setQuoteFieldErrors({});
    setSavingQuote(true);
    try {
      await apiRequest('/sales/quotations', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          quotationNumber: quoteForm.quotationNumber.trim(),
          customerId: quoteForm.customerId,
          channel: quoteForm.channel,
          validUntil: quoteForm.validUntil,
          currency: quoteForm.currency || 'BDT',
          exchangeRate: quoteForm.exchangeRate || '1',
          remarks: quoteForm.remarks || undefined,
          lines: quoteForm.lines.map((l) => ({
            itemId: l.itemId,
            quantityKg: l.quantityKg,
            unitRate: l.unitRate,
          })),
        }),
      });
      setQuoteForm(blankQuote());
      onSaved(bn ? 'দরপত্র তৈরি হয়েছে।' : 'Quotation created.');
      await qc.invalidateQueries({ queryKey: ['sales-quotations', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Could not create quotation.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingQuote(false);
    }
  }

  async function orderAction(row: Order, operation: 'approve' | 'cancel') {
    setError('');
    setActionBusyId(row.id);
    try {
      await apiRequest(`/sales/orders/${encodeURIComponent(row.id)}/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      onSaved(
        operation === 'approve'
          ? bn
            ? 'আদেশ অনুমোদিত এবং মজুদ সংরক্ষিত হয়েছে।'
            : 'Order approved and stock reserved.'
          : bn
            ? 'আদেশ বাতিল ও মজুদ সংরক্ষণ অবমুক্ত হয়েছে।'
            : 'Order cancelled and reservation released.',
      );
      await qc.invalidateQueries({ queryKey: ['sales-orders', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Could not update order.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }

  async function quoteAction(row: Quotation, operation: 'approve' | 'reject') {
    setError('');
    setActionBusyId(row.id);
    try {
      await apiRequest(`/sales/quotations/${encodeURIComponent(row.id)}/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      });
      onSaved(
        operation === 'approve'
          ? bn
            ? 'দরপত্র অনুমোদিত হয়েছে।'
            : 'Quotation approved.'
          : bn
            ? 'দরপত্র প্রত্যাখ্যান করা হয়েছে।'
            : 'Quotation rejected.',
      );
      await qc.invalidateQueries({ queryKey: ['sales-quotations', companyId, factoryId] });
    } catch (err) {
      const msg = extractApiError(err, 'Could not update quotation.');
      setError(msg);
      toast.error(msg);
    } finally {
      setActionBusyId('');
    }
  }

  function startOrderFromQuote(quote: Quotation) {
    setOrderForm({
      orderNumber: `SO-${quote.quotationNumber.replace('QT-', '')}-${Date.now().toString().slice(-4)}`,
      customerId: quote.customer.id,
      channel: quote.channel,
      quotationId: quote.id,
      requestedDelivery: '',
      currency: quote.currency || 'BDT',
      exchangeRate: quote.exchangeRate || '1',
      exportCountry: '',
      portOfDischarge: '',
      lcNumber: '',
      remarks: quote.remarks || '',
      lines: quote.lines.map((l) => ({
        itemId: l.itemId,
        stackId: '',
        bagCount: '',
        quantityKg: l.quantityKg,
        unitRate: l.unitRate,
      })),
    });
    setTab('orders');
  }

  if (!companyId || !factoryId) return <Alert severity="info">{text.noCompany}</Alert>;

  return (
    <Stack spacing={2.5}>
      <Typography variant="h5" fontWeight={800}>
        {text.title}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)}>
          <Tab value="orders" label={text.tabOrders} sx={{ fontWeight: 700 }} />
          <Tab value="quotations" label={text.tabQuotes} sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      {tab === 'orders' ? (
        <>
          {/* SALES ORDER FORM */}
          <Paper component="form" noValidate onSubmit={handleCreateOrder} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {text.createOrder}
            </Typography>

            {selectedCustomer?.creditLimit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {text.creditLimitNotice}{' '}
                <strong>
                  {Number(selectedCustomer.creditLimit).toLocaleString()} BDT
                </strong>
                {selectedCustomer.openingBalance && (
                  <span>
                    {' '}
                    | {bn ? 'পূর্বের বাকি:' : 'Opening Due:'}{' '}
                    {Number(selectedCustomer.openingBalance).toLocaleString()} BDT
                  </span>
                )}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <FormGrid columns={{ xs: 1, sm: 2, md: 3 }} gap={1.5}>
                <AppTextField
                  fieldName="orderNumber"
                  required
                  label={text.orderNo}
                  value={orderForm.orderNumber}
                  errorText={orderFieldErrors.orderNumber}
                  onValueChange={(val) => {
                    setOrderForm({ ...orderForm, orderNumber: val });
                    setOrderFieldErrors(p => ({ ...p, orderNumber: '' }));
                  }}
                />

                <AppAutocomplete
                  fieldName="customerId"
                  required
                  label={text.customer}
                  loading={customers.isLoading}
                  value={orderForm.customerId}
                  errorText={orderFieldErrors.customerId}
                  options={(customers.data?.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                    subLabel: c.businessName ?? undefined,
                    badge: c.creditLimit ? `Limit: ${Number(c.creditLimit).toLocaleString()}` : undefined,
                  }))}
                  emptyMessage={bn ? 'কোনো সক্রিয় ক্রেতা নেই' : 'No active customers'}
                  onChange={(val) => {
                    setOrderForm({ ...orderForm, customerId: val });
                    setOrderFieldErrors(p => ({ ...p, customerId: '' }));
                  }}
                />

                <AppSelect
                  fieldName="channel"
                  label={text.channel}
                  value={orderForm.channel}
                  errorText={orderFieldErrors.channel}
                  options={[
                    'WHOLESALE',
                    'RETAIL',
                    'DEALER',
                    'DISTRIBUTOR',
                    'INSTITUTIONAL',
                    'CASH',
                    'CREDIT',
                    'EXPORT',
                  ].map((c) => ({ value: c, label: c }))}
                  onChange={(val) => {
                    setOrderForm({ ...orderForm, channel: val });
                    setOrderFieldErrors(p => ({ ...p, channel: '' }));
                  }}
                />

                <AppAutocomplete
                  fieldName="quotationId"
                  label={text.quoteLink}
                  value={orderForm.quotationId}
                  placeholder={bn ? '— কোনোটি নয় —' : '— None —'}
                  options={(quotations.data?.data ?? [])
                    .filter((q) => q.status === 'APPROVED' || q.status === 'DRAFT')
                    .map((q) => ({
                      value: q.id,
                      label: `${q.quotationNumber} (${q.customer.name})`,
                      badge: q.status,
                    }))}
                  emptyMessage={bn ? 'কোনো দরপত্র নেই' : 'No active quotations'}
                  onChange={(val) => setOrderForm({ ...orderForm, quotationId: val })}
                />

                <AppTextField
                  fieldName="requestedDelivery"
                  type="date"
                  label={text.deliveryDate}
                  value={orderForm.requestedDelivery}
                  onValueChange={(val) => setOrderForm({ ...orderForm, requestedDelivery: val })}
                />
              </FormGrid>

              {/* Export Specific Details */}
              {orderForm.channel === 'EXPORT' && (
                <FormSection title={bn ? 'রপ্তানি ও এলসি বিবরণ' : 'Export & LC Details'}>
                  <FormGrid columns={{ xs: 1, sm: 2, md: 5 }} gap={1.5}>
                    <AppTextField
                      fieldName="currency"
                      label={text.currency}
                      value={orderForm.currency}
                      onValueChange={(val) => setOrderForm({ ...orderForm, currency: val.toUpperCase() })}
                    />
                    <AppTextField
                      fieldName="exchangeRate"
                      type="number"
                      label={text.exchangeRate}
                      value={orderForm.exchangeRate}
                      onValueChange={(val) => setOrderForm({ ...orderForm, exchangeRate: val })}
                    />
                    <AppTextField
                      fieldName="exportCountry"
                      required
                      label={text.exportCountry}
                      value={orderForm.exportCountry}
                      errorText={orderFieldErrors.exportCountry}
                      onValueChange={(val) => {
                        setOrderForm({ ...orderForm, exportCountry: val });
                        setOrderFieldErrors(p => ({ ...p, exportCountry: '' }));
                      }}
                    />
                    <AppTextField
                      fieldName="portOfDischarge"
                      label={text.port}
                      value={orderForm.portOfDischarge}
                      onValueChange={(val) => setOrderForm({ ...orderForm, portOfDischarge: val })}
                    />
                    <AppTextField
                      fieldName="lcNumber"
                      label={text.lcNo}
                      value={orderForm.lcNumber}
                      onValueChange={(val) => setOrderForm({ ...orderForm, lcNumber: val })}
                    />
                  </FormGrid>
                </FormSection>
              )}

              {/* Item lines */}
              <FormSection title={bn ? 'পণ্যের তালিকা ও গোডাউন স্ট্যাক' : 'Order Items & Godown Stacks'}>
                <Stack spacing={1.5}>
                  {orderForm.lines.map((line, index) => {
                    const lineTotal = (Number(line.quantityKg || 0) * Number(line.unitRate || 0)).toFixed(2);
                    return (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '1.5fr 1.4fr 0.8fr 1fr 1fr auto' },
                          gap: 1.25,
                          alignItems: 'start',
                        }}
                      >
                        <AppAutocomplete
                          fieldName={`ord-${index}-itemId`}
                          required
                          label={text.item}
                          value={line.itemId}
                          errorText={orderFieldErrors[`ord-${index}-itemId`]}
                          options={productItems.map((i) => ({ value: i.id, label: i.name, badge: i.code }))}
                          emptyMessage={bn ? 'কোনো বিক্রয়যোগ্য পণ্য নেই' : 'No products available'}
                          onChange={(val) => {
                            setOrderForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, itemId: val } : row)),
                            }));
                            setOrderFieldErrors(p => ({ ...p, [`ord-${index}-itemId`]: '' }));
                          }}
                        />

                        <AppAutocomplete
                          fieldName={`ord-${index}-stackId`}
                          required
                          label={text.stack}
                          value={line.stackId}
                          errorText={orderFieldErrors[`ord-${index}-stackId`]}
                          options={(stacks.data ?? []).map((s) => ({ value: s.id, label: `${s.godown.name} / ${s.code}` }))}
                          emptyMessage={bn ? 'কোনো স্ট্যাক নেই' : 'No stacks'}
                          onChange={(val) => {
                            setOrderForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, stackId: val } : row)),
                            }));
                            setOrderFieldErrors(p => ({ ...p, [`ord-${index}-stackId`]: '' }));
                          }}
                        />

                        <AppTextField
                          fieldName={`ord-${index}-bagCount`}
                          type="number"
                          unit="BAGS"
                          label={text.bags}
                          value={line.bagCount}
                          inputProps={{ min: 0, step: 1 }}
                          onValueChange={(val) =>
                            setOrderForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, bagCount: val } : row)),
                            }))
                          }
                        />

                        <AppTextField
                          fieldName={`ord-${index}-quantityKg`}
                          required
                          type="number"
                          unit="KG"
                          inputProps={{ min: 0, step: '.001' }}
                          label={text.qty}
                          value={line.quantityKg}
                          errorText={orderFieldErrors[`ord-${index}-quantityKg`]}
                          onValueChange={(val) => {
                            setOrderForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, quantityKg: val } : row)),
                            }));
                            setOrderFieldErrors(p => ({ ...p, [`ord-${index}-quantityKg`]: '' }));
                          }}
                        />

                        <AppTextField
                          fieldName={`ord-${index}-unitRate`}
                          required
                          type="number"
                          prefixText="৳"
                          inputProps={{ min: 0, step: '.0001' }}
                          label={text.rate}
                          value={line.unitRate}
                          errorText={orderFieldErrors[`ord-${index}-unitRate`]}
                          onValueChange={(val) => {
                            setOrderForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, unitRate: val } : row)),
                            }));
                            setOrderFieldErrors(p => ({ ...p, [`ord-${index}-unitRate`]: '' }));
                          }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ pt: 0.75 }}>
                          <Typography fontWeight={700} fontSize={13} sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {lineTotal} {orderForm.currency}
                          </Typography>
                          {orderForm.lines.length > 1 && (
                            <Button
                              type="button"
                              color="error"
                              size="small"
                              onClick={() =>
                                setOrderForm((current) => ({
                                  ...current,
                                  lines: current.lines.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              {text.removeLine}
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}

                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} pt={0.5}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        setOrderForm((current) => ({
                          ...current,
                          lines: [...current.lines, blankOrderLine()],
                        }))
                      }
                    >
                      {text.addLine}
                    </Button>

                    <Typography variant="subtitle1" fontWeight={800}>
                      {bn ? 'সর্বমোট মূল্য:' : 'Total Amount:'}{' '}
                      {orderForm.lines
                        .reduce((sum, l) => sum + Number(l.quantityKg || 0) * Number(l.unitRate || 0), 0)
                        .toLocaleString()}{' '}
                      {orderForm.currency}
                    </Typography>
                  </Stack>
                </Stack>
              </FormSection>

              <AppTextField
                fieldName="orderRemarks"
                label={text.remarks}
                value={orderForm.remarks}
                onValueChange={(val) => setOrderForm({ ...orderForm, remarks: val })}
                multiline
                minRows={2}
              />

              <Stack direction="row" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  size="medium"
                  disabled={savingOrder}
                  startIcon={savingOrder ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ px: 3, fontWeight: 700 }}
                >
                  {text.createOrder}
                </Button>
              </Stack>
            </Stack>

            <Typography color="text.secondary" fontSize={12} mt={1.5}>
              {text.priceNote}
            </Typography>
          </Paper>

          {/* ORDERS TABLE */}
          <Paper sx={{ p: 2, overflowX: 'auto', borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.orderNo}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.customer}</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{text.channel}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.item}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.qty}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.rate}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.lineTotal}</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{text.status}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.actions}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(orders.data?.data ?? []).map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ fontFamily: 'monospace' }}>{o.orderNumber}</strong>
                      {o.quotation && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Quote: {o.quotation.quotationNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={o.customer.name}>
                        {o.customer.name}
                      </Typography>
                      {o.customer.businessName && (
                        <Typography variant="caption" display="block" color="text.secondary" noWrap title={o.customer.businessName}>
                          {o.customer.businessName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip label={o.channel} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap title={o.lines.map((l) => `${l.item.name} (${l.stack.code})`).join(', ')}>
                        {o.lines.map((l) => `${l.item.name} (${l.stack.code})`).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {o.lines.map((l) => `${Number(l.quantityKg).toLocaleString()} KG`).join(', ')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {o.lines.map((l) => `৳ ${Number(l.unitRate).toFixed(2)}`).join(', ')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {Number(o.totalAmount).toLocaleString()} {o.currency}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        label={o.status}
                        size="small"
                        color={
                          o.status === 'APPROVED'
                            ? 'success'
                            : o.status === 'CANCELLED'
                              ? 'error'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {o.status === 'DRAFT' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disabled={actionBusyId === o.id}
                          onClick={() => orderAction(o, 'approve')}
                        >
                          {text.approve}
                        </Button>
                      )}
                      {o.status === 'APPROVED' && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={actionBusyId === o.id}
                          onClick={() => orderAction(o, 'cancel')}
                        >
                          {text.cancel}
                        </Button>
                      )}
                      {o.status !== 'DRAFT' && o.status !== 'APPROVED' && '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!(orders.data?.data ?? []).length && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      {text.noOrders}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      ) : (
        <>
          {/* QUOTATION FORM */}
          <Paper component="form" noValidate onSubmit={handleCreateQuote} className="workspace-card" elevation={0} sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              {text.createQuote}
            </Typography>

            <Stack spacing={2.5}>
              <FormGrid columns={{ xs: 1, sm: 2, md: 4 }}>
                <AppTextField
                  fieldName="quotationNumber"
                  required
                  label={text.quoteNo}
                  value={quoteForm.quotationNumber}
                  errorText={quoteFieldErrors.quotationNumber}
                  onValueChange={(val) => {
                    setQuoteForm({ ...quoteForm, quotationNumber: val });
                    setQuoteFieldErrors((p) => ({ ...p, quotationNumber: '' }));
                  }}
                />

                <AppAutocomplete
                  fieldName="quoteCustomerId"
                  required
                  label={text.customer}
                  value={quoteForm.customerId}
                  errorText={quoteFieldErrors.quoteCustomerId}
                  options={(customers.data?.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.businessName ? `${c.name} · ${c.businessName}` : c.name,
                  }))}
                  emptyMessage={bn ? 'কোনো ক্রেতা পাওয়া যায়নি' : 'No customers found'}
                  onChange={(val) => {
                    setQuoteForm({ ...quoteForm, customerId: val });
                    setQuoteFieldErrors((p) => ({ ...p, quoteCustomerId: '' }));
                  }}
                />

                <AppSelect
                  fieldName="quoteChannel"
                  label={text.channel}
                  value={quoteForm.channel}
                  options={[
                    'WHOLESALE',
                    'RETAIL',
                    'DEALER',
                    'DISTRIBUTOR',
                    'INSTITUTIONAL',
                    'CASH',
                    'CREDIT',
                    'EXPORT',
                  ].map((c) => ({ value: c, label: c }))}
                  onChange={(val) => setQuoteForm({ ...quoteForm, channel: val })}
                />

                <AppTextField
                  fieldName="validUntil"
                  required
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  label={text.validUntil}
                  value={quoteForm.validUntil}
                  errorText={quoteFieldErrors.validUntil}
                  onValueChange={(val) => {
                    setQuoteForm({ ...quoteForm, validUntil: val });
                    setQuoteFieldErrors((p) => ({ ...p, validUntil: '' }));
                  }}
                />

                <AppTextField
                  fieldName="quoteCurrency"
                  label={text.currency}
                  value={quoteForm.currency}
                  onValueChange={(val) => setQuoteForm({ ...quoteForm, currency: val })}
                />
              </FormGrid>

              <FormSection title={bn ? 'দরপত্রের পণ্য ও প্রস্তাবিত দর' : 'Quotation Items & Proposed Rates'}>
                <Stack spacing={1.5}>
                  {quoteForm.lines.map((line, index) => {
                    const lineTotal = (Number(line.quantityKg || 0) * Number(line.unitRate || 0)).toFixed(2);
                    return (
                      <Box
                        key={index}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' },
                          gap: 1.25,
                          alignItems: 'start',
                        }}
                      >
                        <AppAutocomplete
                          fieldName={`qt-${index}-itemId`}
                          required
                          label={text.item}
                          value={line.itemId}
                          errorText={quoteFieldErrors[`qt-${index}-itemId`]}
                          options={productItems.map((i) => ({ value: i.id, label: i.name, badge: i.code }))}
                          emptyMessage={bn ? 'কোনো বিক্রয়যোগ্য পণ্য নেই' : 'No products available'}
                          onChange={(val) => {
                            setQuoteForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, itemId: val } : row)),
                            }));
                            setQuoteFieldErrors((p) => ({ ...p, [`qt-${index}-itemId`]: '' }));
                          }}
                        />

                        <AppTextField
                          fieldName={`qt-${index}-quantityKg`}
                          required
                          type="number"
                          unit="KG"
                          inputProps={{ min: 0, step: '.001' }}
                          label={text.qty}
                          value={line.quantityKg}
                          errorText={quoteFieldErrors[`qt-${index}-quantityKg`]}
                          onValueChange={(val) => {
                            setQuoteForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, quantityKg: val } : row)),
                            }));
                            setQuoteFieldErrors((p) => ({ ...p, [`qt-${index}-quantityKg`]: '' }));
                          }}
                        />

                        <AppTextField
                          fieldName={`qt-${index}-unitRate`}
                          required
                          type="number"
                          prefixText="৳"
                          inputProps={{ min: 0, step: '.0001' }}
                          label={text.rate}
                          value={line.unitRate}
                          errorText={quoteFieldErrors[`qt-${index}-unitRate`]}
                          onValueChange={(val) => {
                            setQuoteForm((current) => ({
                              ...current,
                              lines: current.lines.map((row, i) => (i === index ? { ...row, unitRate: val } : row)),
                            }));
                            setQuoteFieldErrors((p) => ({ ...p, [`qt-${index}-unitRate`]: '' }));
                          }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ pt: 0.75 }}>
                          <Typography fontWeight={700} fontSize={13} sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {lineTotal} {quoteForm.currency}
                          </Typography>
                          {quoteForm.lines.length > 1 && (
                            <Button
                              type="button"
                              color="error"
                              size="small"
                              onClick={() =>
                                setQuoteForm((current) => ({
                                  ...current,
                                  lines: current.lines.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              {text.removeLine}
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}

                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} pt={0.5}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        setQuoteForm((current) => ({
                          ...current,
                          lines: [...current.lines, blankQuoteLine()],
                        }))
                      }
                    >
                      {text.addLine}
                    </Button>

                    <Typography variant="subtitle1" fontWeight={800}>
                      {bn ? 'মোট প্রাক্কলন:' : 'Total Estimate:'}{' '}
                      {quoteForm.lines
                        .reduce((sum, l) => sum + Number(l.quantityKg || 0) * Number(l.unitRate || 0), 0)
                        .toLocaleString()}{' '}
                      {quoteForm.currency}
                    </Typography>
                  </Stack>
                </Stack>
              </FormSection>

              <AppTextField
                fieldName="quoteRemarks"
                label={text.remarks}
                value={quoteForm.remarks}
                onValueChange={(val) => setQuoteForm({ ...quoteForm, remarks: val })}
                multiline
                minRows={2}
              />

              <Stack direction="row" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  size="medium"
                  disabled={savingQuote}
                  startIcon={savingQuote ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ px: 3, fontWeight: 700 }}
                >
                  {text.createQuote}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* QUOTATION TABLE */}
          <Paper sx={{ p: 2, overflowX: 'auto', borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.quoteNo}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.customer}</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{text.channel}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.validUntil}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{text.item}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.qty}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.rate}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.lineTotal}</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{text.status}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{text.actions}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(quotations.data?.data ?? []).map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace' }}>{q.quotationNumber}</strong></TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={q.customer.name}>
                        {q.customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><Chip label={q.channel} size="small" variant="outlined" /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(q.validUntil).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap title={q.lines.map((l) => l.item.name).join(', ')}>
                        {q.lines.map((l) => l.item.name).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {q.lines.map((l) => `${Number(l.quantityKg).toLocaleString()} KG`).join(', ')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {q.lines.map((l) => `৳ ${Number(l.unitRate).toFixed(2)}`).join(', ')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {Number(q.totalAmount).toLocaleString()} {q.currency}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        label={q.status}
                        size="small"
                        color={
                          q.status === 'APPROVED'
                            ? 'success'
                            : q.status === 'REJECTED'
                              ? 'error'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {q.status === 'DRAFT' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={actionBusyId === q.id}
                              onClick={() => quoteAction(q, 'approve')}
                            >
                              {text.approveQuote}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={actionBusyId === q.id}
                              onClick={() => quoteAction(q, 'reject')}
                            >
                              {text.rejectQuote}
                            </Button>
                          </>
                        )}
                        {(q.status === 'APPROVED' || q.status === 'DRAFT') && (
                          <Button size="small" variant="outlined" onClick={() => startOrderFromQuote(q)}>
                            {text.convertToOrder}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!(quotations.data?.data ?? []).length && (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      {text.noQuotes}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Stack>
  );
}
