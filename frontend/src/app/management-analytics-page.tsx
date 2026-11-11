'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import PieChartRoundedIcon from '@mui/icons-material/PieChartRounded';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface ManagementAnalyticsPageProps {
  companyId: string;
  factoryId?: string;
  language: 'en' | 'bn';
}

interface AnalyticsData {
  kpis: {
    averagePaddyRate: number;
    averageSalesRate: number;
    averageRecovery: number;
    costPerKg: number;
    profitPerKg: number;
    grossMargin: number;
    stockTurnover: number;
    workingCapital: number;
  };
  charts: {
    paddyPurchaseTrend: { date: string; quantityKg: number; amount: number }[];
    paddyPriceTrend: { date: string; avgRate: number }[];
    ricePriceTrend: { date: string; avgRate: number }[];
    productionTrend: { date: string; inputKg: number; outputKg: number }[];
    recoveryTrend: { date: string; recoveryPercent: number }[];
    salesTrend: { date: string; quantityKg: number; amount: number }[];
    profitTrend: { date: string; grossProfit: number; netProfit: number }[];
    expenseTrend: { date: string; amount: number }[];
    stockAging: { bracket: string; quantityKg: number; estimatedValue: number }[];
    supplierPerformance: {
      supplierId: string;
      supplierName: string;
      totalKg: number;
      totalAmount: number;
      orderCount: number;
      averageRate: number;
    }[];
    customerProfitability: {
      customerId: string;
      customerName: string;
      totalKg: number;
      revenue: number;
      orderCount: number;
      averageRate: number;
      grossMarginPercent: number;
    }[];
  };
}

