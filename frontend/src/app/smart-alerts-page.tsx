'use client';

import React, { useState } from 'react';
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface SmartAlertsPageProps {
  companyId: string;
  factoryId?: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

interface SmartAlertItem {
  id: string;
  type: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  metricValue?: string;
  thresholdValue?: string;
  isDismissed: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

interface AlertsResponse {
  alerts: SmartAlertItem[];
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    totalUnresolved: number;
  };
}

interface AlertRuleItem {
  id: string;
  type: string;
  isEnabled: boolean;
  severity: string;
  thresholdValue: string;
  description?: string;
}

export function SmartAlertsPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: SmartAlertsPageProps) {
  const isBn = language === 'bn';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showDismissed, setShowDismissed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Rule configuration form state
  const [ruleType, setRuleType] = useState('LOW_STOCK');
  const [ruleThreshold, setRuleThreshold] = useState('5000');
  const [ruleSeverity, setRuleSeverity] = useState('WARNING');
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Query alerts
  const { data, isLoading, error, refetch } = useQuery<AlertsResponse>({
    queryKey: ['smart-alerts', companyId, factoryId, categoryFilter, severityFilter, showDismissed],
    queryFn: () => {
      const q = new URLSearchParams({ companyId });
      if (factoryId) q.set('factoryId', factoryId);
      if (categoryFilter !== 'ALL') q.set('category', categoryFilter);
      if (severityFilter !== 'ALL') q.set('severity', severityFilter);
      if (showDismissed) q.set('isDismissed', 'true');
      return apiRequest(`/alerts?${q.toString()}`);
    },
    enabled: Boolean(companyId),
    refetchInterval: 15000,
  });

  // Query rules
  const { data: rules, refetch: refetchRules } = useQuery<AlertRuleItem[]>({
    queryKey: ['alert-rules', companyId],
    queryFn: () => apiRequest(`/alerts/rules?companyId=${companyId}`),
    enabled: Boolean(companyId) && rulesOpen,
  });

  // Diagnostic Scan Mutation
  const scanMutation = useMutation({
    mutationFn: () =>
      apiRequest('/alerts/scan', {
        method: 'POST',
        body: JSON.stringify({ companyId, factoryId }),
      }),
    onSuccess: (res: any) => {
      onSaved(res.message || (isBn ? 'ডায়াগনস্টিক স্ক্যান সফল হয়েছে।' : 'Diagnostic scan complete.'));
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
    },
    onError: (err: unknown) => toast.error(extractApiError(err, 'Diagnostic scan failed.')),
  });

  // Dismiss Mutation
  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({ companyId, reason: 'Dismissed by user' }),
      }),
    onSuccess: () => {
      onSaved(isBn ? 'সতর্কবার্তা বাতিল করা হয়েছে।' : 'Alert dismissed.');
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
    },
    onError: (err: unknown) => toast.error(extractApiError(err, 'Could not dismiss alert.')),
  });

  // Acknowledge Mutation
  const ackMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      }),
    onSuccess: () => {
      onSaved(isBn ? 'সতর্কবার্তা প্রাপ্তিস্বীকার করা হয়েছে।' : 'Alert acknowledged.');
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
    },
    onError: (err: unknown) => toast.error(extractApiError(err, 'Could not acknowledge alert.')),
  });

  // Rule Update Mutation
  const updateRuleMutation = useMutation({
    mutationFn: () =>
      apiRequest('/alerts/rules', {
        method: 'PUT',
        body: JSON.stringify({
          companyId,
          type: ruleType,
          thresholdValue: Number(ruleThreshold),
          severity: ruleSeverity,
        }),
      }),
    onSuccess: () => {
      setRuleError(null);
      setFieldErrors({});
      setRulesOpen(false);
      onSaved(isBn ? 'সতর্কতার নিয়ম হালনাগাদ করা হয়েছে।' : 'Alert rule threshold updated.');
      refetchRules();
    },
    onError: (err: unknown) => {
      const msg = extractApiError(err, 'Failed to update alert rule.');
      setRuleError(msg);
      toast.error(msg);
    },
  });

  const handleSaveRule = (e?: React.FormEvent) => {
    e?.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'ruleType', label: isBn ? 'এলার্টের ধরন' : 'Alert Type', value: ruleType, required: true, isSelect: true },
        { name: 'ruleThreshold', label: isBn ? 'থ্রেশহোল্ড মান' : 'Threshold Value', value: ruleThreshold, required: true, type: 'number' },
        { name: 'ruleSeverity', label: isBn ? 'ডিফল্ট তীব্রতা' : 'Default Severity', value: ruleSeverity, required: true, isSelect: true },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setRuleError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setRuleError(null);
    setFieldErrors({});
    updateRuleMutation.mutate();
  };

  const getSeverityChip = (sev: string) => {
    if (sev === 'CRITICAL') {
      return (
        <Chip
          icon={<ErrorOutlineRoundedIcon />}
          label={isBn ? 'জরুরি (Critical)' : 'CRITICAL'}
          color="error"
          size="small"
          sx={{ fontWeight: 700 }}
        />
      );
    }
    if (sev === 'WARNING') {
      return (
        <Chip
          icon={<WarningAmberRoundedIcon />}
          label={isBn ? 'সতর্কতা (Warning)' : 'WARNING'}
          color="warning"
          size="small"
          sx={{ fontWeight: 700 }}
        />
      );
    }
    return (
      <Chip
        icon={<InfoOutlinedIcon />}
        label={isBn ? 'তথ্য (Info)' : 'INFO'}
        color="info"
        size="small"
        sx={{ fontWeight: 700 }}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveRoundedIcon />
            {isBn ? 'স্মার্ট অটোমেটিক এলার্ট ও মনিটরিং' : 'Smart Automated Alerts & Monitoring'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'কম মজুদ, উচ্চ আর্দ্রতা, কম রিকভারি, বকেয়া পাওনা ও ওজনের অসঙ্গতির স্বয়ংক্রিয় এলার্ট'
              : 'Automated detection of low stock, high moisture, low recovery, overdues, machine issues, and anomalies'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayCircleOutlineRoundedIcon />}
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
          >
            {isBn ? 'ডায়াগনস্টিক স্ক্যান চালান' : 'Run Diagnostic Scan'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<TuneRoundedIcon />}
            onClick={() => setRulesOpen(true)}
          >
            {isBn ? 'নিয়ম ও থ্রেশহোল্ড' : 'Configure Rules'}
          </Button>

          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error">
          {isBn ? 'এলার্ট তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load smart alerts.'}
        </Alert>
      )}

      {isLoading && <LinearProgress />}

      {/* Severity Counters Grid */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ffebee', borderLeft: '5px solid #d32f2f' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="error.dark" fontWeight={700}>
                {isBn ? 'জরুরি এলার্ট (CRITICAL)' : 'CRITICAL ALERTS'}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="error.main">
                {data?.summary.criticalCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff8e1', borderLeft: '5px solid #ffa000' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="warning.dark" fontWeight={700}>
                {isBn ? 'সতর্কতা (WARNING)' : 'WARNING ALERTS'}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main">
                {data?.summary.warningCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '5px solid #1976d2' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="primary.dark" fontWeight={700}>
                {isBn ? 'সাধারণ বিজ্ঞপ্তি (INFO)' : 'INFORMATIONAL'}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {data?.summary.infoCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f5f5f5', borderLeft: '5px solid #757575' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {isBn ? 'মোট অনিষ্পন্ন সমস্যা' : 'TOTAL UNRESOLVED'}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                {data?.summary.totalUnresolved || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {['ALL', 'INVENTORY', 'QUALITY', 'OPERATIONS', 'FINANCE', 'MAINTENANCE', 'COMPLIANCE'].map(cat => (
              <Chip
                key={cat}
                label={cat}
                clickable
                color={categoryFilter === cat ? 'primary' : 'default'}
                onClick={() => setCategoryFilter(cat)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <AppSelect
              fieldName="severityFilter"
              fullWidth={false}
              label={isBn ? 'তীব্রতা' : 'Severity'}
              value={severityFilter}
              options={[
                { value: 'ALL', label: isBn ? 'সকল' : 'All' },
                { value: 'CRITICAL', label: isBn ? 'জরুরি' : 'Critical' },
                { value: 'WARNING', label: isBn ? 'সতর্কতা' : 'Warning' },
                { value: 'INFO', label: isBn ? 'তথ্য' : 'Info' },
              ]}
              onChange={(val) => setSeverityFilter(val)}
              sx={{ minWidth: 140 }}
            />

            <Button
              variant={showDismissed ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowDismissed(!showDismissed)}
            >
              {showDismissed ? (isBn ? 'চলমান দেখুন' : 'Show Active') : (isBn ? 'বাতিলকৃত দেখুন' : 'Show Dismissed')}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Alerts Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'তীব্রতা' : 'Severity'}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'বিভাগ ও ধরন' : 'Category / Type'}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'শিরোনাম ও বিবরণ' : 'Title & Description'}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'পরিমাপ ও থ্রেশহোল্ড' : 'Metric / Threshold'}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'সময়' : 'Recorded At'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{isBn ? 'পদক্ষেপ' : 'Actions'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data?.alerts || []).map(alert => (
              <TableRow key={alert.id} hover sx={{ opacity: alert.isDismissed ? 0.6 : 1 }}>
                <TableCell>{getSeverityChip(alert.severity)}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {alert.category}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.type}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 380 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {alert.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {alert.message}
                  </Typography>
                </TableCell>
                <TableCell>
                  {alert.metricValue ? (
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {Number(alert.metricValue).toLocaleString('en-IN')}
                      </Typography>
                      {alert.thresholdValue && (
                        <Typography variant="caption" color="text.secondary">
                          {isBn ? `সীমা: ${Number(alert.thresholdValue).toLocaleString('en-IN')}` : `Limit: ${Number(alert.thresholdValue).toLocaleString('en-IN')}`}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {!alert.isDismissed && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {!alert.acknowledgedAt && (
                        <Tooltip title={isBn ? 'স্বীকার করুন' : 'Acknowledge'}>
                          <IconButton
                            color="info"
                            size="small"
                            onClick={() => ackMutation.mutate(alert.id)}
                            disabled={ackMutation.isPending}
                          >
                            <DoneRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={isBn ? 'বাতিল করুন' : 'Dismiss'}>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => dismissMutation.mutate(alert.id)}
                          disabled={dismissMutation.isPending}
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                  {alert.isDismissed && (
                    <Chip size="small" label={isBn ? 'নিষ্পন্ন' : 'Dismissed'} variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            ))}

            {(!data?.alerts || data.alerts.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  <CheckCircleRoundedIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6" fontWeight={700}>
                    {isBn ? 'কোনো সক্রিয় সতর্কবার্তা নেই' : 'All Clear — No Active Alerts'}
                  </Typography>
                  <Typography variant="body2">
                    {isBn
                      ? 'মিলের উৎপাদন, মান ও আর্থিক সূচকসমূহ স্বাভাবিক সীমার মধ্যে রয়েছে।'
                      : 'Mill operations, inventory levels, and financial parameters are currently within normal thresholds.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Rules Dialog */}
      <FormDialog
        open={rulesOpen}
        onClose={() => !updateRuleMutation.isPending && setRulesOpen(false)}
        onSubmit={handleSaveRule}
        title={isBn ? 'স্মার্ট এলার্ট নিয়ম ও থ্রেশহোল্ড কনফিগারেশন' : 'Configure Alert Rules & Thresholds'}
        error={ruleError}
        onClearError={() => setRuleError(null)}
        loading={updateRuleMutation.isPending}
        submitLabel={isBn ? 'সংরক্ষণ করুন' : 'Save Rule'}
        cancelLabel={isBn ? 'বন্ধ করুন' : 'Close'}
        maxWidth="sm"
      >
        <FormGrid columns={1}>
          <AppSelect
            fieldName="ruleType"
            required
            label={isBn ? 'এলার্টের ধরন' : 'Alert Type'}
            value={ruleType}
            errorText={fieldErrors.ruleType}
            options={[
              { value: 'LOW_STOCK', label: 'Low Stock (Safety KG Threshold)' },
              { value: 'HIGH_MOISTURE', label: 'High Moisture (% Upper Limit)' },
              { value: 'LOW_RECOVERY', label: 'Low Recovery (% Minimum Ratio)' },
              { value: 'CUSTOMER_OVERDUE', label: 'Customer Overdue (Days/Amount)' },
              { value: 'SUPPLIER_PAYMENT_DUE', label: 'Supplier Due (Payables Threshold)' },
              { value: 'UNUSUAL_WEIGHT', label: 'Unusual Weighbridge Weight (KG)' },
              { value: 'UNUSUAL_PRODUCTION_LOSS', label: 'Unusual Production Loss (%)' },
              { value: 'NEGATIVE_MARGIN', label: 'Negative Margin (Minimum Rate ৳)' },
              { value: 'SLOW_MOVING_STOCK', label: 'Slow Moving Stock (Days Idle)' },
            ]}
            onChange={(val) => {
              setRuleType(val);
              setFieldErrors((p) => ({ ...p, ruleType: '' }));
            }}
          />

          <AppTextField
            fieldName="ruleThreshold"
            required
            type="number"
            label={isBn ? 'থ্রেশহোল্ড মান' : 'Threshold Value'}
            value={ruleThreshold}
            errorText={fieldErrors.ruleThreshold}
            onValueChange={(val) => {
              setRuleThreshold(val);
              setFieldErrors((p) => ({ ...p, ruleThreshold: '' }));
            }}
            helperText={isBn ? 'এই মানের নিচে বা উপরে গেলে স্বয়ংক্রিয় এলার্ট সৃষ্টি হবে' : 'Alert triggers when operational metric crosses this threshold'}
          />

          <AppSelect
            fieldName="ruleSeverity"
            required
            label={isBn ? 'ডিফল্ট তীব্রতা' : 'Default Severity'}
            value={ruleSeverity}
            errorText={fieldErrors.ruleSeverity}
            options={[
              { value: 'CRITICAL', label: 'CRITICAL' },
              { value: 'WARNING', label: 'WARNING' },
              { value: 'INFO', label: 'INFO' },
            ]}
            onChange={(val) => {
              setRuleSeverity(val);
              setFieldErrors((p) => ({ ...p, ruleSeverity: '' }));
            }}
          />
        </FormGrid>
      </FormDialog>
    </Box>
  );
}

