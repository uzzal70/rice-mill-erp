'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import FolderSpecialRoundedIcon from '@mui/icons-material/FolderSpecialRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppSelect, AppTextField, FormDialog, FormGrid, FormSection } from '@/components/form';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { FieldRule, focusFieldByName, validateFormFields } from '@/lib/form-validation';

interface DocumentsPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

const CATEGORIES = [
  { key: 'ALL', labelEn: 'All Documents', labelBn: 'সকল নথিপত্র' },
  { key: 'TRADE_LICENSE', labelEn: 'Trade License', labelBn: 'ট্রেড লাইসেন্স' },
  { key: 'TIN', labelEn: 'TIN Certificate', labelBn: 'টিআইএন সার্টিফিকেট' },
  { key: 'BIN', labelEn: 'BIN / VAT Certificate', labelBn: 'বিআইএন / ভ্যাট' },
  { key: 'FACTORY_LICENSE', labelEn: 'Factory License (DIFE)', labelBn: 'কারখানা লাইসেন্স' },
  { key: 'ENVIRONMENTAL_LICENSE', labelEn: 'Environmental Permit', labelBn: 'পরিবেশ ছাড়পত্র' },
  { key: 'INSURANCE', labelEn: 'Insurance Policy', labelBn: 'বীমা পলিসি' },
  { key: 'CONTRACTS', labelEn: 'Contracts & Agreements', labelBn: 'চুক্তিপত্র' },
  { key: 'VEHICLE_DOCUMENTS', labelEn: 'Vehicle Documents', labelBn: 'যানবাহন কাগজপত্র' },
  { key: 'QUALITY_CERTIFICATES', labelEn: 'Quality & BSTI Certs', labelBn: 'কোয়ালিটি সনদ' },
  { key: 'OTHER', labelEn: 'Other Legal Records', labelBn: 'অন্যান্য নথি' },
];

