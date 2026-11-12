'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { AppTextField, FormDialog, FormGrid } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

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
  const toast = useToast();
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    const rules: FieldRule[] = [
      { name: 'calcBatchId', label: isBn ? 'ব্যাচ আইডি' : 'Batch ID', value: batchId, required: true },
    ];
    if (paddyRate.trim()) rules.push({ name: 'paddyRate', label: isBn ? 'ধানের দর / কেজি' : 'Paddy Rate / KG', value: paddyRate, type: 'nonNegativeNumber' });
    if (riceSalesRate.trim()) rules.push({ name: 'riceSalesRate', label: isBn ? 'চালের দর / কেজি' : 'Rice Sales Rate / KG', value: riceSalesRate, type: 'nonNegativeNumber' });
    if (processingCost.trim()) rules.push({ name: 'processingCost', label: isBn ? 'প্রসেসিং খরচ' : 'Processing Cost', value: processingCost, type: 'nonNegativeNumber' });
    if (labourCost.trim()) rules.push({ name: 'labourCost', label: isBn ? 'শ্রমিক মজুরি' : 'Labour Cost', value: labourCost, type: 'nonNegativeNumber' });
    if (electricityCost.trim()) rules.push({ name: 'electricityCost', label: isBn ? 'বিদ্যুৎ খরচ' : 'Electricity Cost', value: electricityCost, type: 'nonNegativeNumber' });
    if (packagingCost.trim()) rules.push({ name: 'packagingCost', label: isBn ? 'প্যাকেজিং খরচ' : 'Packaging Cost', value: packagingCost, type: 'nonNegativeNumber' });
    if (transportCost.trim()) rules.push({ name: 'transportCost', label: isBn ? 'পরিবহন খরচ' : 'Transport Cost', value: transportCost, type: 'nonNegativeNumber' });
    if (overheadCost.trim()) rules.push({ name: 'overheadCost', label: isBn ? 'কারখানা ওভারহেড' : 'Factory Overhead', value: overheadCost, type: 'nonNegativeNumber' });

    const validation = validateFormFields(rules, language);
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
      await apiRequest('/profitability/batches/calculate', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          factoryId,
          batchId: batchId.trim(),
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
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to calculate batch profitability');
      setErrorMsg(msg);
      toast.error(msg);
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
            onClick={() => {
              setErrorMsg(null);
              setFieldErrors({});
              setCalcDialogOpen(true);
            }}
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1250 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Batch Number</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Paddy Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>By-Product Credit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Net Rice Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Finished Rice KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / Mon (40KG)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Projected Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Margin %</TableCell>
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
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.batchNumber}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.paddyCost).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>- ৳ {Number(r.byProductRevenue).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.netRiceCost).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(r.finishedRiceKg).toLocaleString()} KG</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerKg).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerMon).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerTon).toFixed(0)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.projectedRevenue).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: Number(r.grossProfit) >= 0 ? 'success.dark' : 'error.dark', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      ৳ {Number(r.grossProfit).toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Paddy Variety</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Net Paddy KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Total Purchase Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / Mon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Projected Milled Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Projected Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.invoiceNumber}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" fontWeight={600} noWrap title={r.supplier}>{r.supplier}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.paddyItem}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{Number(r.netPaddyKg).toLocaleString()} KG</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.totalPurchaseCost).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerKg).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerMon).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.costPerTon).toFixed(0)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.projectedRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Brand</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Variety</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Unit Cost / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Unit Cost / Mon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Unit Cost / Ton</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Sales Rate / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Profit / KG</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Gross Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}><Typography variant="body2" fontWeight={600} noWrap title={`${r.name} (${r.code})`}>{r.name} ({r.code})</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.brand}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.variety}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.unitCostKg).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.unitCostMon).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.unitCostTon).toFixed(0)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.salesRatePerKg).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.grossProfitKg).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Code</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Total Sales Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Estimated COGS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}><Typography variant="body2" fontWeight={600} noWrap title={r.name}>{r.name}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.code}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.totalRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.estimatedCost).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.grossProfit).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
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
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Factory Name</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Code</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Batches Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Total Revenue</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Total Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Gross Profit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Margin %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}><Typography variant="body2" fontWeight={600} noWrap title={r.name}>{r.name}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.code}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.batchCount}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.totalRevenue).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.totalCost).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>৳ {Number(r.grossProfit).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Chip size="small" color="success" label={`${Number(r.grossMarginPct).toFixed(1)}%`} sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Recalculate Batch Costing Dialog */}
      <FormDialog
        open={calcDialogOpen}
        onClose={() => !busy && setCalcDialogOpen(false)}
        onSubmit={handleCalculateBatch}
        title={isBn ? 'উৎপাদন ব্যাচের লাভজনকতা ও খরচ হিসাব' : 'Calculate Batch Costing & Profitability'}
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={isBn ? 'হিসাব ও সংরক্ষণ করুন' : 'Calculate & Save'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {isBn
            ? 'সূত্র: নেট চালের খরচ = ধানের খরচ + প্রসেসিং + লেবার + বিদ্যুৎ + প্যাকেজিং + পরিবহন + ওভারহেড - বাই-প্রোডাক্ট আয়'
            : 'Formula: Net Rice Cost = Paddy Cost + Processing + Labour + Electricity + Packaging + Transport + Overhead - By-product Revenue'}
        </Typography>

        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppTextField
              fieldName="calcBatchId"
              required
              label={isBn ? 'ব্যাচ আইডি' : 'Batch ID'}
              value={batchId}
              errorText={fieldErrors.calcBatchId}
              onValueChange={(val) => {
                setBatchId(val);
                setFieldErrors((p) => ({ ...p, calcBatchId: '' }));
              }}
            />
          </Box>
          <AppTextField
            fieldName="paddyRate"
            type="number"
            prefixText="৳"
            label={isBn ? 'ধানের দর / কেজি (৳)' : 'Paddy Rate / KG (৳)'}
            value={paddyRate}
            errorText={fieldErrors.paddyRate}
            inputProps={{ min: 0, step: '.01' }}
            onValueChange={(val) => {
              setPaddyRate(val);
              setFieldErrors((p) => ({ ...p, paddyRate: '' }));
            }}
          />
          <AppTextField
            fieldName="riceSalesRate"
            type="number"
            prefixText="৳"
            label={isBn ? 'প্রজেক্টেড চালের দর / কেজি' : 'Rice Sales Rate / KG (৳)'}
            value={riceSalesRate}
            errorText={fieldErrors.riceSalesRate}
            inputProps={{ min: 0, step: '.01' }}
            onValueChange={(val) => {
              setRiceSalesRate(val);
              setFieldErrors((p) => ({ ...p, riceSalesRate: '' }));
            }}
          />
          <AppTextField
            fieldName="processingCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'মেশিন প্রসেসিং খরচ' : 'Processing Cost (৳)'}
            value={processingCost}
            errorText={fieldErrors.processingCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setProcessingCost(val);
              setFieldErrors((p) => ({ ...p, processingCost: '' }));
            }}
          />
          <AppTextField
            fieldName="labourCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'শ্রমিক মজুরি (Labour)' : 'Labour Cost (৳)'}
            value={labourCost}
            errorText={fieldErrors.labourCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setLabourCost(val);
              setFieldErrors((p) => ({ ...p, labourCost: '' }));
            }}
          />
          <AppTextField
            fieldName="electricityCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'বিদ্যুৎ / পাওয়ার খরচ' : 'Electricity Cost (৳)'}
            value={electricityCost}
            errorText={fieldErrors.electricityCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setElectricityCost(val);
              setFieldErrors((p) => ({ ...p, electricityCost: '' }));
            }}
          />
          <AppTextField
            fieldName="packagingCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'প্যাকেজিং ও বস্তা খরচ' : 'Packaging Cost (৳)'}
            value={packagingCost}
            errorText={fieldErrors.packagingCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setPackagingCost(val);
              setFieldErrors((p) => ({ ...p, packagingCost: '' }));
            }}
          />
          <AppTextField
            fieldName="transportCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'পরিবহন খরচ' : 'Transport Cost (৳)'}
            value={transportCost}
            errorText={fieldErrors.transportCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setTransportCost(val);
              setFieldErrors((p) => ({ ...p, transportCost: '' }));
            }}
          />
          <AppTextField
            fieldName="overheadCost"
            type="number"
            prefixText="৳"
            label={isBn ? 'কারখানা ওভারহেড' : 'Factory Overhead (৳)'}
            value={overheadCost}
            errorText={fieldErrors.overheadCost}
            inputProps={{ min: 0 }}
            onValueChange={(val) => {
              setOverheadCost(val);
              setFieldErrors((p) => ({ ...p, overheadCost: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>
    </Box>
  );
}

