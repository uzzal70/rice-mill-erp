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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
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
  baseUnit: string;
};

type TollBatch = {
  id: string;
  batchNumber: string;
  status: string;
  inputPaddyKg: string;
  headRiceKg: string;
  brokenRiceKg: string;
  riceBranKg: string;
  huskKg: string;
  totalOutputKg: string;
  processLossKg: string;
  recoveryPct: string;
  headRiceRecoveryPct: string;
  startedAt: string;
  completedAt: string;
  remarks?: string | null;
  createdAt: string;
};

type TollDelivery = {
  id: string;
  deliveryNumber: string;
  gatePassNumber: string;
  status: string;
  deliveryDate: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile?: string | null;
  totalBags: number;
  riceDeliveredKg: string;
  brokenRiceDeliveredKg: string;
  byProductDeliveredKg: string;
  totalDeliveredKg: string;
  remarks?: string | null;
  createdAt: string;
};

type TollOrder = {
  id: string;
  orderNumber: string;
  status: 'DRAFT' | 'RECEIVED' | 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED';
  receivedAt: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  challanNumber?: string | null;
  receivedBagCount: number;
  receivedQuantityKg: string;
  tollRate: string;
  tollRateBasis: 'PER_KG' | 'PER_MON' | 'PER_BAG';
  byProductPolicy: 'RETURN_TO_CUSTOMER' | 'MILL_RETENTION';
  processedQuantityKg: string;
  totalRiceProducedKg: string;
  totalByProductProducedKg: string;
  totalRiceDeliveredKg: string;
  totalByProductDeliveredKg: string;
  tollChargeAmount: string;
  additionalCharges: string;
  totalAmount: string;
  remarks?: string | null;
  createdAt: string;
  customer: Customer;
  paddyItem: Item;
  batches: TollBatch[];
  deliveries: TollDelivery[];
};

type CustodySummary = {
  totalPaddyReceivedKg: string;
  totalPaddyProcessedKg: string;
  paddyInCustodyKg: string;
  totalRiceProducedKg: string;
  totalRiceDeliveredKg: string;
  riceInCustodyKg: string;
  totalByProductProducedKg: string;
  totalByProductDeliveredKg: string;
  byProductInCustodyKg: string;
  totalServiceFees: string;
};

interface TollMillingPageProps {
  companyId: string;
  factoryId: string;
  language: string;
  onSaved: (message: string) => void;
}

