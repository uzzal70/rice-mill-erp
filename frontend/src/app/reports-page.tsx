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
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppAutocomplete, AppSelect, AppTextField } from '@/components/form';
import { useToast } from '@/components/ui/toast-provider';

interface ReportsPageProps {
  companyId: string;
  factoryId?: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

interface FilterOptions {
  factories: { id: string; name: string; code: string }[];
  godowns: { id: string; name: string; code: string; factoryId: string }[];
  suppliers: { id: string; name: string; type: string }[];
  customers: { id: string; name: string; type: string }[];
  paddyItems: { id: string; name: string; code: string }[];
  riceItems: { id: string; name: string; code: string }[];
  productItems: { id: string; name: string; code: string }[];
  users: { id: string; fullName: string; email: string }[];
}

interface ReportResult {
  reportType: string;
  generatedAt: string;
  headers: string[];
  rows: any[];
  summary: {
    totalRecords: number;
    totalQuantityKg: number;
    totalAmountBDT: number;
  };
}

export function ReportsPage({
  companyId,
  factoryId: initialFactoryId,
  language,
  onSaved,
}: ReportsPageProps) {
  const isBn = language === 'bn';
  const toast = useToast();

  // Report Selection
  const [reportType, setReportType] = useState('PROCUREMENT_REGISTER');

  // 10 Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [factoryId, setFactoryId] = useState(initialFactoryId || '');
  const [godownId, setGodownId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paddyItemId, setPaddyItemId] = useState('');
  const [riceItemId, setRiceItemId] = useState('');
  const [productItemId, setProductItemId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [userId, setUserId] = useState('');

  // Fetch Dropdown Filter Options
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['report-filter-options', companyId],
    queryFn: () => apiRequest(`/reports/filters?companyId=${companyId}`),
    enabled: Boolean(companyId),
  });

