'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import FactoryRoundedIcon from '@mui/icons-material/FactoryRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface ProfitabilityPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

export function ProfitabilityPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: ProfitabilityPageProps) {
  const queryClient = useQueryClient();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Batch, 1: Purchase, 2: Products, 3: Customers, 4: Factories
  const dimensions = ['BATCH', 'PURCHASE', 'PRODUCT', 'CUSTOMER', 'FACTORY'] as const;
  const currentDimension = dimensions[activeTab];

  // Recalculate Batch Dialog
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [paddyRate, setPaddyRate] = useState('32');
  const [processingCost, setProcessingCost] = useState('5000');
  const [labourCost, setLabourCost] = useState('12000');
  const [electricityCost, setElectricityCost] = useState('8000');
  const [packagingCost, setPackagingCost] = useState('4000');
  const [transportCost, setTransportCost] = useState('3000');
  const [overheadCost, setOverheadCost] = useState('2000');
  const [riceSalesRate, setRiceSalesRate] = useState('65');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load summary for active dimension
  const summaryQuery = useQuery({
    queryKey: ['profitability-summary', companyId, currentDimension],
    queryFn: async () => {
      return apiRequest<{
        dimension: string;
        records: any[];
        summary: {
          totalRevenue?: number;
          totalCost?: number;
          totalProfit?: number;
          avgMarginPct?: number;
          totalBatches?: number;
          totalLots?: number;
          totalProducts?: number;
          totalCustomers?: number;
          totalFactories?: number;
        };
      }>(`/profitability/summary?companyId=${companyId}&dimension=${currentDimension}`);
    },
    enabled: Boolean(companyId),
  });

  const handleCalculateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে ব্যাচ আইডি প্রদান করুন' : 'Please provide batch ID');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await apiRequest('/profitability/batches/calculate', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          batchId,
          paddyRatePerKg: Number(paddyRate) || undefined,
          processingCost: Number(processingCost) || 0,
          labourCost: Number(labourCost) || 0,
          electricityCost: Number(electricityCost) || 0,
          packagingCost: Number(packagingCost) || 0,
          transportCost: Number(transportCost) || 0,
          overheadCost: Number(overheadCost) || 0,
          projectedRiceSalesRatePerKg: Number(riceSalesRate) || 65,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['profitability-summary'] });
      setCalcDialogOpen(false);
      onSaved(isBn ? 'ব্যাচের লাভজনকতা সফলভাবে হিসাব করা হয়েছে' : 'Batch profitability calculated successfully');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to calculate batch profitability');
    } finally {
      setBusy(false);
    }
  };

  const records = summaryQuery.data?.records || [];
  const summary = summaryQuery.data?.summary || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} display="flex" alignItems="center" gap={1}>
            <TrendingUpRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'লাভজনকতা ইঞ্জিন (Profitability Engine)' : 'Profitability Engine'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'ক্রয়, উৎপাদন ব্যাচ, কেজি, মণ, টন, ব্র্যান্ড ও গ্রাহকভিত্তিক বহু-মাত্রিক লাভ-ক্ষতি ও মার্জিন বিশ্লেষণ'
              : 'Multi-dimensional profitability & margin calculations per purchase lot, batch, KG, Mon, Ton, brand, and customer'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
          >
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CalculateRoundedIcon />}
            onClick={() => setCalcDialogOpen(true)}
          >
            {isBn ? 'নতুন ব্যাচ লাভজনকতা হিসাব' : 'Calculate Batch Costing'}
          </Button>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#f0fdf4' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মোট সম্ভাব্য বিক্রয় মূল্য (Revenue)' : 'TOTAL REVENUE'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#166534">
              ৳ {(summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#fef2f2' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মোট প্রকৃত চালের খরচ (Net Cost)' : 'TOTAL NET COST'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#991b1b">
              ৳ {(summary.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#eff6ff' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'মোট মোট লাভ (Gross Profit)' : 'GROSS PROFIT'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#1e40af">
              ৳ {(summary.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: '#faf5ff' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {isBn ? 'গড় মুনাফা মার্জিন (Margin %)' : 'AVERAGE MARGIN %'}
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#6b21a8">
              {(summary.avgMarginPct || 0).toFixed(2)} %
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Inventory2RoundedIcon />} iconPosition="start" label={isBn ? 'উৎপাদন ব্যাচ (Batches)' : 'Production Batches'} />
          <Tab icon={<ShoppingBagRoundedIcon />} iconPosition="start" label={isBn ? 'ধান ক্রয় লট (Purchase Lots)' : 'Purchase Lots'} />
          <Tab icon={<MonetizationOnRoundedIcon />} iconPosition="start" label={isBn ? 'পণ্য ও ব্র্যান্ড (Products/Brands)' : 'Products & Brands'} />
          <Tab icon={<PeopleAltRoundedIcon />} iconPosition="start" label={isBn ? 'গ্রাহকভিত্তিক লাভ (Customers)' : 'Customer Profitability'} />
          <Tab icon={<FactoryRoundedIcon />} iconPosition="start" label={isBn ? 'কারখানাসমূহ (Factories)' : 'Factories'} />
        </Tabs>
      </Paper>

      {/* Tab 0: Production Batches Table */}
      {activeTab === 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Batch Number</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paddy Cost</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>By-Product Credit</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Net Rice Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Finished Rice KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / Mon (40KG)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Projected Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'কোন ব্যাচ লাভজনকতা তথ্য নেই। উপরের বাটনে ক্লিক করে হিসাব করুন।' : 'No batch profitability records found. Click Calculate Batch Costing to start.'}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.batchNumber}</TableCell>
                    <TableCell>৳ {Number(r.paddyCost).toLocaleString()}</TableCell>
                    <TableCell sx={{ color: 'success.main' }}>- ৳ {Number(r.byProductRevenue).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>৳ {Number(r.netRiceCost).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.finishedRiceKg).toLocaleString()} KG</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>৳ {Number(r.costPerKg).toFixed(2)}</TableCell>
                    <TableCell align="right">৳ {Number(r.costPerMon).toFixed(2)}</TableCell>
                    <TableCell align="right">৳ {Number(r.costPerTon).toFixed(0)}</TableCell>
                    <TableCell align="right">৳ {Number(r.projectedRevenue).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: Number(r.grossProfit) >= 0 ? 'success.dark' : 'error.dark' }}>
                      ৳ {Number(r.grossProfit).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        color={Number(r.grossMarginPct) >= 20 ? 'success' : Number(r.grossMarginPct) >= 10 ? 'primary' : 'warning'}
                        label={`${Number(r.grossMarginPct).toFixed(1)}%`}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 1: Purchase Lots */}
      {activeTab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paddy Variety</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Net Paddy KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Purchase Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / Mon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Projected Milled Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Projected Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.invoiceNumber}</TableCell>
                  <TableCell>{r.supplier}</TableCell>
                  <TableCell>{r.paddyItem}</TableCell>
                  <TableCell align="right">{Number(r.netPaddyKg).toLocaleString()} KG</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>৳ {Number(r.totalPurchaseCost).toLocaleString()}</TableCell>
                  <TableCell align="right">৳ {Number(r.costPerKg).toFixed(2)}</TableCell>
                  <TableCell align="right">৳ {Number(r.costPerMon).toFixed(2)}</TableCell>
                  <TableCell align="right">৳ {Number(r.costPerTon).toFixed(0)}</TableCell>
                  <TableCell align="right">৳ {Number(r.projectedRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="primary" label={`${Number(r.marginPct).toFixed(1)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 2: Products & Brands */}
      {activeTab === 2 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Variety</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Cost / Mon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Sales Rate / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Profit / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Gross Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name} ({r.code})</TableCell>
                  <TableCell>{r.brand}</TableCell>
                  <TableCell>{r.variety}</TableCell>
                  <TableCell align="right">৳ {Number(r.unitCostKg).toFixed(2)}</TableCell>
                  <TableCell align="right">৳ {Number(r.unitCostMon).toFixed(2)}</TableCell>
                  <TableCell align="right">৳ {Number(r.unitCostTon).toFixed(0)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>৳ {Number(r.salesRatePerKg).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>৳ {Number(r.grossProfitKg).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="success" label={`${Number(r.grossMarginPct).toFixed(1)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 3: Customers */}
      {activeTab === 3 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Sales Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Estimated COGS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>{r.code}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>৳ {Number(r.totalRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right">৳ {Number(r.estimatedCost).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>৳ {Number(r.grossProfit).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="primary" label={`${Number(r.grossMarginPct).toFixed(1)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 4: Factories */}
      {activeTab === 4 && (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Factory Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Batches Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell>{r.code}</TableCell>
                  <TableCell align="right">{r.batchCount}</TableCell>
                  <TableCell align="right">৳ {Number(r.totalRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right">৳ {Number(r.totalCost).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>৳ {Number(r.grossProfit).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="success" label={`${Number(r.grossMarginPct).toFixed(1)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Recalculate Batch Costing Dialog */}
      <Dialog open={calcDialogOpen} onClose={() => !busy && setCalcDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCalculateBatch}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isBn ? 'উৎপাদন ব্যাচের লাভজনকতা ও খরচ হিসাব' : 'Calculate Batch Costing & Profitability'}
          </DialogTitle>
          <DialogContent dividers>
            {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {isBn
                ? 'সূত্র: নেট চালের খরচ = ধানের খরচ + প্রসেসিং + লেবার + বিদ্যুৎ + প্যাকেজিং + পরিবহন + ওভারহেড - বাই-প্রোডাক্ট আয়'
                : 'Formula: Net Rice Cost = Paddy Cost + Processing + Labour + Electricity + Packaging + Transport + Overhead - By-product Revenue'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                required
                size="small"
                label={isBn ? 'ব্যাচ আইডি' : 'Batch ID'}
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                sx={{ gridColumn: 'span 2' }}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'ধানের দর / কেজি (৳)' : 'Paddy Rate / KG (৳)'}
                value={paddyRate}
                onChange={(e) => setPaddyRate(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'প্রজেক্টেড চালের দর / কেজি' : 'Rice Sales Rate / KG (৳)'}
                value={riceSalesRate}
                onChange={(e) => setRiceSalesRate(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'মেশিন প্রসেসিং খরচ' : 'Processing Cost (৳)'}
                value={processingCost}
                onChange={(e) => setProcessingCost(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'শ্রমিক মজুরি (Labour)' : 'Labour Cost (৳)'}
                value={labourCost}
                onChange={(e) => setLabourCost(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'বিদ্যুৎ / পাওয়ার খরচ' : 'Electricity Cost (৳)'}
                value={electricityCost}
                onChange={(e) => setElectricityCost(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'প্যাকেজিং ও বস্তা খরচ' : 'Packaging Cost (৳)'}
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'পরিবহন খরচ' : 'Transport Cost (৳)'}
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
              />
              <TextField
                type="number"
                size="small"
                label={isBn ? 'কারখানা ওভারহেড' : 'Factory Overhead (৳)'}
                value={overheadCost}
                onChange={(e) => setOverheadCost(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCalcDialogOpen(false)} disabled={busy}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? (isBn ? 'হিসাব হচ্ছে...' : 'Calculating...') : (isBn ? 'হিসাব ও সংরক্ষণ করুন' : 'Calculate & Save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