export function DocumentsPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: DocumentsPageProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isBn = language === 'bn';

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form states
  const [formCategory, setFormCategory] = useState('TRADE_LICENSE');
  const [formTitle, setFormTitle] = useState('');
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formAuthority, setFormAuthority] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formReminderDays, setFormReminderDays] = useState('30');
  const [formFileName, setFormFileName] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Queries
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['documents-notifications', companyId],
    queryFn: () => apiRequest<any>(`/documents/notifications?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: documents = [], refetch: refetchDocuments } = useQuery({
    queryKey: ['documents-list', companyId, selectedCategory, searchTerm],
    queryFn: () => {
      let url = `/documents?companyId=${companyId}`;
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      return apiRequest<any[]>(url);
    },
    enabled: !!companyId,
  });

  const handleRefresh = () => {
    refetchNotifications();
    refetchDocuments();
  };

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormCategory('TRADE_LICENSE');
    setFormTitle('');
    setFormDocNumber('');
    setFormAuthority('');
    setFormIssueDate('');
    setFormExpiryDate('');
    setFormReminderDays('30');
    setFormFileName('');
    setFormFileUrl('');
    setFormRemarks('');
    setErrorMsg(null);
    setFieldErrors({});
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (doc: any) => {
    setEditingDoc(doc);
    setFormCategory(doc.category);
    setFormTitle(doc.title);
    setFormDocNumber(doc.documentNumber || '');
    setFormAuthority(doc.issuingAuthority || '');
    setFormIssueDate(doc.issueDate ? doc.issueDate.slice(0, 10) : '');
    setFormExpiryDate(doc.expiryDate ? doc.expiryDate.slice(0, 10) : '');
    setFormReminderDays(String(doc.reminderDaysBefore || 30));
    setFormFileName(doc.fileName || '');
    setFormFileUrl(doc.fileUrl || '');
    setFormRemarks(doc.remarks || '');
    setErrorMsg(null);
    setFieldErrors({});
    setCreateDialogOpen(true);
  };

  const handleSaveDocument = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rules: FieldRule[] = [
      { name: 'formCategory', label: isBn ? 'নথির ধরন' : 'Document Category', value: formCategory, required: true, isSelect: true },
      { name: 'formTitle', label: isBn ? 'নথির শিরোনাম' : 'Document Title', value: formTitle, required: true },
    ];
    if (formReminderDays.trim()) {
      rules.push({ name: 'formReminderDays', label: isBn ? 'রিমাইন্ডার দিন' : 'Reminder Days', value: formReminderDays, type: 'nonNegativeNumber' });
    }
    if (formIssueDate && formExpiryDate && formExpiryDate < formIssueDate) {
      rules.push({
        name: 'formExpiryDate',
        label: isBn ? 'মেয়াদ উত্তীর্ণের তারিখ' : 'Expiry Date',
        value: formExpiryDate,
        custom: () =>
          isBn
            ? 'মেয়াদ উত্তীর্ণের তারিখ ইস্যুর তারিখের আগে হতে পারবে না।'
            : 'Expiry Date cannot be earlier than Issue Date.',
      });
    }
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
      if (editingDoc) {
        await apiRequest(`/documents/${editingDoc.id}?companyId=${companyId}`, {
          method: 'PUT',
          body: JSON.stringify({
            category: formCategory,
            title: formTitle.trim(),
            documentNumber: formDocNumber.trim() || undefined,
            issuingAuthority: formAuthority.trim() || undefined,
            issueDate: formIssueDate || undefined,
            expiryDate: formExpiryDate || undefined,
            reminderDaysBefore: Number(formReminderDays) || 30,
            fileName: formFileName.trim() || undefined,
            fileUrl: formFileUrl.trim() || undefined,
            remarks: formRemarks.trim() || undefined,
          }),
        });
        onSaved(isBn ? 'নথিপত্র সফলভাবে আপডেট করা হয়েছে।' : 'Document updated successfully.');
      } else {
        await apiRequest(`/documents?companyId=${companyId}`, {
          method: 'POST',
          body: JSON.stringify({
            category: formCategory,
            title: formTitle.trim(),
            documentNumber: formDocNumber.trim() || undefined,
            issuingAuthority: formAuthority.trim() || undefined,
            issueDate: formIssueDate || undefined,
            expiryDate: formExpiryDate || undefined,
            reminderDaysBefore: Number(formReminderDays) || 30,
            fileName: formFileName.trim() || undefined,
            fileUrl: formFileUrl.trim() || undefined,
            remarks: formRemarks.trim() || undefined,
            factoryId: factoryId || undefined,
          }),
        });
        onSaved(isBn ? 'নতুন নথিপত্র সফলভাবে যোগ করা হয়েছে।' : 'Document registered successfully.');
      }
      setCreateDialogOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Error saving document');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিত যে এই নথিটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await apiRequest(`/documents/${id}?companyId=${companyId}`, {
        method: 'DELETE',
      });
      onSaved(isBn ? 'নথি মুছে ফেলা হয়েছে।' : 'Document deleted successfully.');
      handleRefresh();
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Error deleting document'));
    }
  };

  const getDaysLeft = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderSpecialRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'নথিপত্র ও লাইসেন্স ভল্ট (Document & Compliance Vault)' : 'Document & License Management Vault'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'ট্রেড লাইসেন্স, টিআইএন, ভ্যাট, কারখানা, পরিবেশ ও কোয়ালিটি সনদ সংরক্ষণ এবং মেয়াদ সতর্কতা'
              : 'Secure vault for Trade License, TIN, BIN, Factory, Environmental, Insurance, and Quality Certs'}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={handleRefresh}>
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={handleOpenCreate}
          >
            {isBn ? 'নতুন নথি আপলোড' : 'Upload Document'}
          </Button>
        </Stack>
      </Stack>

      {/* Expiry Alerts Banner */}
      {notifications?.alerts?.length > 0 && (
        <Alert
          severity={notifications.expiredCount > 0 ? 'error' : 'warning'}
          icon={<WarningAmberRoundedIcon />}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {isBn
              ? `নথিপত্রের মেয়াদোত্তীর্ণ / নবায়ন সতর্কতা (${notifications.alerts.length} টি নথি):`
              : `Compliance Renewal Alerts (${notifications.alerts.length} documents):`}
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {notifications.alerts.map((a: any) => (
              <Chip
                key={a.id}
                size="small"
                color={a.urgency === 'EXPIRED' ? 'error' : a.urgency === 'CRITICAL' ? 'warning' : 'default'}
                label={
                  a.urgency === 'EXPIRED'
                    ? `${a.title} (${isBn ? 'মেয়াদ শেষ হয়েছে' : 'Expired'} ${Math.abs(a.daysRemaining)} ${isBn ? 'দিন আগে' : 'days ago'})`
                    : `${a.title} (${a.daysRemaining} ${isBn ? 'দিন বাকি' : 'days left'})`
                }
              />
            ))}
          </Stack>
        </Alert>
      )}

      {/* KPI Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Card sx={{ flex: 1, borderLeft: '4px solid #1976d2' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'মোট সংরক্ষিত নথি' : 'Total Documents'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {notifications?.totalDocuments ?? 0} {isBn ? 'টি নথি' : 'Files'}
            </Typography>
            <Typography variant="caption" color="primary">
              {isBn ? 'কমপ্লায়েন্স ও আইনি রেকর্ড' : 'Enterprise compliance archive'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'বৈধ নথিপত্র' : 'Valid & Up-to-Date'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>
              {notifications?.validCount ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'নবায়ন প্রয়োজন নেই' : 'No immediate action required'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #ed6c02' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'নবায়ন আসন্ন (৩০ দিনের মধ্যে)' : 'Expiring Soon (<=30d)'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'warning.main' }}>
              {notifications?.expiringSoonCount ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'নবায়ন প্রস্তুতি গ্রহণ করুন' : 'Initiate renewal filings'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #d32f2f' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'মেয়াদোত্তীর্ণ নথিপত্র' : 'Expired Documents'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>
              {notifications?.expiredCount ?? 0}
            </Typography>
            <Typography variant="caption" color="error">
              {isBn ? 'জরুরি ভিত্তিতে নবায়ন করুন' : 'Immediate renewal mandatory'}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Category Filter Chips & Search */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" alignItems="center">
          <Box sx={{ overflowX: 'auto', display: 'flex', gap: 1, pb: 0.5, maxWidth: '100%' }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                clickable
                color={selectedCategory === c.key ? 'primary' : 'default'}
                variant={selectedCategory === c.key ? 'filled' : 'outlined'}
                label={isBn ? c.labelBn : c.labelEn}
                onClick={() => setSelectedCategory(c.key)}
              />
            ))}
          </Box>
          <AppTextField
            fieldName="searchDocuments"
            fullWidth={false}
            placeholder={isBn ? 'নথি খুঁজুন (নাম, নম্বর, কর্তৃপক্ষ)...' : 'Search documents...'}
            value={searchTerm}
            onValueChange={(val) => setSearchTerm(val)}
            sx={{ minWidth: 260 }}
          />
        </Stack>
      </Paper>

      {/* Documents Table */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ক্যাটাগরি' : 'Category'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'নথির নাম ও নম্বর' : 'Document Title & #'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ইস্যুকারী কর্তৃপক্ষ' : 'Issuing Authority'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ইস্যু তারিখ' : 'Issue Date'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মেয়াদ উত্তীর্ণের তারিখ' : 'Expiry Date'}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'অবশিষ্ট দিন' : 'Validity Status'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ফাইল / লিংক' : 'Attachment'}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'অ্যাকশন' : 'Actions'}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {isBn ? 'কোনো নথিপত্র পাওয়া যায়নি।' : 'No documents found matching criteria.'}
                </TableCell>
              </TableRow>
            ) : (
              documents.map((d) => {
                const daysLeft = getDaysLeft(d.expiryDate);
                return (
                  <TableRow key={d.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        size="small"
                        label={d.category.replaceAll('_', ' ')}
                        color="default"
                        sx={{ fontSize: 11, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={d.title}>{d.title}</Typography>
                      {d.documentNumber && (
                        <Typography variant="caption" color="text.secondary" noWrap title={d.documentNumber}>
                          #{d.documentNumber}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap title={d.issuingAuthority || '—'}>{d.issuingAuthority || '—'}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{d.issueDate ? new Date(d.issueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {daysLeft === null ? (
                        <Chip size="small" label={isBn ? 'মেয়াদহীন / স্থায়ী' : 'No Expiry'} color="default" />
                      ) : daysLeft < 0 ? (
                        <Chip
                          size="small"
                          color="error"
                          label={`${isBn ? 'মেয়াদোত্তীর্ণ' : 'Expired'} (${Math.abs(daysLeft)}d)`}
                        />
                      ) : daysLeft <= 7 ? (
                        <Chip
                          size="small"
                          color="error"
                          variant="outlined"
                          label={`${daysLeft} ${isBn ? 'দিন বাকি (জরুরি)' : 'days left (Urgent)'}`}
                        />
                      ) : daysLeft <= (d.reminderDaysBefore || 30) ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={`${daysLeft} ${isBn ? 'দিন বাকি' : 'days left'}`}
                        />
                      ) : (
                        <Chip
                          size="small"
                          color="success"
                          label={`${daysLeft} ${isBn ? 'দিন বাকি' : 'days left'}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {d.fileUrl || d.fileName ? (
                        <Tooltip title={d.fileName || d.fileUrl}>
                          <Chip
                            size="small"
                            icon={<InsertDriveFileRoundedIcon fontSize="small" />}
                            label={d.fileName || 'View Attachment'}
                            clickable
                            component="a"
                            href={d.fileUrl || '#'}
                            target="_blank"
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">{isBn ? 'সংযুক্ত নেই' : 'None'}</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton size="small" onClick={() => handleOpenEdit(d)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteDocument(d.id)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Dialog: Create or Edit Document */}
      <FormDialog
        open={createDialogOpen}
        onClose={() => !busy && setCreateDialogOpen(false)}
        onSubmit={handleSaveDocument}
        title={
          editingDoc
            ? (isBn ? 'নথিপত্র তথ্য হালনাগাদ' : 'Update Document')
            : (isBn ? 'নতুন নথিপত্র আপলোড ও সংরক্ষণ' : 'Upload & Register Document')
        }
        error={errorMsg}
        onClearError={() => setErrorMsg(null)}
        loading={busy}
        submitLabel={
          editingDoc
            ? (isBn ? 'আপডেট করুন' : 'Update')
            : (isBn ? 'সংরক্ষণ করুন' : 'Save Document')
        }
        cancelLabel={isBn ? 'বাতিল' : 'Cancel'}
        maxWidth="sm"
      >
        <FormGrid columns={{ xs: 1, sm: 2 }}>
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppSelect
              fieldName="formCategory"
              required
              label={isBn ? 'নথির ধরন / ক্যাটাগরি' : 'Document Category'}
              value={formCategory}
              errorText={fieldErrors.formCategory}
              options={CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => ({
                value: c.key,
                label: isBn ? c.labelBn : c.labelEn,
              }))}
              onChange={(val) => {
                setFormCategory(val);
                setFieldErrors((p) => ({ ...p, formCategory: '' }));
              }}
            />
          </Box>

          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppTextField
              fieldName="formTitle"
              required
              label={isBn ? 'নথির শিরোনাম / বিবরণ' : 'Document Title'}
              value={formTitle}
              errorText={fieldErrors.formTitle}
              onValueChange={(val) => {
                setFormTitle(val);
                setFieldErrors((p) => ({ ...p, formTitle: '' }));
              }}
            />
          </Box>

          <AppTextField
            fieldName="formDocNumber"
            label={isBn ? 'লাইসেন্স / সার্টিফিকেট নম্বর' : 'Document / Certificate #'}
            value={formDocNumber}
            onValueChange={(val) => setFormDocNumber(val)}
          />
          <AppTextField
            fieldName="formAuthority"
            label={isBn ? 'প্রদানকারী সংস্থা / কর্তৃপক্ষ' : 'Issuing Authority'}
            value={formAuthority}
            onValueChange={(val) => setFormAuthority(val)}
          />

          <AppTextField
            fieldName="formIssueDate"
            label={isBn ? 'ইস্যুর তারিখ' : 'Issue Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formIssueDate}
            onValueChange={(val) => {
              setFormIssueDate(val);
              setFieldErrors((p) => ({ ...p, formExpiryDate: '' }));
            }}
          />
          <AppTextField
            fieldName="formExpiryDate"
            label={isBn ? 'মেয়াদ উত্তীর্ণের তারিখ' : 'Expiry Date'}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={formExpiryDate}
            errorText={fieldErrors.formExpiryDate}
            onValueChange={(val) => {
              setFormExpiryDate(val);
              setFieldErrors((p) => ({ ...p, formExpiryDate: '' }));
            }}
          />

          <Box sx={{ gridColumn: { sm: 'span 2' } }}>
            <AppTextField
              fieldName="formReminderDays"
              label={isBn ? 'কত দিন পূর্বে রিমাইন্ডার পাবেন' : 'Reminder Days Before Expiry'}
              type="number"
              unit="DAYS"
              value={formReminderDays}
              errorText={fieldErrors.formReminderDays}
              inputProps={{ min: 0 }}
              onValueChange={(val) => {
                setFormReminderDays(val);
                setFieldErrors((p) => ({ ...p, formReminderDays: '' }));
              }}
            />
          </Box>
        </FormGrid>

        <FormSection title={isBn ? 'সংযুক্তি ও ফাইল তথ্য' : 'File Attachment'}>
          <FormGrid columns={1}>
            <AppTextField
              fieldName="formFileName"
              label={isBn ? 'ফাইলের নাম (উদাঃ trade_license_2026.pdf)' : 'File Name'}
              value={formFileName}
              onValueChange={(val) => setFormFileName(val)}
            />

            <AppTextField
              fieldName="formFileUrl"
              label={isBn ? 'ফাইল ইউআরএল / স্টোরেজ পাথ' : 'File URL / Cloud Link'}
              value={formFileUrl}
              onValueChange={(val) => setFormFileUrl(val)}
            />

            <AppTextField
              fieldName="formRemarks"
              label={isBn ? 'মন্তব্য / রিমার্কস' : 'Remarks'}
              multiline
              rows={2}
              value={formRemarks}
              onValueChange={(val) => setFormRemarks(val)}
            />
          </FormGrid>
        </FormSection>
      </FormDialog>
    </Box>
  );
}