export function TollMillingPage({ companyId, factoryId, language, onSaved }: TollMillingPageProps) {
  const qc = useQueryClient();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'orders' | 'custody'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected customer for custody tab
  const [selectedCustodyCustomer, setSelectedCustodyCustomer] = useState<string>('');

  // Dialog states
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [batchModalOrder, setBatchModalOrder] = useState<TollOrder | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<TollOrder | null>(null);
  const [printDoc, setPrintDoc] = useState<TollOrder | null>(null);

  // Create Order form fields
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderPaddyItemId, setOrderPaddyItemId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [receivedBagCount, setReceivedBagCount] = useState<number>(0);
  const [receivedQuantityKg, setReceivedQuantityKg] = useState('');
  const [tollRate, setTollRate] = useState('2.50');
  const [tollRateBasis, setTollRateBasis] = useState<'PER_KG' | 'PER_MON' | 'PER_BAG'>('PER_KG');
  const [byProductPolicy, setByProductPolicy] = useState<'RETURN_TO_CUSTOMER' | 'MILL_RETENTION'>('RETURN_TO_CUSTOMER');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [orderRemarks, setOrderRemarks] = useState('');

  // Batch form fields
  const [batchNumber, setBatchNumber] = useState('');
  const [inputPaddyKg, setInputPaddyKg] = useState('');
  const [headRiceKg, setHeadRiceKg] = useState('');
  const [brokenRiceKg, setBrokenRiceKg] = useState('0');
  const [riceBranKg, setRiceBranKg] = useState('0');
  const [huskKg, setHuskKg] = useState('0');
  const [batchRemarks, setBatchRemarks] = useState('');

  // Delivery form fields
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [gatePassNumber, setGatePassNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [delivVehicle, setDelivVehicle] = useState('');
  const [delivDriver, setDelivDriver] = useState('');
  const [delivMobile, setDelivMobile] = useState('');
  const [delivBags, setDelivBags] = useState<number>(0);
  const [delivRiceKg, setDelivRiceKg] = useState('');
  const [delivBrokenKg, setDelivBrokenKg] = useState('0');
  const [delivByProductKg, setDelivByProductKg] = useState('0');
  const [delivRemarks, setDelivRemarks] = useState('');

  // Queries
  const { data: ordersData, isLoading: ordersLoading } = useQuery<Row<TollOrder>>({
    queryKey: ['toll-orders', companyId, factoryId, statusFilter, search],
    queryFn: () =>
      apiRequest(
        `/toll-milling/orders${queryString({
          companyId,
          factoryId,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: search.trim() || undefined,
        })}`,
      ),
    enabled: Boolean(companyId && factoryId),
  });

  const { data: customersData } = useQuery<{ success: boolean; data: Customer[] }>({
    queryKey: ['customers', companyId],
    queryFn: () => apiRequest(`/partners${queryString({ companyId, type: 'CUSTOMER', pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });

  const { data: paddyItemsData } = useQuery<{ data: Item[] }>({
    queryKey: ['paddy-items', companyId],
    queryFn: () => apiRequest(`/items${queryString({ companyId, kind: 'PADDY', pageSize: 100 })}`),
    enabled: Boolean(companyId),
  });

  const { data: custodyData } = useQuery<{
    success: boolean;
    customer: Customer;
    custodySummary: CustodySummary;
    orders: TollOrder[];
  }>({
    queryKey: ['toll-custody', companyId, factoryId, selectedCustodyCustomer],
    queryFn: () =>
      apiRequest(
        `/toll-milling/custody/${selectedCustodyCustomer}${queryString({
          companyId,
          factoryId,
        })}`,
      ),
    enabled: Boolean(companyId && factoryId && selectedCustodyCustomer && activeTab === 'custody'),
  });

  const orders = useMemo(() => ordersData?.data ?? [], [ordersData]);
  const customers = useMemo(() => customersData?.data ?? [], [customersData]);
  const paddyItems = useMemo(() => paddyItemsData?.data ?? [], [paddyItemsData]);

  // KPI aggregates
  const activeOrdersCount = orders.filter((o) => o.status === 'RECEIVED' || o.status === 'IN_PROCESS').length;
  const totalPaddyInCustodyKg = orders.reduce((sum, o) => {
    const balance = Math.max(0, Number(o.receivedQuantityKg) - Number(o.processedQuantityKg));
    return sum + balance;
  }, 0);
  const totalRiceInCustodyKg = orders.reduce((sum, o) => {
    const balance = Math.max(0, Number(o.totalRiceProducedKg) - Number(o.totalRiceDeliveredKg));
    return sum + balance;
  }, 0);
  const totalRevenueBilled = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  // Open Create Order Dialog
  const handleOpenCreateOrder = () => {
    setOrderCustomerId('');
    setOrderPaddyItemId(paddyItems[0]?.id || '');
    setOrderNumber(`TOLL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReceivedAt(new Date().toISOString().slice(0, 10));
    setVehicleNumber('');
    setDriverName('');
    setChallanNumber('');
    setReceivedBagCount(0);
    setReceivedQuantityKg('');
    setTollRate('2.50');
    setTollRateBasis('PER_KG');
    setByProductPolicy('RETURN_TO_CUSTOMER');
    setAdditionalCharges('0');
    setOrderRemarks('');
    setError(null);
    setCreateOrderOpen(true);
  };

  const handleCreateOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!orderCustomerId) {
      setError(isBn ? 'গ্রাহক নির্বাচন করুন।' : 'Please select a customer.');
      return;
    }
    if (!orderPaddyItemId) {
      setError(isBn ? 'ধানের জাত নির্বাচন করুন।' : 'Please select a paddy variety.');
      return;
    }
    if (!Number(receivedQuantityKg) || Number(receivedQuantityKg) <= 0) {
      setError(isBn ? 'সঠিক ধান প্রাপ্তির পরিমাণ (কেজি) দিন।' : 'Please enter a valid received quantity in KG.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiRequest('/toll-milling/orders', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          customerId: orderCustomerId,
          paddyItemId: orderPaddyItemId,
          orderNumber,
          receivedAt: new Date(receivedAt).toISOString(),
          vehicleNumber: vehicleNumber.trim() || undefined,
          driverName: driverName.trim() || undefined,
          challanNumber: challanNumber.trim() || undefined,
          receivedBagCount: Number(receivedBagCount) || 0,
          receivedQuantityKg,
          tollRate,
          tollRateBasis,
          byProductPolicy,
          additionalCharges,
          remarks: orderRemarks.trim() || undefined,
        }),
      });
      setCreateOrderOpen(false);
      qc.invalidateQueries({ queryKey: ['toll-orders'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      onSaved(isBn ? 'কমার্শিয়াল হাস্কিং আদেশ সফলভাবে গ্রহণ করা হয়েছে।' : 'Toll milling order received successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to receive toll order.');
    } finally {
      setBusy(false);
    }
  };

  // Open New Batch Dialog
  const handleOpenBatchModal = (order: TollOrder) => {
    setBatchModalOrder(order);
    const unprocKg = Math.max(0, Number(order.receivedQuantityKg) - Number(order.processedQuantityKg));
    setBatchNumber(`TB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
    setInputPaddyKg(unprocKg.toString());
    setHeadRiceKg('');
    setBrokenRiceKg('0');
    setRiceBranKg('0');
    setHuskKg('0');
    setBatchRemarks('');
    setError(null);
  };

  const handleCreateBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!batchModalOrder) return;

    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/toll-milling/orders/${batchModalOrder.id}/batches`, {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          batchNumber,
          inputPaddyKg,
          headRiceKg,
          brokenRiceKg,
          riceBranKg,
          huskKg,
          remarks: batchRemarks.trim() || undefined,
        }),
      });
      setBatchModalOrder(null);
      qc.invalidateQueries({ queryKey: ['toll-orders'] });
      qc.invalidateQueries({ queryKey: ['toll-custody'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      onSaved(isBn ? 'মাড়াই ব্যাচ সফলভাবে নথিভুক্ত হয়েছে।' : 'Milling batch recorded successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record batch.');
    } finally {
      setBusy(false);
    }
  };

  // Open Delivery Modal
  const handleOpenDeliveryModal = (order: TollOrder) => {
    setDeliveryModalOrder(order);
    const undelivRice = Math.max(0, Number(order.totalRiceProducedKg) - Number(order.totalRiceDeliveredKg));
    const undelivByProduct = Math.max(0, Number(order.totalByProductProducedKg) - Number(order.totalByProductDeliveredKg));
    setDeliveryNumber(`TD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
    setGatePassNumber(`TGP-${Date.now().toString().slice(-6)}`);
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setDelivVehicle(order.vehicleNumber || '');
    setDelivDriver(order.driverName || '');
    setDelivMobile('');
    setDelivBags(Math.ceil(undelivRice / 50));
    setDelivRiceKg(undelivRice.toString());
    setDelivBrokenKg('0');
    setDelivByProductKg(order.byProductPolicy === 'RETURN_TO_CUSTOMER' ? undelivByProduct.toString() : '0');
    setDelivRemarks('');
    setError(null);
  };

  const handleCreateDeliverySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deliveryModalOrder) return;

    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/toll-milling/orders/${deliveryModalOrder.id}/deliveries`, {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          deliveryNumber,
          gatePassNumber,
          deliveryDate: new Date(deliveryDate).toISOString(),
          vehicleNumber: delivVehicle,
          driverName: delivDriver,
          driverMobile: delivMobile.trim() || undefined,
          totalBags: Number(delivBags) || 0,
          riceDeliveredKg: delivRiceKg,
          brokenRiceDeliveredKg: delivBrokenKg,
          byProductDeliveredKg: delivByProductKg,
          remarks: delivRemarks.trim() || undefined,
        }),
      });
      setDeliveryModalOrder(null);
      qc.invalidateQueries({ queryKey: ['toll-orders'] });
      qc.invalidateQueries({ queryKey: ['toll-custody'] });
      onSaved(isBn ? 'চালান ও গেট পাস সম্পন্ন হয়েছে এবং পণ্য সরবরাহ করা হয়েছে।' : 'Challan & Gate Pass posted and goods dispatched.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delivery failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'চলমান হাস্কিং আদেশ' : 'Active Toll Orders'}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {activeOrdersCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'গ্রাহকের ধান মজুদ (হেফাজত)' : 'Customer Paddy in Custody'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="warning.main">
            {totalPaddyInCustodyKg.toLocaleString('en-US', { minimumFractionDigits: 1 })} KG
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'উত্তোলিত চাল মজুদ (হেফাজত)' : 'Finished Rice in Custody'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="info.main">
            {totalRiceInCustodyKg.toLocaleString('en-US', { minimumFractionDigits: 1 })} KG
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'মোট আদেশ সংখ্যা' : 'Total Orders'}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {orders.length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {isBn ? 'মোট প্রসেসিং সার্ভিস আয়' : 'Toll Service Revenue'}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            ৳ {totalRevenueBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Paper>
      </Box>

      {/* Tabs Bar */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab value="orders" label={isBn ? 'টোল আদেশ ও উৎপাদন রেজিস্টার' : 'Toll Orders & Operations'} />
          <Tab value="custody" label={isBn ? 'গ্রাহকভিত্তিক হেফাজত লেজার (Custody Ledger)' : 'Customer Custody Ledger'} />
        </Tabs>
      </Paper>

      {/* TAB 1: TOLL ORDERS */}
      {activeTab === 'orders' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Action Bar */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  size="small"
                  placeholder={isBn ? 'খুঁজুন (আদেশ নং, চালান, গাড়ি, গ্রাহক)...' : 'Search order, challan, truck, customer...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 260 }}
                />
                <TextField
                  select
                  size="small"
                  label={isBn ? 'অবস্থা' : 'Status'}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="ALL">{isBn ? 'সকল অবস্থা' : 'All Statuses'}</MenuItem>
                  <MenuItem value="RECEIVED">{isBn ? 'ধান গৃহীত (Received)' : 'Received'}</MenuItem>
                  <MenuItem value="IN_PROCESS">{isBn ? 'মাড়াই চলমান (In Process)' : 'In Process'}</MenuItem>
                  <MenuItem value="COMPLETED">{isBn ? 'সম্পন্ন (Completed)' : 'Completed'}</MenuItem>
                  <MenuItem value="CANCELLED">{isBn ? 'বাতিল (Cancelled)' : 'Cancelled'}</MenuItem>
                </TextField>
              </Stack>

              <Button
                variant="contained"
                color="primary"
                startIcon={<HandshakeRoundedIcon />}
                onClick={handleOpenCreateOrder}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {isBn ? '+ নতুন কমার্শিয়াল হাস্কিং গ্রহণ' : '+ New Toll Milling Order'}
              </Button>
            </Stack>
          </Paper>

          {/* Orders Table */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell><strong>{isBn ? 'আদেশ নং' : 'Order No'}</strong></TableCell>
                  <TableCell><strong>{isBn ? 'তারিখ' : 'Date'}</strong></TableCell>
                  <TableCell><strong>{isBn ? 'গ্রাহক' : 'Customer'}</strong></TableCell>
                  <TableCell><strong>{isBn ? 'ধানের জাত' : 'Paddy Item'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'প্রাপ্ত ধান (কেজি)' : 'Paddy Received'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'প্রসেসকৃত (কেজি)' : 'Processed KG'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'চাল তৈরি (কেজি)' : 'Rice Produced'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'চাল ডেলিভারি' : 'Rice Delivered'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'সার্ভিস চার্জ (৳)' : 'Toll Fee (৳)'}</strong></TableCell>
                  <TableCell align="center"><strong>{isBn ? 'অবস্থা' : 'Status'}</strong></TableCell>
                  <TableCell align="right"><strong>{isBn ? 'কার্যক্রম' : 'Actions'}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{isBn ? 'লোড হচ্ছে...' : 'Loading toll orders...'}</Typography>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{isBn ? 'কোনো কমার্শিয়াল হাস্কিং আদেশ নেই।' : 'No toll milling orders found.'}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((ord) => (
                    <TableRow key={ord.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{ord.orderNumber}</TableCell>
                      <TableCell>{ord.receivedAt ? new Date(ord.receivedAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ord.customer?.name}
                        </Typography>
                        {ord.customer?.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {ord.customer.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{ord.paddyItem?.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {Number(ord.receivedQuantityKg).toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell align="right">
                        {Number(ord.processedQuantityKg).toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell align="right">
                        {Number(ord.totalRiceProducedKg).toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell align="right">
                        {Number(ord.totalRiceDeliveredKg).toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        ৳ {Number(ord.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={ord.status}
                          color={
                            ord.status === 'COMPLETED'
                              ? 'success'
                              : ord.status === 'IN_PROCESS'
                              ? 'info'
                              : ord.status === 'RECEIVED'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {ord.status !== 'COMPLETED' && ord.status !== 'CANCELLED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PrecisionManufacturingRoundedIcon />}
                              onClick={() => handleOpenBatchModal(ord)}
                            >
                              {isBn ? 'মাড়াই' : 'Milling'}
                            </Button>
                          )}
                          {Number(ord.totalRiceProducedKg) > Number(ord.totalRiceDeliveredKg) && (
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              startIcon={<LocalShippingRoundedIcon />}
                              onClick={() => handleOpenDeliveryModal(ord)}
                            >
                              {isBn ? 'চালান' : 'Deliver'}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PrintRoundedIcon />}
                            onClick={() => setPrintDoc(ord)}
                          >
                            {isBn ? 'ভাউচার' : 'Voucher'}
                          </Button>
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

      {/* TAB 2: CUSTOMER CUSTODY LEDGER */}
      {activeTab === 'custody' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                select
                size="small"
                label={isBn ? 'গ্রাহক নির্বাচন করুন' : 'Select Customer'}
                value={selectedCustodyCustomer}
                onChange={(e) => setSelectedCustodyCustomer(e.target.value)}
                sx={{ minWidth: 300 }}
              >
                <MenuItem value="">{isBn ? '— গ্রাহক নির্বাচন করুন —' : '— Select Customer —'}</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''} - {c.code}
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                {isBn
                  ? 'গ্রাহক নির্বাচন করে তার নিজস্ব ধান, চাল ও উপজাতের আলাদা হেফাজত মজুদ পর্যালোচনা করুন।'
                  : 'Select a customer to review customer-owned material custody reconciliations.'}
              </Typography>
            </Stack>
          </Paper>

          {custodyData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Custody Summary Cards */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#fbf9f4', border: '1px solid #e8decb' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {isBn ? '১. ধান হেফাজত (Paddy Custody)' : '1. Customer Paddy Custody'}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.dark" sx={{ my: 1 }}>
                    {Number(custodyData.custodySummary.paddyInCustodyKg).toLocaleString('en-US', { minimumFractionDigits: 1 })} KG
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Received: {Number(custodyData.custodySummary.totalPaddyReceivedKg).toLocaleString()} KG | Processed: {Number(custodyData.custodySummary.totalPaddyProcessedKg).toLocaleString()} KG
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f4fbf6', border: '1px solid #cbe8d2' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {isBn ? '২. তৈরি চাল হেফাজত (Rice Custody)' : '2. Produced Rice Custody'}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.dark" sx={{ my: 1 }}>
                    {Number(custodyData.custodySummary.riceInCustodyKg).toLocaleString('en-US', { minimumFractionDigits: 1 })} KG
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Produced: {Number(custodyData.custodySummary.totalRiceProducedKg).toLocaleString()} KG | Delivered: {Number(custodyData.custodySummary.totalRiceDeliveredKg).toLocaleString()} KG
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#fbf4f4', border: '1px solid #e8cbcc' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {isBn ? '৩. উপজাত পণ্য হেফাজত (By-Product Custody)' : '3. By-Product Custody'}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="error.dark" sx={{ my: 1 }}>
                    {Number(custodyData.custodySummary.byProductInCustodyKg).toLocaleString('en-US', { minimumFractionDigits: 1 })} KG
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Produced: {Number(custodyData.custodySummary.totalByProductProducedKg).toLocaleString()} KG | Delivered: {Number(custodyData.custodySummary.totalByProductDeliveredKg).toLocaleString()} KG
                  </Typography>
                </Paper>
              </Box>

              {/* Customer Toll Orders History */}
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {isBn ? 'গ্রাহকের হাস্কিং আদেশের তালিকা' : 'Customer Toll Milling Orders'}
                </Typography>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell><strong>Order No</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Paddy Item</strong></TableCell>
                      <TableCell align="right"><strong>Paddy Received (KG)</strong></TableCell>
                      <TableCell align="right"><strong>Processed (KG)</strong></TableCell>
                      <TableCell align="right"><strong>Rice Produced (KG)</strong></TableCell>
                      <TableCell align="right"><strong>Rice Delivered (KG)</strong></TableCell>
                      <TableCell align="right"><strong>Toll Charges (৳)</strong></TableCell>
                      <TableCell align="center"><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {custodyData.orders.map((ord) => (
                      <TableRow key={ord.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{ord.orderNumber}</TableCell>
                        <TableCell>{new Date(ord.receivedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{ord.paddyItem?.name}</TableCell>
                        <TableCell align="right">{Number(ord.receivedQuantityKg).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(ord.processedQuantityKg).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(ord.totalRiceProducedKg).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(ord.totalRiceDeliveredKg).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ৳ {Number(ord.totalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={ord.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* CREATE ORDER DIALOG */}
      <Dialog open={createOrderOpen} onClose={() => setCreateOrderOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleCreateOrderSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isBn ? 'নতুন কমার্শিয়াল হাস্কিং আদেশ গ্রহণ' : 'Receive New Toll Milling Order'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                required
                size="small"
                label={isBn ? 'গ্রাহক' : 'Customer'}
                value={orderCustomerId}
                onChange={(e) => setOrderCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''} - {c.code}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                required
                size="small"
                label={isBn ? 'ধানের জাত' : 'Paddy Variety'}
                value={orderPaddyItemId}
                onChange={(e) => setOrderPaddyItemId(e.target.value)}
              >
                {paddyItems.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'আদেশ নং' : 'Order Number'}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'গ্রহণ তারিখ' : 'Received Date'}
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label={isBn ? 'গাড়ির নম্বর' : 'Vehicle Number'}
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
              <TextField
                size="small"
                label={isBn ? 'গ্রাহক চালান নং' : 'Customer Challan No'}
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'বস্তা সংখ্যা' : 'Received Bag Count'}
                value={receivedBagCount}
                onChange={(e) => setReceivedBagCount(parseInt(e.target.value, 10) || 0)}
              />
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'ধান প্রাপ্তির পরিমাণ (কেজি)' : 'Paddy Received (KG)'}
                value={receivedQuantityKg}
                onChange={(e) => setReceivedQuantityKg(e.target.value)}
                helperText={isBn ? 'ওয়েব্রিজ নিট ওজন (গ্রস - টেয়ার)' : 'Weighbridge Net Weight'}
              />
              <TextField
                size="small"
                label={isBn ? 'ড্রাইভারের নাম' : 'Driver Name'}
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </Box>

            <Divider />

            <Typography variant="subtitle2" fontWeight={700}>
              {isBn ? 'সার্ভিস চার্জ ও পলিসি' : 'Service Charges & By-Product Policy'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'টোল দর' : 'Toll Rate'}
                value={tollRate}
                onChange={(e) => setTollRate(e.target.value)}
              />
              <TextField
                select
                size="small"
                label={isBn ? 'দর হিসাবের ভিত্তি' : 'Rate Basis'}
                value={tollRateBasis}
                onChange={(e) => setTollRateBasis(e.target.value as 'PER_KG' | 'PER_MON' | 'PER_BAG')}
              >
                <MenuItem value="PER_KG">{isBn ? 'প্রতি কেজি (Per KG)' : 'Per KG'}</MenuItem>
                <MenuItem value="PER_MON">{isBn ? 'প্রতি মণ / ৪০ কেজি (Per Mon)' : 'Per Mon (40 KG)'}</MenuItem>
                <MenuItem value="PER_BAG">{isBn ? 'প্রতি বস্তা (Per Bag)' : 'Per Bag'}</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label={isBn ? 'উপজাত পণ্য পলিসি' : 'By-Product Policy'}
                value={byProductPolicy}
                onChange={(e) => setByProductPolicy(e.target.value as 'RETURN_TO_CUSTOMER' | 'MILL_RETENTION')}
              >
                <MenuItem value="RETURN_TO_CUSTOMER">{isBn ? 'গ্রাহক ফেরত পাবে' : 'Return to Customer'}</MenuItem>
                <MenuItem value="MILL_RETENTION">{isBn ? 'মিল রেখে দেবে' : 'Mill Retention'}</MenuItem>
              </TextField>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'অন্যান্য চার্জ (৳)' : 'Additional Charges (৳)'}
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(e.target.value)}
                helperText={isBn ? 'শুকানো / সিদ্ধ / লোডিং চার্জ' : 'Drying / Parboiling / Handling'}
              />
            </Box>

            <TextField
              size="small"
              multiline
              rows={2}
              label={isBn ? 'মন্তব্য (ঐচ্ছিক)' : 'Remarks'}
              value={orderRemarks}
              onChange={(e) => setOrderRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCreateOrderOpen(false)} color="inherit">
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={busy}>
              {isBn ? 'আদেশ গ্রহণ করুন' : 'Receive Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* NEW BATCH DIALOG */}
      <Dialog open={Boolean(batchModalOrder)} onClose={() => setBatchModalOrder(null)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateBatchSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isBn ? 'মাড়াই উৎপাদন ব্যাচ এন্ট্রি' : 'Record Toll Milling Batch'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {batchModalOrder && (
              <Alert severity="info">
                Order: <strong>{batchModalOrder.orderNumber}</strong> ({batchModalOrder.customer?.name})<br />
                Paddy Item: <strong>{batchModalOrder.paddyItem?.name}</strong><br />
                Remaining Paddy in Custody:{' '}
                <strong>
                  {Math.max(
                    0,
                    Number(batchModalOrder.receivedQuantityKg) - Number(batchModalOrder.processedQuantityKg),
                  ).toLocaleString()}{' '}
                  KG
                </strong>
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'ব্যাচ নম্বর' : 'Batch Number'}
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'ইনপুট ধান (কেজি)' : 'Input Paddy (KG)'}
                value={inputPaddyKg}
                onChange={(e) => setInputPaddyKg(e.target.value)}
              />
            </Box>

            <Typography variant="subtitle2" fontWeight={700}>
              {isBn ? 'উৎপাদিত চাল ও উপজাত পণ্য' : 'Outputs (Rice & By-Products)'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'মূল চাল (Head Rice KG)' : 'Head Rice (KG)'}
                value={headRiceKg}
                onChange={(e) => setHeadRiceKg(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'ভাঙা চাল (Broken Rice KG)' : 'Broken Rice (KG)'}
                value={brokenRiceKg}
                onChange={(e) => setBrokenRiceKg(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'কুঁড়া (Rice Bran KG)' : 'Rice Bran (KG)'}
                value={riceBranKg}
                onChange={(e) => setRiceBranKg(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'তুষ (Husk KG)' : 'Husk (KG)'}
                value={huskKg}
                onChange={(e) => setHuskKg(e.target.value)}
              />
            </Box>

            <TextField
              size="small"
              multiline
              rows={2}
              label={isBn ? 'মন্তব্য' : 'Remarks'}
              value={batchRemarks}
              onChange={(e) => setBatchRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setBatchModalOrder(null)} color="inherit">
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={busy}>
              {isBn ? 'ব্যাচ সংরক্ষণ করুন' : 'Save Batch'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* NEW DELIVERY DIALOG */}
      <Dialog open={Boolean(deliveryModalOrder)} onClose={() => setDeliveryModalOrder(null)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateDeliverySubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isBn ? 'টোল ডেলিভারি চালান ও গেট পাস' : 'Create Toll Delivery Challan & Gate Pass'}
          </DialogTitle>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {deliveryModalOrder && (
              <Alert severity="info">
                Customer: <strong>{deliveryModalOrder.customer?.name}</strong><br />
                Undelivered Rice in Custody:{' '}
                <strong>
                  {Math.max(
                    0,
                    Number(deliveryModalOrder.totalRiceProducedKg) - Number(deliveryModalOrder.totalRiceDeliveredKg),
                  ).toLocaleString()}{' '}
                  KG
                </strong>
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'চালান নম্বর' : 'Delivery Challan No'}
                value={deliveryNumber}
                onChange={(e) => setDeliveryNumber(e.target.value)}
              />
              <TextField
                required
                size="small"
                label={isBn ? 'গেট পাস নম্বর' : 'Gate Pass No'}
                value={gatePassNumber}
                onChange={(e) => setGatePassNumber(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'গাড়ির নম্বর' : 'Vehicle Number'}
                value={delivVehicle}
                onChange={(e) => setDelivVehicle(e.target.value)}
              />
              <TextField
                required
                size="small"
                label={isBn ? 'ড্রাইভার' : 'Driver Name'}
                value={delivDriver}
                onChange={(e) => setDelivDriver(e.target.value)}
              />
              <TextField
                type="date"
                required
                size="small"
                label={isBn ? 'তারিখ' : 'Date'}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Typography variant="subtitle2" fontWeight={700}>
              {isBn ? 'বিতরণ পরিমাণ' : 'Dispatched Quantities'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
              <TextField
                type="number"
                size="small"
                label={isBn ? 'বস্তা' : 'Bags'}
                value={delivBags}
                onChange={(e) => setDelivBags(parseInt(e.target.value, 10) || 0)}
              />
              <TextField
                type="number"
                required
                size="small"
                label={isBn ? 'চাল (কেজি)' : 'Rice (KG)'}
                value={delivRiceKg}
                onChange={(e) => setDelivRiceKg(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'ভাঙা চাল (কেজি)' : 'Broken Rice (KG)'}
                value={delivBrokenKg}
                onChange={(e) => setDelivBrokenKg(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'উপজাত (কেজি)' : 'By-Products (KG)'}
                value={delivByProductKg}
                onChange={(e) => setDelivByProductKg(e.target.value)}
                disabled={deliveryModalOrder?.byProductPolicy === 'MILL_RETENTION'}
              />
            </Box>

            <TextField
              size="small"
              multiline
              rows={2}
              label={isBn ? 'মন্তব্য' : 'Remarks'}
              value={delivRemarks}
              onChange={(e) => setDelivRemarks(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDeliveryModalOrder(null)} color="inherit">
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={busy}>
              {isBn ? 'চালান পোস্ট করুন' : 'Post Challan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* PRINTABLE VOUCHER DIALOG */}
      <Dialog open={Boolean(printDoc)} onClose={() => setPrintDoc(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{isBn ? 'টোল ক্রাশিং বিল ও চালান ভাউচার' : 'Toll Milling Service Invoice & Reconciliation'}</span>
          <Button variant="contained" size="small" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
            {isBn ? 'প্রিন্ট করুন' : 'Print Invoice'}
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {printDoc && (
            <Box sx={{ p: 2, fontFamily: 'serif' }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                  RICE MILL ERP
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  COMMERCIAL / TOLL MILLING SERVICE INVOICE & CUSTODY STATEMENT
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Customer-Owned Inventory Separation Confirmed
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Customer Details
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
                    Toll Job References
                  </Typography>
                  <Typography variant="body2">
                    Order No: <strong>{printDoc.orderNumber}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Date: {new Date(printDoc.receivedAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Vehicle: {printDoc.vehicleNumber || 'N/A'} (Challan: {printDoc.challanNumber || 'N/A'})
                  </Typography>
                  <Typography variant="body2">
                    Toll Rate: <strong>৳ {printDoc.tollRate} / {printDoc.tollRateBasis}</strong>
                  </Typography>
                </Paper>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Material Custody & Yield Summary
              </Typography>
              <Table size="small" sx={{ border: '1px solid #ccc', mb: 3 }}>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell><strong>Metric</strong></TableCell>
                    <TableCell align="right"><strong>Quantity (KG)</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Customer Paddy Received</TableCell>
                    <TableCell align="right">{Number(printDoc.receivedQuantityKg).toLocaleString()}</TableCell>
                    <TableCell>Bag Count: {printDoc.receivedBagCount}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Paddy Milled (Processed)</TableCell>
                    <TableCell align="right">{Number(printDoc.processedQuantityKg).toLocaleString()}</TableCell>
                    <TableCell>
                      Remaining Paddy in Custody:{' '}
                      {Math.max(0, Number(printDoc.receivedQuantityKg) - Number(printDoc.processedQuantityKg)).toLocaleString()} KG
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Finished Rice Produced</TableCell>
                    <TableCell align="right">{Number(printDoc.totalRiceProducedKg).toLocaleString()}</TableCell>
                    <TableCell>
                      Yield Recovery:{' '}
                      {Number(printDoc.processedQuantityKg) > 0
                        ? ((Number(printDoc.totalRiceProducedKg) / Number(printDoc.processedQuantityKg)) * 100).toFixed(2)
                        : '0.00'}
                      %
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Finished Rice Delivered</TableCell>
                    <TableCell align="right">{Number(printDoc.totalRiceDeliveredKg).toLocaleString()}</TableCell>
                    <TableCell>
                      Undelivered Rice in Custody:{' '}
                      {Math.max(0, Number(printDoc.totalRiceProducedKg) - Number(printDoc.totalRiceDeliveredKg)).toLocaleString()} KG
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>By-Products Produced</TableCell>
                    <TableCell align="right">{Number(printDoc.totalByProductProducedKg).toLocaleString()}</TableCell>
                    <TableCell>Policy: {printDoc.byProductPolicy}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Toll Service Billing
              </Typography>
              <Table size="small" sx={{ border: '1px solid #ccc', mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>Milling Service Charge ({printDoc.tollRateBasis})</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ৳ {Number(printDoc.tollChargeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Additional Charges (Drying / Handling / Parboiling)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ৳ {Number(printDoc.additionalCharges).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>TOTAL SERVICE INVOICE AMOUNT</strong></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', fontSize: 16 }}>
                      ৳ {Number(printDoc.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, pt: 6, mt: 4 }}>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Customer Representative</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Mill Production Manager</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', borderTop: '1px dashed #666', pt: 1 }}>
                  <Typography variant="caption">Accounts & Billing Officer</Typography>
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

