'use client';

import React, { useState } from 'react';
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
  Typography,
} from '@mui/material';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppSelect, AppTextField, FormDialog, FormGrid } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface AiReadyPageProps {
  companyId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

interface AiDomainOverview {
  domain: string;
  title: string;
  description: string;
  featureFields: string[];
  status: 'MODEL_ACTIVE' | 'DATA_PIPELINE_READY';
  activeModel: {
    id: string;
    name: string;
    version: string;
    framework: string;
    deployedAt?: string;
    metrics?: any;
  } | null;
  datasetSnapshotCount: number;
}

interface RegisteredModelItem {
  id: string;
  domain: string;
  modelName: string;
  version: string;
  framework: string;
  status: string;
  endpointUrl?: string;
  artifactUri?: string;
  isActive: boolean;
  deployedAt?: string;
  createdAt: string;
}

export function AiReadyPage({ companyId, language, onSaved }: AiReadyPageProps) {
  const isBn = language === 'bn';
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0); // 0: Domains & Feature Pipelines, 1: Model Registry, 2: Inference Sandbox
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Model Form State
  const [mDomain, setMDomain] = useState('DEMAND_FORECASTING');
  const [mName, setMName] = useState('');
  const [mVersion, setMVersion] = useState('1.0');
  const [mFramework, setMFramework] = useState('ONNX');
  const [mEndpoint, setMEndpoint] = useState('');
  const [mArtifact, setMArtifact] = useState('');
  const [mIsActive, setMIsActive] = useState(true);

  // Sandbox State
  const [sbDomain, setSbDomain] = useState('DEMAND_FORECASTING');
  const [sbPayload, setSbPayload] = useState('{\n  "weekOfYear": 42,\n  "itemCategory": "RICE",\n  "averagePriceBDT": 65.5\n}');
  const [sbResult, setSbResult] = useState<any>(null);

  // Fetch Domain Overview
  const { data: overview, isLoading, error, refetch } = useQuery<{ domains: AiDomainOverview[] }>({
    queryKey: ['ai-domain-overview', companyId],
    queryFn: () => apiRequest(`/ai-ready/overview?companyId=${companyId}`),
    enabled: Boolean(companyId),
  });

  // Fetch Registered Models
  const { data: models, refetch: refetchModels } = useQuery<RegisteredModelItem[]>({
    queryKey: ['ai-registered-models', companyId],
    queryFn: () => apiRequest(`/ai-ready/models?companyId=${companyId}`),
    enabled: Boolean(companyId) && activeTab === 1,
  });

  // Extract Dataset Mutation
  const extractMutation = useMutation({
    mutationFn: (domain: string) =>
      apiRequest('/ai-ready/extract', {
        method: 'POST',
        body: JSON.stringify({ companyId, domain, days: 90 }),
      }),
    onSuccess: (res: any) => {
      setInspectResult(res);
      setInspectOpen(true);
      onSaved(isBn ? 'ফিচার ডেটাসেট সফলভাবে এক্সট্র্যাক্ট করা হয়েছে।' : 'Feature dataset extracted.');
      queryClient.invalidateQueries({ queryKey: ['ai-domain-overview'] });
    },
    onError: (err: unknown) => toast.error(extractApiError(err, 'Dataset extraction failed.')),
  });

  // Register Model Mutation
  const registerMutation = useMutation({
    mutationFn: () =>
      apiRequest('/ai-ready/models', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          domain: mDomain,
          modelName: mName.trim(),
          version: mVersion.trim(),
          framework: mFramework,
          endpointUrl: mEndpoint.trim() || undefined,
          artifactUri: mArtifact.trim() || undefined,
          isActive: mIsActive,
        }),
      }),
    onSuccess: () => {
      setRegError(null);
      setFieldErrors({});
      setMName('');
      onSaved(isBn ? 'মডেল সফলভাবে রেজিস্টার করা হয়েছে।' : 'Model registered successfully.');
      setRegisterOpen(false);
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ['ai-domain-overview'] });
    },
    onError: (err: unknown) => {
      const msg = extractApiError(err, 'Failed to register model.');
      setRegError(msg);
      toast.error(msg);
    },
  });

  const handleOpenRegister = () => {
    setRegError(null);
    setFieldErrors({});
    setRegisterOpen(true);
  };

  const handleRegisterModel = (e?: React.FormEvent) => {
    e?.preventDefault();
    const validation = validateFormFields(
      [
        { name: 'mDomain', label: isBn ? 'ডোমেইন' : 'Domain', value: mDomain, required: true, isSelect: true },
        { name: 'mName', label: isBn ? 'মডেলের নাম' : 'Model Name', value: mName, required: true },
        { name: 'mVersion', label: isBn ? 'সংস্করণ' : 'Version', value: mVersion, required: true },
        { name: 'mFramework', label: isBn ? 'ফ্রেমওয়ার্ক' : 'Framework', value: mFramework, required: true, isSelect: true },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setRegError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }
    setRegError(null);
    setFieldErrors({});
    registerMutation.mutate();
  };

  // Predict Mutation
  const predictMutation = useMutation({
    mutationFn: () => {
      let parsed = {};
      try {
        parsed = JSON.parse(sbPayload);
      } catch {
        throw new Error(isBn ? 'ইনপুট JSON সঠিক নয়।' : 'Invalid JSON input.');
      }
      return apiRequest('/ai-ready/predict', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          domain: sbDomain,
          inputFeatures: parsed,
        }),
      });
    },
    onSuccess: (res: any) => {
      setSbResult(res);
    },
    onError: (err: unknown) => {
      const msg = extractApiError(err, 'Inference execution failed.');
      setSbResult({ error: msg });
      toast.error(msg);
    },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyRoundedIcon />
            {isBn ? 'এআই-রেডি আর্কিটেকচার ও ফিচার স্টোর' : 'AI-Ready Architecture & Feature Store'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'বাস্তব ইআরপি ডেটা পাইপলাইন, মেশিন লার্নিং ফিচার ভেক্টর এবং মডেল রেজিস্ট্রি (নো ফেইক এআই স্ট্যান্ডার্ড)'
              : 'Enterprise ML data pipelines, normalized feature vectors, and model registry contract (strictly real AI only)'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={handleOpenRegister}
          >
            {isBn ? 'মডেল রেজিস্টার করুন' : 'Register ML Model'}
          </Button>
          <IconButton onClick={() => refetch()} disabled={isLoading}>
            <RefreshRoundedIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ p: 1, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} indicatorColor="primary" textColor="primary">
          <Tab icon={<StorageRoundedIcon />} iconPosition="start" label={isBn ? '৯টি ফিচার ডোমেইন ও ডেটা পাইপলাইন' : '9 Feature Domains & Pipelines'} />
          <Tab icon={<HubRoundedIcon />} iconPosition="start" label={isBn ? 'মডেল রেজিস্ট্রি' : 'Model Registry'} />
          <Tab icon={<CodeRoundedIcon />} iconPosition="start" label={isBn ? 'ইনফারেন্স স্যান্ডবক্স ও টেস্ট' : 'Inference Sandbox'} />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error">
          {isBn ? 'এআই ডোমেইন তথ্য লোড করতে ব্যর্থ হয়েছে।' : 'Failed to load AI domains.'}
        </Alert>
      )}

      {isLoading && <LinearProgress />}

      {/* Tab 0: 9 Feature Domains Grid */}
      {activeTab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            {isBn
              ? 'নীতিমালা অনুযায়ী: সিস্টেমে কোনো কৃত্রিম বা ফেক এআই নেই। এখানে প্রতিটি ডোমেইনের জন্য লাইভ ইআরপি ডেটাসেট তৈরি রয়েছে, যা অন-প্রেমিস বা ক্লাউড এমএল মডেলের সাথে সরাসরি সংযুক্ত করা যায়।'
              : 'Strict Enterprise Standard: No synthetic fake AI is generated. Live ERP operational records are extracted into production-ready feature vectors for real ML models.'}
          </Alert>

          <Grid container spacing={2.5}>
            {(overview?.domains || []).map(dom => (
              <Grid item xs={12} md={6} lg={4} key={dom.domain}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        {dom.title}
                      </Typography>
                      {dom.status === 'MODEL_ACTIVE' ? (
                        <Chip
                          icon={<CheckCircleOutlineRoundedIcon />}
                          label={isBn ? 'মডেল সক্রিয়' : 'Model Active'}
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<WarningAmberRoundedIcon />}
                          label={isBn ? 'পাইপলাইন প্রস্তুত' : 'Pipeline Ready'}
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {dom.description}
                    </Typography>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                      {isBn ? 'ফিচার ভেক্টর স্কিমা:' : 'Feature Schema:'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {dom.featureFields.map(f => (
                        <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                      ))}
                    </Box>

                    {dom.activeModel && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1.5 }}>
                        <Typography variant="caption" fontWeight={700}>
                          {isBn ? `সক্রিয় মডেল: ${dom.activeModel.name} (v${dom.activeModel.version})` : `Active Model: ${dom.activeModel.name} (v${dom.activeModel.version})`}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {`Framework: ${dom.activeModel.framework}`}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CloudDownloadRoundedIcon />}
                      onClick={() => extractMutation.mutate(dom.domain)}
                      disabled={extractMutation.isPending}
                    >
                      {isBn ? 'ফিচার ডেটাসেট এক্সট্র্যাক্ট করুন' : 'Extract Feature Dataset'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Model Registry Table */}
      {activeTab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'ডোমেইন' : 'Domain'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'মডেল নাম ও সংস্করণ' : 'Model & Version'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'ফ্রেমওয়ার্ক' : 'Framework'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'এন্ডপয়েন্ট / ইউআরআই' : 'Endpoint / Artifact'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isBn ? 'তারিখ' : 'Registered At'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(models || []).map(m => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{m.domain}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {m.modelName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      v{m.version}
                    </Typography>
                  </TableCell>
                  <TableCell>{m.framework}</TableCell>
                  <TableCell>
                    {m.isActive ? (
                      <Chip label="ACTIVE" color="success" size="small" />
                    ) : (
                      <Chip label={m.status} size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, wordBreak: 'break-all' }}>
                    <Typography variant="caption">
                      {m.endpointUrl || m.artifactUri || 'Local Model Contract'}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}

              {(!models || models.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn
                      ? 'কোনো মডেল এখনো রেজিস্টার করা হয়নি। উপরের "মডেল রেজিস্টার করুন" বাটনে ক্লিক করুন।'
                      : 'No ML models registered yet. Click "Register ML Model" above to connect your ONNX / PyTorch models.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Inference Sandbox */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {isBn ? 'ইনফারেন্স টেস্ট পে-লোড' : 'Inference Request Payload'}
              </Typography>

              <Stack spacing={2.5}>
                <AppSelect
                  fieldName="sbDomain"
                  label={isBn ? 'টার্গেট ডোমেইন' : 'Target Domain'}
                  value={sbDomain}
                  options={[
                    { value: 'DEMAND_FORECASTING', label: 'Demand Forecasting' },
                    { value: 'RICE_PRICE_PREDICTION', label: 'Rice Price Prediction' },
                    { value: 'PADDY_PRICE_PREDICTION', label: 'Paddy Price Prediction' },
                    { value: 'PRODUCTION_FORECAST', label: 'Production Forecast' },
                    { value: 'PROFIT_FORECAST', label: 'Profit Forecast' },
                    { value: 'SUPPLIER_QUALITY_SCORE', label: 'Supplier Quality Score' },
                    { value: 'CUSTOMER_RISK_SCORE', label: 'Customer Risk Score' },
                    { value: 'ANOMALY_DETECTION', label: 'Anomaly Detection' },
                    { value: 'STOCK_PREDICTION', label: 'Stock Prediction' },
                  ]}
                  onChange={(val) => setSbDomain(val)}
                />

                <AppTextField
                  fieldName="sbPayload"
                  multiline
                  rows={8}
                  label={isBn ? 'ইনপুট ফিচার JSON' : 'Input Features JSON'}
                  value={sbPayload}
                  onValueChange={(val) => setSbPayload(val)}
                  sx={{ fontFamily: 'monospace' }}
                />

                <Button
                  variant="contained"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={() => predictMutation.mutate()}
                  disabled={predictMutation.isPending}
                >
                  {isBn ? 'ইনফারেন্স চালান (Execute Inference)' : 'Execute Inference'}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%', bgcolor: '#fafafa' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                {isBn ? 'মডেল রেসপন্স / স্ট্যাটাস' : 'Model Response / Evaluation'}
              </Typography>

              {predictMutation.isPending && <LinearProgress sx={{ my: 2 }} />}

              {sbResult ? (
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    bgcolor: '#263238',
                    color: '#80cbc4',
                    borderRadius: 1.5,
                    overflowX: 'auto',
                    fontSize: 13,
                  }}
                >
                  {JSON.stringify(sbResult, null, 2)}
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">
                    {isBn
                      ? 'বাম পাশের ইনপুট দিয়ে ইনফারেন্স রান করুন। সক্রিয় মডেল না থাকলে সিস্টেম স্পষ্ট রিপোর্ট করবে।'
                      : 'Run inference to inspect the real model response or pipeline status contract.'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Model Register Dialog */}
      <FormDialog
        open={registerOpen}
        onClose={() => !registerMutation.isPending && setRegisterOpen(false)}
        onSubmit={handleRegisterModel}
        title={isBn ? 'নতুন এআই/এমএল মডেল রেজিস্টার করুন' : 'Register New AI/ML Model'}
        error={regError}
        onClearError={() => setRegError(null)}
        loading={registerMutation.isPending}
        submitLabel={isBn ? 'রেজিস্টার করুন' : 'Register Model'}
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={1}>
          <AppSelect
            fieldName="mDomain"
            required
            label={isBn ? 'ডোমেইন' : 'Domain'}
            value={mDomain}
            errorText={fieldErrors.mDomain}
            options={[
              { value: 'DEMAND_FORECASTING', label: 'Demand Forecasting' },
              { value: 'RICE_PRICE_PREDICTION', label: 'Rice Price Prediction' },
              { value: 'PADDY_PRICE_PREDICTION', label: 'Paddy Price Prediction' },
              { value: 'PRODUCTION_FORECAST', label: 'Production Forecast' },
              { value: 'PROFIT_FORECAST', label: 'Profit Forecast' },
              { value: 'SUPPLIER_QUALITY_SCORE', label: 'Supplier Quality Score' },
              { value: 'CUSTOMER_RISK_SCORE', label: 'Customer Risk Score' },
              { value: 'ANOMALY_DETECTION', label: 'Anomaly Detection' },
              { value: 'STOCK_PREDICTION', label: 'Stock Prediction' },
            ]}
            onChange={(val) => {
              setMDomain(val);
              setFieldErrors((p) => ({ ...p, mDomain: '' }));
            }}
          />

          <AppTextField
            fieldName="mName"
            required
            label={isBn ? 'মডেলের নাম' : 'Model Name'}
            value={mName}
            errorText={fieldErrors.mName}
            onValueChange={(val) => {
              setMName(val);
              setFieldErrors((p) => ({ ...p, mName: '' }));
            }}
            placeholder="e.g. Miniket-Demand-XGBoost"
          />

          <FormGrid columns={{ xs: 1, sm: 2 }}>
            <AppTextField
              fieldName="mVersion"
              required
              label={isBn ? 'সংস্করণ' : 'Version'}
              value={mVersion}
              errorText={fieldErrors.mVersion}
              onValueChange={(val) => {
                setMVersion(val);
                setFieldErrors((p) => ({ ...p, mVersion: '' }));
              }}
            />
            <AppSelect
              fieldName="mFramework"
              required
              label={isBn ? 'ফ্রেমওয়ার্ক' : 'Framework'}
              value={mFramework}
              errorText={fieldErrors.mFramework}
              options={[
                { value: 'ONNX', label: 'ONNX' },
                { value: 'PYTORCH', label: 'PyTorch' },
                { value: 'TENSORFLOW', label: 'TensorFlow' },
                { value: 'SCIKIT_LEARN', label: 'Scikit-Learn' },
                { value: 'EXTERNAL_API', label: 'External Microservice API' },
              ]}
              onChange={(val) => {
                setMFramework(val);
                setFieldErrors((p) => ({ ...p, mFramework: '' }));
              }}
            />
          </FormGrid>

          <AppTextField
            fieldName="mEndpoint"
            label={isBn ? 'ইনফারেন্স এন্ডপয়েন্ট ইউআরএল (ঐচ্ছিক)' : 'Inference Endpoint URL (Optional)'}
            value={mEndpoint}
            onValueChange={(val) => setMEndpoint(val)}
            placeholder="https://ai-inference.internal/v1/predict"
          />

          <AppTextField
            fieldName="mArtifact"
            label={isBn ? 'আর্টিফ্যাক্ট ইউআরআই (ঐচ্ছিক)' : 'Artifact URI (Optional)'}
            value={mArtifact}
            onValueChange={(val) => setMArtifact(val)}
            placeholder="s3://mill-models/demand_xgb_v1.onnx"
          />
        </FormGrid>
      </FormDialog>

      {/* Dataset Inspection Dialog */}
      <Dialog open={inspectOpen} onClose={() => setInspectOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {inspectResult?.datasetName || (isBn ? 'এক্সট্র্যাক্টকৃত ফিচার ডেটাসেট' : 'Extracted Feature Dataset')}
        </DialogTitle>
        <DialogContent dividers>
          {inspectResult && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {isBn
                  ? `মোট ${inspectResult.recordCount} টি সত্য ইআরপি রেকর্ড থেকে ফিচার ভেক্টর সংগ্রহ করা হয়েছে।`
                  : `Extracted ${inspectResult.recordCount} verified operational ERP records formatted as normalized feature vectors.`}
              </Typography>

              <Typography variant="subtitle2" fontWeight={700}>
                {isBn ? 'নমুনা রেকর্ডসমূহ (Sample Feature Vectors):' : 'Sample Feature Vectors:'}
              </Typography>
              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: '#263238',
                  color: '#80cbc4',
                  borderRadius: 1.5,
                  overflowX: 'auto',
                  maxHeight: 300,
                  fontSize: 12,
                }}
              >
                {JSON.stringify(inspectResult.sampleRecords, null, 2)}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInspectOpen(false)}>{isBn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

