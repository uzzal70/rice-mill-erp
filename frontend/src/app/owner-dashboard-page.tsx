'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface OwnerDashboardPageProps {
  companyId: string;
  factoryId?: string;
  language: 'en' | 'bn';
}

interface OwnerDashboardData {
  today: {
    paddyPurchaseKg: number;
    paddyPurchaseAmount: number;
    paddyReceivedKg: number;
    productionKg: number;
    riceOutputKg: number;
    salesKg: number;
    salesAmount: number;
    collectionAmount: number;
    expensesAmount: number;
    grossProfit: number;
    netProfit: number;
  };
  stock: {
    paddyKg: number;
    riceKg: number;
    brokenKg: number;
    branKg: number;
    huskKg: number;
    packagingUnits: number;
  };
  finance: {
    cashBalance: number;
    bankBalance: number;
    customerDue: number;
    supplierDue: number;
  };
  operations: {
    totalVehicles: number;
    activeTrips: number;
    pendingQuality: number;
    pendingApprovals: number;
    runningBatches: number;
    lowStockItems: number;
  };
}

export function OwnerDashboardPage({
  companyId,
  factoryId,
  language,
}: OwnerDashboardPageProps) {
  const isBn = language === 'bn';

  const { data, isLoading, error, refetch } = useQuery<OwnerDashboardData>({
    queryKey: ['owner-dashboard', companyId, factoryId],
    queryFn: () => {
      const q = new URLSearchParams({ companyId });
      if (factoryId) q.set('factoryId', factoryId);
      return apiRequest(`/dashboard/owner?${q.toString()}`);
    },
    enabled: Boolean(companyId),
    refetchInterval: 30000,
  });

  const formatCurrency = (val: number | undefined) => {
    return `৳ ${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatKg = (val: number | undefined) => {
    return `${(val || 0).toLocaleString('en-IN')} KG`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            {isBn ? 'মালিকানা ড্যাশবোর্ড (এক্সিকিউটিভ ভিউ)' : 'Owner Executive Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'দৈনিক ক্রয়, উৎপাদন, বিক্রয়, নগদ প্রবাহ ও স্টক পরিস্থিতির রিয়েল-টাইম সারসংক্ষেপ'
              : 'Real-time overview of daily purchases, milling, sales, cash flow, and plant operations'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<CheckCircleOutlineRoundedIcon />}
            label={isBn ? 'সরাসরি লাইভ ডেটা' : 'Live Plant Telemetry'}
            color="success"
            variant="outlined"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error">
          {isBn ? 'ড্যাশবোর্ড ডেটা লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load dashboard statistics.'}
        </Alert>
      )}

      {isLoading && <LinearProgress />}

      {/* 1. Today's Snapshot Header */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpRoundedIcon color="primary" />
          {isBn ? 'আজকের কার্যবিবরণী (Today\'s Pulse)' : "Today's Operational Pulse"}
        </Typography>

        <Grid container spacing={2}>
          {/* Paddy Purchase */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #1976d2' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের ধান ক্রয়' : "Today's Paddy Purchase"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {formatKg(data?.today.paddyPurchaseKg)}
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  {formatCurrency(data?.today.paddyPurchaseAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Paddy Received */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #0288d1' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের ধান রিসিভ' : "Today's Paddy Received"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {formatKg(data?.today.paddyReceivedKg)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'গেট ওজন ও পরিমাপ সম্পন্ন' : 'Physical gate weighed & received'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Today Production */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #ed6c02' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের মিলিং ইনপুট' : "Today's Paddy Milled"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {formatKg(data?.today.productionKg)}
                </Typography>
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                  {isBn ? `চাল উৎপাদন: ${formatKg(data?.today.riceOutputKg)}` : `Rice Out: ${formatKg(data?.today.riceOutputKg)}`}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Today Sales */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #2e7d32' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের চাল ও উপজাত বিক্রয়' : "Today's Sales"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {formatKg(data?.today.salesKg)}
                </Typography>
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  {formatCurrency(data?.today.salesAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Collections */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #9c27b0' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের কালেকশন (আদায়)' : "Today's Collections"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: '#9c27b0' }}>
                  {formatCurrency(data?.today.collectionAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'গ্রাহকদের হতে প্রাপ্ত অর্থ' : 'Customer payments received'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Expenses */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #d32f2f' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের মোট খরচ' : "Today's Expenses"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: 'error.main' }}>
                  {formatCurrency(data?.today.expensesAmount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'মিল পরিচালনা ও বিবিধ ব্যয়' : 'Operating and plant expenses'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Gross Profit */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #009688' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের আনুমানিক মোট লাভ' : "Today's Gross Profit"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: '#009688' }}>
                  {formatCurrency(data?.today.grossProfit)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'বিক্রয় ও প্রত্যক্ষ খরচ ভিত্তিক' : 'Revenue minus production COGS'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Net Profit */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderLeft: '4px solid #4caf50' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
                  {isBn ? 'আজকের নিট লাভ' : "Today's Net Profit"}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: 'success.dark' }}>
                  {formatCurrency(data?.today.netProfit)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'মোট লাভ বিয়োগ আজকের খরচ' : 'Gross profit minus operating expense'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 2. Stock and Finance Row */}
      <Grid container spacing={3}>
        {/* Stock Breakdown */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory2RoundedIcon color="secondary" />
              {isBn ? 'গুদাম ও সাইলো স্টক পরিস্থিতি' : 'Godown & Silo Stock Position'}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#f9fbe7' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'ধান (Paddy)' : 'Paddy Stock'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#33691e">
                    {formatKg(data?.stock.paddyKg)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'চাল (Finished Rice)' : 'Finished Rice'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#1b5e20">
                    {formatKg(data?.stock.riceKg)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'খুদ (Broken Rice)' : 'Broken Rice'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#e65100">
                    {formatKg(data?.stock.brokenKg)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#fbe9e7' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'কুঁড়া (Rice Bran)' : 'Rice Bran'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#bf360c">
                    {formatKg(data?.stock.branKg)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#efebe9' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'তুষ (Husk)' : 'Husk Stock'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#4e342e">
                    {formatKg(data?.stock.huskKg)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#e0f2f1' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {isBn ? 'বস্তা (Bags/Packaging)' : 'Packaging Bags'}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#004d40">
                    {(data?.stock.packagingUnits || 0).toLocaleString('en-IN')} {isBn ? 'টি' : 'Units'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Finance Snapshot */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletRoundedIcon color="primary" />
              {isBn ? 'আর্থিক স্থিতি (Finance & Treasury)' : 'Finance & Treasury Position'}
            </Typography>

            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {isBn ? 'নগদ ক্যাশ (Cash in Hand)' : 'Cash in Hand'}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="success.main">
                  {formatCurrency(data?.finance.cashBalance)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {isBn ? 'ব্যাংক ব্যালেন্স (Bank Accounts)' : 'Bank Balances'}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                  {formatCurrency(data?.finance.bankBalance)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#fff8e1', borderRadius: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {isBn ? 'কাস্টমার বাকি (Customer Due - AR)' : 'Customer Due (AR)'}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                  {formatCurrency(data?.finance.customerDue)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#ffebee', borderRadius: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {isBn ? 'সাপ্লায়ার পাওনা (Supplier Due - AP)' : 'Supplier Due (AP)'}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="error.main">
                  {formatCurrency(data?.finance.supplierDue)}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Operations Pulse */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrecisionManufacturingRoundedIcon color="warning" />
          {isBn ? 'কারখানা পরিচালনা ও পর্যবেক্ষণ (Operations)' : 'Plant Operations Snapshot'}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <LocalShippingRoundedIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700}>
                {data?.operations.totalVehicles || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? `মোট গাড়ি (${data?.operations.activeTrips || 0} ট্রিপে)` : `Fleet (${data?.operations.activeTrips || 0} in transit)`}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <WarningAmberRoundedIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700} color="warning.main">
                {data?.operations.pendingQuality || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'কোয়ালিটি যাচাই বাকি' : 'Pending Quality Lab'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <CheckCircleOutlineRoundedIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700} color="info.main">
                {data?.operations.pendingApprovals || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approvals'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <PrecisionManufacturingRoundedIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700} color="success.main">
                {data?.operations.runningBatches || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'চলমান মিলিং ব্যাচ' : 'Active Milling Batches'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <WarningAmberRoundedIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h5" fontWeight={700} color="error.main">
                {data?.operations.lowStockItems || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'কম স্টক আইটেম (<5T)' : 'Low Stock Alerts'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