export function ManagementAnalyticsPage({
  companyId,
  factoryId,
  language,
}: ManagementAnalyticsPageProps) {
  const isBn = language === 'bn';
  const [days, setDays] = useState('30');

  const { data, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['management-analytics', companyId, factoryId, days],
    queryFn: () => {
      const q = new URLSearchParams({ companyId, days });
      if (factoryId) q.set('factoryId', factoryId);
      return apiRequest(`/dashboard/analytics?${q.toString()}`);
    },
    enabled: Boolean(companyId),
  });

  const formatCurrency = (val: number | undefined) => {
    return `৳ ${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatKg = (val: number | undefined) => {
    return `${(val || 0).toLocaleString('en-IN')} KG`;
  };

  // Helper SVG Line Sparkline Component
  const renderSparkline = (
    series: { label: string; value: number }[],
    color: string,
    unit: string,
  ) => {
    if (!series || series.length === 0) return null;
    const values = series.map(s => s.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const width = 280;
    const height = 60;

    const points = series.map((s, idx) => {
      const x = (idx / (series.length - 1 || 1)) * (width - 20) + 10;
      const y = height - 10 - ((s.value - min) / range) * (height - 20);
      return `${x},${y}`;
    }).join(' ');

    return (
      <Box sx={{ width: '100%', overflowX: 'auto', py: 1 }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {series.map((s, idx) => {
            const x = (idx / (series.length - 1 || 1)) * (width - 20) + 10;
            const y = height - 10 - ((s.value - min) / range) * (height - 20);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3"
                fill={color}
              >
                <title>{`${s.label}: ${s.value.toLocaleString('en-IN')} ${unit}`}</title>
              </circle>
            );
          })}
        </svg>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header & Controls */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsightsRoundedIcon />
            {isBn ? 'ম্যানেজমেন্ট অ্যানালিটিক্স ও ব্যবসায়িক ইনসাইট' : 'Management Analytics & Business Intelligence'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'কৌশলগত কেপিআই, মূল্য ও উৎপাদনের ট্রেন্ড, স্টক এজিং এবং সরবরাহকারী ও ক্রেতার লাভজনকতা বিশ্লেষণ'
              : 'Strategic KPIs, price/production trends, stock aging brackets, and supplier/customer performance'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{isBn ? 'সময়কাল' : 'Time Horizon'}</InputLabel>
            <Select
              value={days}
              label={isBn ? 'সময়কাল' : 'Time Horizon'}
              onChange={e => setDays(e.target.value)}
            >
              <MenuItem value="7">{isBn ? 'গত ৭ দিন' : 'Last 7 Days'}</MenuItem>
              <MenuItem value="30">{isBn ? 'গত ৩০ দিন' : 'Last 30 Days'}</MenuItem>
              <MenuItem value="90">{isBn ? 'গত ৯০ দিন' : 'Last 90 Days'}</MenuItem>
              <MenuItem value="365">{isBn ? 'গত ১ বছর' : 'Last 365 Days'}</MenuItem>
            </Select>
          </FormControl>

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
          {isBn ? 'অ্যানালিটিক্স ডেটা লোড করা সম্ভব হয়নি।' : 'Failed to load management analytics data.'}
        </Alert>
      )}

      {isLoading && <LinearProgress />}

      {/* 1. Strategic KPIs Grid */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpRoundedIcon color="primary" />
          {isBn ? 'কৌশলগত কেপিআই (Strategic Executive KPIs)' : 'Executive Strategic KPIs'}
        </Typography>

        <Grid container spacing={2}>
          {/* Average Paddy Rate */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #1976d2' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'গড় ধান দর (Avg Paddy Rate)' : 'Average Paddy Rate'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {formatCurrency(data?.kpis.averagePaddyRate)} / KG
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'ক্রয়কৃত ধানের ভারিত গড় দর' : 'Weighted average procurement price'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Average Sales Rate */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #2e7d32' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'গড় বিক্রয় দর (Avg Sales Rate)' : 'Average Sales Rate'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: 'success.main' }}>
                  {formatCurrency(data?.kpis.averageSalesRate)} / KG
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'চাল বিক্রয়ের ভারিত গড় দর' : 'Realized average rice sales rate'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Average Recovery */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #ed6c02' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'গড় রিকভারি হার (Avg Recovery)' : 'Average Recovery Rate'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: 'warning.main' }}>
                  {(data?.kpis.averageRecovery || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'ধান হতে চালের উৎপাদন অনুপাত' : 'Rice yield per 100 KG paddy'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cost Per KG */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #9c27b0' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'উৎপাদন ব্যয় (Cost / KG)' : 'Total Cost / KG'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: '#9c27b0' }}>
                  {formatCurrency(data?.kpis.costPerKg)} / KG
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'ধান ক্রয় + মিলিং ও বিবিধ খরচ' : 'Paddy cost + processing overhead'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Profit Per KG */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #009688' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'প্রতি কেজিতে লাভ (Profit / KG)' : 'Net Profit / KG'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: '#009688' }}>
                  {formatCurrency(data?.kpis.profitPerKg)} / KG
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'বিক্রয় দর বিয়োগ মোট ব্যয়' : 'Sales rate minus cost per KG'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Gross Margin */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #4caf50' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'গ্রস মার্জিন (Gross Margin %)' : 'Gross Margin %'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: 'success.dark' }}>
                  {(data?.kpis.grossMargin || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'মোট লাভ ও বিক্রয়ের অনুপাত' : 'Revenue minus production direct cost'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Stock Turnover */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #ff9800' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'স্টক টার্নওভার (Stock Turnover)' : 'Inventory Turnover'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5 }}>
                  {(data?.kpis.stockTurnover || 0).toFixed(1)}x
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'বার্ষিক মজুদ আবর্তন গতি' : 'Annual inventory velocity index'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Working Capital */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper', borderTop: '4px solid #00bcd4' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  {isBn ? 'কার্যকরী মূলধন (Working Capital)' : 'Working Capital'}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ my: 0.5, color: '#00838f' }}>
                  {formatCurrency(data?.kpis.workingCapital)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isBn ? 'নগদ + ব্যাংক + বাকি + মজুদ - দেনা' : 'Current assets minus current liabilities'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* 2. Visual Trends (8 Charts) */}
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartRoundedIcon color="primary" />
          {isBn ? 'কার্যক্রম ও মূল্যের গতিবিধি (Operational Trends)' : 'Operational & Financial Trends'}
        </Typography>

        <Grid container spacing={3}>
          {/* Trend 1: Paddy Purchase Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '১. ধান ক্রয় ট্রেন্ড (Paddy Purchase Trend)' : '1. Paddy Purchase Trend'}
                </Typography>
                <Chip size="small" label="KG" color="primary" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.paddyPurchaseTrend || []).map(t => ({ label: t.date, value: t.quantityKg })),
                '#1976d2',
                'KG',
              )}
            </Paper>
          </Grid>

          {/* Trend 2: Paddy Price Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '২. ধানের বাজার দর ট্রেন্ড (Paddy Price Trend)' : '2. Paddy Price Trend'}
                </Typography>
                <Chip size="small" label="৳/KG" color="info" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.paddyPriceTrend || []).map(t => ({ label: t.date, value: t.avgRate })),
                '#0288d1',
                '৳',
              )}
            </Paper>
          </Grid>

          {/* Trend 3: Rice Price Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৩. চালের বিক্রয় দর ট্রেন্ড (Rice Price Trend)' : '3. Rice Price Trend'}
                </Typography>
                <Chip size="small" label="৳/KG" color="success" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.ricePriceTrend || []).map(t => ({ label: t.date, value: t.avgRate })),
                '#2e7d32',
                '৳',
              )}
            </Paper>
          </Grid>

          {/* Trend 4: Production Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৪. মিলিং উৎপাদন ট্রেন্ড (Production Trend)' : '4. Milling Production Trend'}
                </Typography>
                <Chip size="small" label="Input KG" color="warning" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.productionTrend || []).map(t => ({ label: t.date, value: t.inputKg })),
                '#ed6c02',
                'KG',
              )}
            </Paper>
          </Grid>

          {/* Trend 5: Recovery Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৫. চাল রিকভারি ট্রেন্ড (Recovery % Trend)' : '5. Rice Recovery % Trend'}
                </Typography>
                <Chip size="small" label="%" color="secondary" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.recoveryTrend || []).map(t => ({ label: t.date, value: t.recoveryPercent })),
                '#9c27b0',
                '%',
              )}
            </Paper>
          </Grid>

          {/* Trend 6: Sales Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৬. বিক্রয় ট্রেন্ড (Sales Revenue Trend)' : '6. Sales Revenue Trend'}
                </Typography>
                <Chip size="small" label="৳ Amount" color="success" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.salesTrend || []).map(t => ({ label: t.date, value: t.amount })),
                '#388e3c',
                '৳',
              )}
            </Paper>
          </Grid>

          {/* Trend 7: Profit Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৭. লাভ ট্রেন্ড (Net Profit Trend)' : '7. Net Profit Trend'}
                </Typography>
                <Chip size="small" label="৳ Net" color="primary" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.profitTrend || []).map(t => ({ label: t.date, value: t.netProfit })),
                '#00897b',
                '৳',
              )}
            </Paper>
          </Grid>

          {/* Trend 8: Expense Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {isBn ? '৮. ব্যয় ট্রেন্ড (Expense Trend)' : '8. Expense Trend'}
                </Typography>
                <Chip size="small" label="৳ Exp" color="error" variant="outlined" />
              </Stack>
              {renderSparkline(
                (data?.charts.expenseTrend || []).map(t => ({ label: t.date, value: t.amount })),
                '#d32f2f',
                '৳',
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* 3. Stock Aging & Counterparties */}
      <Grid container spacing={3}>
        {/* Stock Aging */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryRoundedIcon color="primary" />
              {isBn ? 'স্টক এজিং বিশ্লেষণ (Stock Aging)' : 'Stock Aging Brackets'}
            </Typography>

            <Stack spacing={2}>
              {(data?.charts.stockAging || []).map((sa, idx) => {
                const color = idx === 0 ? '#4caf50' : idx === 1 ? '#2196f3' : idx === 2 ? '#ff9800' : '#f44336';
                return (
                  <Box key={sa.bracket} sx={{ p: 1.5, borderLeft: `4px solid ${color}`, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {sa.bracket}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700} color={color}>
                        {formatKg(sa.quantityKg)}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {isBn ? `আনুমানিক মূল্য: ${formatCurrency(sa.estimatedValue)}` : `Valuation: ${formatCurrency(sa.estimatedValue)}`}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* Supplier Performance */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PrecisionManufacturingRoundedIcon color="warning" />
              {isBn ? 'শীর্ষ সরবরাহকারী (Supplier Matrix)' : 'Top Supplier Performance'}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'সাপ্লায়ার' : 'Supplier'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{isBn ? 'পরিমাণ' : 'Volume'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{isBn ? 'গড় দর' : 'Rate'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.charts.supplierPerformance || []).slice(0, 5).map(s => (
                    <TableRow key={s.supplierId}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{s.supplierName}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>{formatKg(s.totalKg)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>{formatCurrency(s.averageRate)}</TableCell>
                    </TableRow>
                  ))}
                  {(!data?.charts.supplierPerformance || data.charts.supplierPerformance.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                        {isBn ? 'কোনো সরবরাহকারী পাওয়া যায়নি' : 'No supplier data available'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Customer Profitability */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceRoundedIcon color="success" />
              {isBn ? 'শীর্ষ ক্রেতার লাভজনকতা (Customer Margin)' : 'Customer Profitability'}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'ক্রেতা' : 'Customer'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{isBn ? 'বিক্রয়' : 'Revenue'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{isBn ? 'মার্জিন' : 'Margin'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.charts.customerProfitability || []).slice(0, 5).map(c => (
                    <TableRow key={c.customerId}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{c.customerName}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>{formatCurrency(c.revenue)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, color: 'success.main', fontWeight: 600 }}>
                        {c.grossMarginPercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.charts.customerProfitability || data.charts.customerProfitability.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                        {isBn ? 'কোনো ক্রেতার তথ্য পাওয়া যায়নি' : 'No customer data available'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