  // Query Report Data
  const { data: reportData, isLoading, error, refetch } = useQuery<ReportResult>({
    queryKey: [
      'generated-report',
      companyId,
      reportType,
      startDate,
      endDate,
      factoryId,
      godownId,
      supplierId,
      customerId,
      paddyItemId,
      riceItemId,
      productItemId,
      batchNumber,
      userId,
    ],
    queryFn: () => {
      const q = new URLSearchParams({ companyId, reportType });
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      if (factoryId) q.set('factoryId', factoryId);
      if (godownId) q.set('godownId', godownId);
      if (supplierId) q.set('supplierId', supplierId);
      if (customerId) q.set('customerId', customerId);
      if (paddyItemId) q.set('paddyItemId', paddyItemId);
      if (riceItemId) q.set('riceItemId', riceItemId);
      if (productItemId) q.set('productItemId', productItemId);
      if (batchNumber) q.set('batchNumber', batchNumber);
      if (userId) q.set('userId', userId);
      return apiRequest(`/reports/generate?${q.toString()}`);
    },
    enabled: Boolean(companyId),
  });

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFactoryId(initialFactoryId || '');
    setGodownId('');
    setSupplierId('');
    setCustomerId('');
    setPaddyItemId('');
    setRiceItemId('');
    setProductItemId('');
    setBatchNumber('');
    setUserId('');
  };

  const handleExport = (format: 'CSV' | 'EXCEL' | 'PDF') => {
    if (format === 'PDF') {
      window.print();
      return;
    }
    const q = new URLSearchParams({ companyId, reportType, format });
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (factoryId) q.set('factoryId', factoryId);
    if (godownId) q.set('godownId', godownId);
    if (supplierId) q.set('supplierId', supplierId);
    if (customerId) q.set('customerId', customerId);
    if (paddyItemId) q.set('paddyItemId', paddyItemId);
    if (riceItemId) q.set('riceItemId', riceItemId);
    if (productItemId) q.set('productItemId', productItemId);
    if (batchNumber) q.set('batchNumber', batchNumber);
    if (userId) q.set('userId', userId);

    window.open(`/api/reports/export?${q.toString()}`, '_blank');
    onSaved(isBn ? `${format} ফাইল ডাউনলোড শুরু হয়েছে...` : `Downloading ${format} export...`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header (Hidden during print) */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, '@media print': { display: 'none' } }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentRoundedIcon />
            {isBn ? 'রিপোর্টিং হাব ও স্টেটমেন্ট প্রিন্ট' : 'Comprehensive Reporting Hub'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? '১০টি ফিল্টার (তারিখ, মিল, গুদাম, পার্টনার, পণ্য, ব্যাচ ও ব্যবহারকারী) ভিত্তিক রিপোর্ট তৈরি ও এক্সপোর্ট'
              : 'Multi-filter statements across 10 dimensions with PDF, Excel, and CSV export & high-definition print formatting'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintRoundedIcon />}
            onClick={() => handleExport('PDF')}
          >
            {isBn ? 'প্রিন্ট / PDF' : 'Print / PDF'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<FileDownloadRoundedIcon />}
            onClick={() => handleExport('EXCEL')}
          >
            Excel
          </Button>

          <Button
            variant="outlined"
            startIcon={<TableChartRoundedIcon />}
            onClick={() => handleExport('CSV')}
          >
            CSV
          </Button>

          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* 10 Multi-Filter Bar (Hidden during print) */}
      <Paper sx={{ p: 2.5, borderRadius: 2, '@media print': { display: 'none' } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterAltRoundedIcon color="primary" fontSize="small" />
            {isBn ? '১০টি মাল্টি-ফিল্টার ক্রাইটেরিয়া' : '10-Dimension Multi-Filter Engine'}
          </Typography>
          <Button
            size="small"
            startIcon={<RestartAltRoundedIcon />}
            onClick={resetFilters}
          >
            {isBn ? 'ফিল্টার রিসেট' : 'Reset Filters'}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {/* Report Type */}
          <Grid item xs={12} sm={6} md={3}>
            <AppSelect
              fieldName="reportType"
              label={isBn ? 'রিপোর্টের ধরন' : 'Report Type'}
              value={reportType}
              options={[
                { value: 'PROCUREMENT_REGISTER', label: 'Procurement Register' },
                { value: 'GATE_REGISTER', label: 'Gate & Weighbridge Register' },
                { value: 'PRODUCTION_REGISTER', label: 'Milling Production Register' },
                { value: 'SALES_REGISTER', label: 'Sales Order Register' },
                { value: 'STOCK_REGISTER', label: 'Stock & Inventory Balance' },
                { value: 'EXPENSE_REGISTER', label: 'Operating Expense Register' },
                { value: 'FINANCIAL_LEDGER', label: 'Financial General Ledger' },
                { value: 'PARTY_STATEMENT', label: 'Counterparty Account Statement' },
              ]}
              onChange={(val) => setReportType(val)}
            />
          </Grid>

          {/* 1. Date Range: Start Date */}
          <Grid item xs={6} sm={3} md={2}>
            <AppTextField
              fieldName="startDate"
              type="date"
              label={isBn ? 'শুরুর তারিখ' : 'Start Date'}
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onValueChange={(val) => {
                setStartDate(val);
                if (endDate && val && val > endDate) {
                  toast.warning(isBn ? 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।' : 'Start Date cannot be after End Date.');
                }
              }}
            />
          </Grid>

          {/* 1. Date Range: End Date */}
          <Grid item xs={6} sm={3} md={2}>
            <AppTextField
              fieldName="endDate"
              type="date"
              label={isBn ? 'শেষের তারিখ' : 'End Date'}
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onValueChange={(val) => {
                setEndDate(val);
                if (startDate && val && val < startDate) {
                  toast.warning(isBn ? 'শেষের তারিখ শুরুর তারিখের আগে হতে পারবে না।' : 'End Date cannot be earlier than Start Date.');
                }
              }}
            />
          </Grid>

          {/* 2. Factory */}
          <Grid item xs={12} sm={6} md={2.5}>
            <AppSelect
              fieldName="reportFactoryId"
              label={isBn ? 'কারখানা' : 'Factory'}
              value={factoryId}
              options={[
                { value: '', label: isBn ? 'সকল কারখানা' : 'All Factories' },
                ...(filterOptions?.factories || []).map((f) => ({ value: f.id, label: f.name, badge: f.code })),
              ]}
              onChange={(val) => {
                setFactoryId(val);
                if (val && godownId) {
                  const g = (filterOptions?.godowns || []).find((item) => item.id === godownId);
                  if (g && g.factoryId !== val) setGodownId('');
                }
              }}
            />
          </Grid>

          {/* 3. Godown */}
          <Grid item xs={12} sm={6} md={2.5}>
            <AppAutocomplete
              fieldName="reportGodownId"
              label={isBn ? 'গুদাম / সাইলো' : 'Godown / Silo'}
              value={godownId}
              options={(filterOptions?.godowns || [])
                .filter((g) => !factoryId || g.factoryId === factoryId)
                .map((g) => ({ value: g.id, label: g.name, badge: g.code }))}
              emptyMessage={isBn ? 'কোনো গুদাম পাওয়া যায়নি' : 'No godowns match'}
              onChange={(val) => setGodownId(val)}
            />
          </Grid>

          {/* 4. Supplier */}
          <Grid item xs={12} sm={6} md={3}>
            <AppAutocomplete
              fieldName="reportSupplierId"
              label={isBn ? 'সরবরাহকারী / কৃষক' : 'Supplier / Farmer'}
              value={supplierId}
              options={(filterOptions?.suppliers || []).map((s) => ({ value: s.id, label: s.name }))}
              emptyMessage={isBn ? 'কোনো সরবরাহকারী নেই' : 'No suppliers found'}
              onChange={(val) => setSupplierId(val)}
            />
          </Grid>

          {/* 5. Customer */}
          <Grid item xs={12} sm={6} md={3}>
            <AppAutocomplete
              fieldName="reportCustomerId"
              label={isBn ? 'ক্রেতা' : 'Customer'}
              value={customerId}
              options={(filterOptions?.customers || []).map((c) => ({ value: c.id, label: c.name }))}
              emptyMessage={isBn ? 'কোনো ক্রেতা নেই' : 'No customers found'}
              onChange={(val) => setCustomerId(val)}
            />
          </Grid>

          {/* 6. Paddy Variety */}
          <Grid item xs={12} sm={6} md={2}>
            <AppAutocomplete
              fieldName="reportPaddyItemId"
              label={isBn ? 'ধানের জাত' : 'Paddy Variety'}
              value={paddyItemId}
              options={(filterOptions?.paddyItems || []).map((i) => ({ value: i.id, label: i.name, badge: i.code }))}
              onChange={(val) => setPaddyItemId(val)}
            />
          </Grid>

          {/* 7. Rice Variety */}
          <Grid item xs={12} sm={6} md={2}>
            <AppAutocomplete
              fieldName="reportRiceItemId"
              label={isBn ? 'চালের ধরন' : 'Rice Product'}
              value={riceItemId}
              options={(filterOptions?.riceItems || []).map((i) => ({ value: i.id, label: i.name, badge: i.code }))}
              onChange={(val) => setRiceItemId(val)}
            />
          </Grid>

          {/* 8. Product / Byproduct */}
          <Grid item xs={12} sm={6} md={2}>
            <AppAutocomplete
              fieldName="reportProductItemId"
              label={isBn ? 'উপজাত পণ্য' : 'By-Product'}
              value={productItemId}
              options={(filterOptions?.productItems || []).map((i) => ({ value: i.id, label: i.name, badge: i.code }))}
              onChange={(val) => setProductItemId(val)}
            />
          </Grid>

          {/* 9. Batch */}
          <Grid item xs={12} sm={6} md={2}>
            <AppTextField
              fieldName="reportBatchNumber"
              label={isBn ? 'ব্যাচ নম্বর' : 'Batch Number'}
              value={batchNumber}
              onValueChange={(val) => setBatchNumber(val)}
              placeholder="e.g. PB-2026"
            />
          </Grid>

          {/* 10. User */}
          <Grid item xs={12} sm={6} md={2}>
            <AppAutocomplete
              fieldName="reportUserId"
              label={isBn ? 'ব্যবহারকারী' : 'Created By'}
              value={userId}
              options={(filterOptions?.users || []).map((u) => ({ value: u.id, label: u.fullName }))}
              onChange={(val) => setUserId(val)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Summary KPI Cards (Hidden during print) */}
      <Grid container spacing={2} sx={{ '@media print': { display: 'none' } }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {isBn ? 'মোট রেকর্ড সংখ্যা' : 'FILTERED RECORDS'}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {reportData?.summary.totalRecords || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #ed6c02' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {isBn ? 'মোট পরিমাণ (KG)' : 'TOTAL QUANTITY (KG)'}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                {(reportData?.summary.totalQuantityKg || 0).toLocaleString('en-IN')} KG
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {isBn ? 'মোট আর্থিক মূল্য (BDT)' : 'TOTAL AMOUNT (BDT)'}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                ৳ {(reportData?.summary.totalAmountBDT || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error">
          {isBn ? 'রিপোর্ট তৈরি করতে ব্যর্থ হয়েছে।' : 'Failed to generate report.'}
        </Alert>
      )}

      {isLoading && <LinearProgress />}

      {/* Printable Report Paper Layout */}
      <Paper
        id="printable-report"
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
          '@media print': {
            boxShadow: 'none',
            p: 1,
            m: 0,
          },
        }}
      >
        {/* Printable Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">
            RICE MILL ENTERPRISE ERP
          </Typography>
          <Typography variant="h6" fontWeight={700} color="primary.main" textTransform="uppercase">
            {reportType.replace(/_/g, ' ')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isBn ? `রিপোর্ট তৈরির সময়: ${new Date().toLocaleString()}` : `Generated at: ${new Date().toLocaleString()}`}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Report Table */}
        <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: Math.max(750, (reportData?.headers?.length || 5) * 130) }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {(reportData?.headers || []).map((h, idx) => {
                  const sampleVal = reportData?.rows?.[0] ? Object.values(reportData.rows[0])[idx] : undefined;
                  const isNum = typeof sampleVal === 'number' || /bdt|kg|amount|rate|qty|total|debit|credit|balance|টাকা|ওজন|পরিমাণ|মূল্য|ব্যালেন্স/i.test(h);
                  return (
                    <TableCell
                      key={idx}
                      align={isNum ? 'right' : 'left'}
                      sx={{ fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {(reportData?.rows || []).map((row, rIdx) => (
                <TableRow key={rIdx} hover>
                  {Object.values(row).map((val: any, cIdx) => {
                    const isNum = typeof val === 'number';
                    return (
                      <TableCell
                        key={cIdx}
                        align={isNum ? 'right' : 'left'}
                        sx={{
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          ...(isNum ? { fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' } : { maxWidth: 260, textOverflow: 'ellipsis', overflow: 'hidden' }),
                        }}
                        title={String(val ?? '')}
                      >
                        {isNum
                          ? val.toLocaleString('en-IN')
                          : String(val ?? '—')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {(!reportData?.rows || reportData.rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={reportData?.headers.length || 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'নির্বাচিত ফিল্টারের ভিত্তিতে কোনো রেকর্ড পাওয়া যায়নি।' : 'No records match the specified filter criteria.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Printable Totals & Signatures */}
        <Box sx={{ mt: 4, pt: 2, borderTop: '2px solid #cfd8dc' }}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight={700}>
                {isBn ? `মোট এন্ট্রি: ${reportData?.summary.totalRecords || 0}` : `Total Records: ${reportData?.summary.totalRecords || 0}`}
              </Typography>
              {reportData?.summary.totalQuantityKg ? (
                <Typography variant="body2" fontWeight={700} color="warning.main">
                  {isBn ? `মোট পরিমাণ: ${reportData.summary.totalQuantityKg.toLocaleString('en-IN')} KG` : `Total Volume: ${reportData.summary.totalQuantityKg.toLocaleString('en-IN')} KG`}
                </Typography>
              ) : null}
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'right' }}>
              {reportData?.summary.totalAmountBDT ? (
                <Typography variant="h6" fontWeight={800} color="success.main">
                  {isBn ? `মোট মূল্য: ৳ ${reportData.summary.totalAmountBDT.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Total Value: ৳ ${reportData.summary.totalAmountBDT.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </Typography>
              ) : null}
            </Grid>
          </Grid>

          {/* Authorization Signatures */}
          <Grid container spacing={2} sx={{ mt: 6, pt: 2, textAlign: 'center' }}>
            <Grid item xs={4}>
              <Box sx={{ borderTop: '1px solid #90a4ae', pt: 1, mx: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {isBn ? 'প্রস্তুতকারী (Prepared By)' : 'Prepared By'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ borderTop: '1px solid #90a4ae', pt: 1, mx: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {isBn ? 'যাচাইকারী (Checked By)' : 'Checked By'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ borderTop: '1px solid #90a4ae', pt: 1, mx: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {isBn ? 'অনুমোদনকারী (Authorized Signature)' : 'Authorized Signature'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}

