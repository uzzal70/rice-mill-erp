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
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';
import PostAddRoundedIcon from '@mui/icons-material/PostAddRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface ApprovalsPageProps {
  companyId: string;
  factoryId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

const STATUS_CONFIG: Record<string, { color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; labelEn: string; labelBn: string }> = {
  DRAFT: { color: 'default', labelEn: 'Draft', labelBn: 'খসড়া' },
  SUBMITTED: { color: 'warning', labelEn: 'Submitted', labelBn: 'দাখিলকৃত' },
  REVIEWED: { color: 'info', labelEn: 'Reviewed', labelBn: 'পর্যালোচিত' },
  APPROVED: { color: 'primary', labelEn: 'Approved', labelBn: 'অনুমোদিত' },
  POSTED: { color: 'success', labelEn: 'Posted', labelBn: 'পোস্টকৃত' },
  LOCKED: { color: 'success', labelEn: 'Locked', labelBn: 'লককৃত' },
  REJECTED: { color: 'error', labelEn: 'Rejected', labelBn: 'বাতিলকৃত' },
  RETURNED_FOR_CORRECTION: { color: 'warning', labelEn: 'Correction Needed', labelBn: 'সংশোধন প্রয়োজন' },
};

export function ApprovalsPage({
  companyId,
  factoryId,
  language,
  onSaved,
}: ApprovalsPageProps) {
  const queryClient = useQueryClient();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState(0); // 0: Inbox, 1: All Records, 2: Workflow Rules
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Transition Action Dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string>('APPROVE');
  const [actionComments, setActionComments] = useState('');

  // History Timeline Dialog
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineRequest, setTimelineRequest] = useState<any | null>(null);

  // Queries
  const { data: inbox, refetch: refetchInbox } = useQuery({
    queryKey: ['approvals-inbox', companyId],
    queryFn: () => apiRequest<any>(`/approvals/inbox?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: allRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['approvals-list', companyId, statusFilter, typeFilter, searchTerm],
    queryFn: () => {
      let url = `/approvals?companyId=${companyId}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (typeFilter !== 'ALL') url += `&entityType=${typeFilter}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      return apiRequest<any[]>(url);
    },
    enabled: !!companyId,
  });

  const handleRefresh = () => {
    refetchInbox();
    refetchRequests();
  };

  const handleOpenAction = (req: any, action: string) => {
    setSelectedRequest(req);
    setActionType(action);
    setActionComments('');
    setActionDialogOpen(true);
  };

  const handleOpenTimeline = async (req: any) => {
    try {
      const detailed = await apiRequest<any>(`/approvals/${req.id}?companyId=${companyId}`);
      setTimelineRequest(detailed);
      setTimelineDialogOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error loading timeline');
    }
  };

  const handleExecuteTransition = async () => {
    if (!selectedRequest) return;
    try {
      await apiRequest(`/approvals/${selectedRequest.id}/transition?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          comments: actionComments || undefined,
        }),
      });
      onSaved(
        isBn
          ? `অনুমোদন সফলভাবে কার্যকর হয়েছে: ${actionType}`
          : `Workflow transition completed: ${actionType}`,
      );
      setActionDialogOpen(false);
      handleRefresh();
    } catch (err: any) {
      alert(err.message || 'Transition failed');
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FactCheckRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'মাল্টি-টায়ার অনুমোদন ও ওয়ার্কফ্লো সিস্টেম' : 'Multi-Tier Approval & Workflow System'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'DRAFT → SUBMITTED → REVIEWED → APPROVED → POSTED → LOCKED লেনদেন রূপান্তর ও অডিট ট্রায়াল'
              : 'DRAFT → SUBMITTED → REVIEWED → APPROVED → POSTED → LOCKED enterprise governance'}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={handleRefresh}>
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </Stack>
      </Stack>

      {/* KPI Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Card sx={{ flex: 1, borderLeft: '4px solid #ed6c02' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'পর্যালোচনার অপেক্ষায়' : 'Pending Review (Submitted)'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'warning.main' }}>
              {inbox?.pendingReview ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'সুপারভাইজার যাচাই প্রয়োজন' : 'Requires officer verification'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #0288d1' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'চূড়ান্ত অনুমোদনের অপেক্ষায়' : 'Pending Final Approval'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>
              {inbox?.pendingApproval ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'ম্যানেজমেন্ট স্বাক্ষরের অপেক্ষায়' : 'Awaiting management sign-off'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #7b1fa2' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'পোস্টিংয়ের জন্য প্রস্তুত' : 'Ready for Posting'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'secondary.main' }}>
              {inbox?.readyToPost ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'লেজার ও স্টক পোস্টিং' : 'General Ledger & inventory'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'লকড ও সুরক্ষিত লেনদেন' : 'Locked & Immutable'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>
              {inbox?.lockedCount ?? 0}
            </Typography>
            <Typography variant="caption" color="success.main">
              {isBn ? 'কোনো পরিবর্তনযোগ্য নয়' : 'Audit-protected records'}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<FactCheckRoundedIcon />} iconPosition="start" label={`${isBn ? 'অপেক্ষমাণ অনুমোদন ইনবক্স' : 'Pending Approvals Inbox'} (${(inbox?.pendingReview || 0) + (inbox?.pendingApproval || 0)})`} />
          <Tab icon={<AssignmentTurnedInRoundedIcon />} iconPosition="start" label={isBn ? 'সকল লেনদেন রেজিস্ট্রি' : 'All Transactions Registry'} />
          <Tab icon={<LockRoundedIcon />} iconPosition="start" label={isBn ? 'ওয়ার্কফ্লো নীতি ও নিয়মাবলী' : 'Workflow Governance Policy'} />
        </Tabs>
      </Paper>

      {/* Tab 0: Approval Inbox */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {isBn ? 'অনুমোদন ও পর্যালোচনার জন্য অপেক্ষমাণ লেনদেন' : 'Active Items Requiring Officer Review & Authorization'}
          </Typography>
          <Table size="small" sx={{ minWidth: 920 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'লেনদেন নং ও ধরন' : 'Document # & Type'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বিবরণ' : 'Title'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পরিমাণ (৳)' : 'Amount (BDT)'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'বর্তমান স্ট্যাটাস' : 'Status'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'দাখিলের সময়' : 'Submitted At'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'পদক্ষেপ / অ্যাকশন' : 'Approval Actions'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inbox?.activePending?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'এই মুহূর্তে অনুমোদনের জন্য কোনো লেনদেন অপেক্ষমাণ নেই।' : 'No transactions currently pending approval.'}
                  </TableCell>
                </TableRow>
              ) : (
                inbox?.activePending?.map((req: any) => {
                  const cfg = STATUS_CONFIG[req.status] || { color: 'default', labelEn: req.status, labelBn: req.status };
                  return (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{req.entityNumber}</Typography>
                        <Chip size="small" label={req.entityType} sx={{ fontSize: 10, height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={req.title}>{req.title}</Typography></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {req.amount ? `৳ ${Number(req.amount).toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Chip size="small" color={cfg.color} label={isBn ? cfg.labelBn : cfg.labelEn} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          {req.status === 'SUBMITTED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={<RateReviewRoundedIcon fontSize="small" />}
                              onClick={() => handleOpenAction(req, 'REVIEW')}
                            >
                              {isBn ? 'যাচাই' : 'Review'}
                            </Button>
                          )}
                          {(req.status === 'REVIEWED' || req.status === 'SUBMITTED') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<CheckCircleRoundedIcon fontSize="small" />}
                              onClick={() => handleOpenAction(req, 'APPROVE')}
                            >
                              {isBn ? 'অনুমোদন' : 'Approve'}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<UndoRoundedIcon fontSize="small" />}
                            onClick={() => handleOpenAction(req, 'RETURN_FOR_CORRECTION')}
                          >
                            {isBn ? 'সংশোধন' : 'Return'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelRoundedIcon fontSize="small" />}
                            onClick={() => handleOpenAction(req, 'REJECT')}
                          >
                            {isBn ? 'বাতিল' : 'Reject'}
                          </Button>
                          <Button size="small" onClick={() => handleOpenTimeline(req)}>
                            {isBn ? 'ইতিহাস' : 'Audit'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 1: All Records & Historical Registry */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 2 }} alignItems="center" justifyContent="space-between">
            <Stack direction="row" gap={1} flexWrap="wrap">
              <TextField
                select
                size="small"
                SelectProps={{ native: true }}
                label={isBn ? 'স্ট্যাটাস ফিল্টার' : 'Status Filter'}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="ALL">{isBn ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
                {Object.keys(STATUS_CONFIG).map((k) => (
                  <option key={k} value={k}>{isBn ? STATUS_CONFIG[k].labelBn : STATUS_CONFIG[k].labelEn}</option>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                SelectProps={{ native: true }}
                label={isBn ? 'লেনদেন ক্যাটাগরি' : 'Entity Type'}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <option value="ALL">{isBn ? 'সকল ক্যাটাগরি' : 'All Entities'}</option>
                <option value="PURCHASE_ORDER">Purchase Order</option>
                <option value="PURCHASE_INVOICE">Purchase Invoice</option>
                <option value="SALES_ORDER">Sales Order</option>
                <option value="SALES_DISPATCH">Sales Dispatch</option>
                <option value="EXPENSE">Expense Claim</option>
                <option value="JOURNAL_VOUCHER">Journal Voucher</option>
                <option value="PAYROLL">Payroll</option>
              </TextField>
            </Stack>

            <TextField
              size="small"
              placeholder={isBn ? 'লেনদেন নং বা বিবরণ দিয়ে খুঁজুন...' : 'Search by number or title...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 260 }}
            />
          </Stack>

          <Table size="small" sx={{ minWidth: 920 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'নথি নং ও ধরন' : 'Doc # & Type'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'শিরোনাম' : 'Title'}</strong></TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মূল্য (৳)' : 'Amount'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'সর্বশেষ আপডেট' : 'Updated'}</strong></TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'কার্যক্রম' : 'Action'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isBn ? 'কোনো লেনদেন পাওয়া যায়নি।' : 'No records found matching filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                allRequests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status] || { color: 'default', labelEn: req.status, labelBn: req.status };
                  return (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{req.entityNumber}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">{req.entityType}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}><Typography variant="body2" noWrap title={req.title}>{req.title}</Typography></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {req.amount ? `৳ ${Number(req.amount).toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Chip size="small" color={cfg.color} label={isBn ? cfg.labelBn : cfg.labelEn} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(req.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          {req.status === 'APPROVED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="secondary"
                              startIcon={<PostAddRoundedIcon fontSize="small" />}
                              onClick={() => handleOpenAction(req, 'POST')}
                            >
                              {isBn ? 'পোস্ট' : 'Post'}
                            </Button>
                          )}
                          {req.status === 'POSTED' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<LockRoundedIcon fontSize="small" />}
                              onClick={() => handleOpenAction(req, 'LOCK')}
                            >
                              {isBn ? 'লক' : 'Lock'}
                            </Button>
                          )}
                          <Button size="small" variant="text" onClick={() => handleOpenTimeline(req)}>
                            {isBn ? 'টাইমলাইন' : 'Timeline'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 2: Workflow Rules & Immutability */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {isBn ? 'এন্টারপ্রাইজ লেনদেন ওয়ার্কফ্লো ও অপরিবর্তনীয়তা নীতি' : 'Enterprise Transaction Workflow & Immutability Policy'}
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {isBn ? 'পোস্টিং পরবর্তী নীরব পরিবর্তন সম্পূর্ণ নিষিদ্ধ:' : 'Post-Posting Silent Modifications Prohibited:'}
            </Typography>
            <Typography variant="body2">
              {isBn
                ? 'একবার কোনো লেনদেন POSTED বা LOCKED হলে সরাসরি ডাটাবেজ এডিট অনুমোদিত নয়। যেকোনো পরিবর্তন বা সংশোধনের জন্য বিপরীত দাখিলা (Reversal Voucher) বা সমন্বয় দাখিলা (Correction Voucher) ব্যবহার করতে হবে।'
                : 'Once a transaction is POSTED or LOCKED, silent in-place edits are forbidden. Any correction requires an explicit reversal entry or correction voucher.'}
            </Typography>
          </Alert>

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {isBn ? 'ধাপসমূহ:' : 'Lifecycle Stages:'}
          </Typography>
          <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>1. DRAFT (খসড়া):</strong> {isBn ? 'ব্যবহারকারী দ্বারা প্রাথমিক তথ্য ইনপুট ও খসড়া তৈরি।' : 'Initial document entry and modifications.'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>2. SUBMITTED (দাখিলকৃত):</strong> {isBn ? 'যাচাই ও পর্যালোচনার জন্য জমা প্রদান।' : 'Submitted for formal review; locked from informal editing.'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>3. REVIEWED (পর্যালোচিত):</strong> {isBn ? 'দায়িত্বপ্রাপ্ত কর্মকর্তা কর্তৃক পরিমাণ ও দর যাচাই।' : 'Verified by supervisor; ready for management authorization.'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>4. APPROVED (অনুমোদিত):</strong> {isBn ? 'ব্যবস্থাপনা পরিচালক বা অনুমোদিত কর্মকর্তার স্বাক্ষর।' : 'Authorized by designated management role.'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>5. POSTED (পোস্টকৃত):</strong> {isBn ? 'জেনারেল লেজার হিসাব ও ভৌত স্টকে দাখিলা সম্পন্ন।' : 'Financial double-entry ledger & inventory stock updated.'}
            </Typography>
            <Typography variant="body2">
              <strong>6. LOCKED (লককৃত):</strong> {isBn ? 'অডিট সুরক্ষা বলয়ে চূড়ান্তভাবে লক।' : 'Permanently locked against all operational mutation.'}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Action Dialog (Approve, Review, Post, Lock, Reject, Return) */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'APPROVE' && (isBn ? 'লেনদেন অনুমোদন করুন' : 'Authorize & Approve Transaction')}
          {actionType === 'REVIEW' && (isBn ? 'লেনদেন পর্যালোচনা নিশ্চিত করুন' : 'Confirm Document Review')}
          {actionType === 'POST' && (isBn ? 'লেজার ও স্টক পোস্টিং সম্পন্ন করুন' : 'Post to General Ledger & Stock')}
          {actionType === 'LOCK' && (isBn ? 'লেনদেন চূড়ান্তভাবে লক করুন' : 'Lock Transaction (Audit Seal)')}
          {actionType === 'REJECT' && (isBn ? 'লেনদেন বাতিল করুন' : 'Reject Transaction')}
          {actionType === 'RETURN_FOR_CORRECTION' && (isBn ? 'সংশোধনের জন্য ফেরত পাঠান' : 'Return for Correction')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selectedRequest && (
            <Paper sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
              <Typography variant="body2">
                <strong>{isBn ? 'নথি নম্বর:' : 'Document #:'}</strong> {selectedRequest.entityNumber} ({selectedRequest.entityType})
              </Typography>
              <Typography variant="body2">
                <strong>{isBn ? 'বিবরণ:' : 'Title:'}</strong> {selectedRequest.title}
              </Typography>
              {selectedRequest.amount && (
                <Typography variant="body2">
                  <strong>{isBn ? 'পরিমাণ:' : 'Amount:'}</strong> ৳{Number(selectedRequest.amount).toLocaleString()}
                </Typography>
              )}
            </Paper>
          )}

          <TextField
            label={
              actionType === 'REJECT'
                ? (isBn ? 'বাতিলের কারণ (বাধ্যতামূলক)' : 'Rejection Reason (Required)')
                : actionType === 'RETURN_FOR_CORRECTION'
                ? (isBn ? 'প্রয়োজনীয় সংশোধনের বিবরণ (বাধ্যতামূলক)' : 'Correction Feedback (Required)')
                : (isBn ? 'অনুমোদন মন্তব্য (ঐচ্ছিক)' : 'Comments / Sign-off Notes')
            }
            multiline
            rows={3}
            value={actionComments}
            onChange={(e) => setActionComments(e.target.value)}
            required={actionType === 'REJECT' || actionType === 'RETURN_FOR_CORRECTION'}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button
            variant="contained"
            color={actionType === 'REJECT' ? 'error' : actionType === 'RETURN_FOR_CORRECTION' ? 'warning' : 'primary'}
            onClick={handleExecuteTransition}
            disabled={
              (actionType === 'REJECT' || actionType === 'RETURN_FOR_CORRECTION') && !actionComments.trim()
            }
          >
            {isBn ? 'নিশ্চিত করুন' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Timeline Dialog */}
      <Dialog open={timelineDialogOpen} onClose={() => setTimelineDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isBn ? 'অনুমোদন ও পদক্ষেপের ইতিহাস (Audit Trail)' : 'Workflow Audit Trail & History'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {timelineRequest && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {timelineRequest.entityNumber} — {timelineRequest.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'বর্তমান অবস্থা:' : 'Current Status:'} {timelineRequest.status}
              </Typography>
              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={2}>
                {timelineRequest.actions?.map((act: any, idx: number) => (
                  <Paper key={act.id} sx={{ p: 1.5, borderLeft: '4px solid #1976d2' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {act.actionType} ({act.fromStatus} → {act.toStatus})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(act.actionTimestamp).toLocaleString()}
                      </Typography>
                    </Stack>
                    {act.actorName && (
                      <Typography variant="caption" color="primary">
                        {isBn ? 'ব্যবহারকারী:' : 'Actor:'} {act.actorName} {act.actorRole ? `(${act.actorRole})` : ''}
                      </Typography>
                    )}
                    {act.comments && (
                      <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        "{act.comments}"
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineDialogOpen(false)}>{isBn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

