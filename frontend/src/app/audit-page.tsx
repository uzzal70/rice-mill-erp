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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { AppSelect, AppTextField } from '@/components/form';

interface AuditPageProps {
  companyId: string;
  language: 'en' | 'bn';
  onSaved: (msg: string) => void;
}

const ACTION_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  POST: 'primary',
  APPROVE: 'secondary',
  LOCK: 'success',
  REJECT: 'error',
  LOGIN: 'info',
  RETURN_FOR_CORRECTION: 'warning',
};

export function AuditPage({ companyId, language, onSaved }: AuditPageProps) {
  const isBn = language === 'bn';

  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Diff dialog state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  // Queries
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['audit-summary', companyId],
    queryFn: () => apiRequest<any>(`/audit/summary?companyId=${companyId}`),
    enabled: !!companyId,
  });

  const { data: logData, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', companyId, resourceFilter, actionFilter, searchTerm, page],
    queryFn: () => {
      let url = `/audit?companyId=${companyId}&page=${page}&pageSize=30`;
      if (resourceFilter !== 'ALL') url += `&resource=${resourceFilter}`;
      if (actionFilter !== 'ALL') url += `&action=${actionFilter}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      return apiRequest<any>(url);
    },
    enabled: !!companyId,
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchLogs();
  };

  const handleInspectDiff = (event: any) => {
    setSelectedEvent(event);
    setDiffDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Title */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PolicyRoundedIcon color="primary" fontSize="large" />
            {isBn ? 'সিস্টেম অডিট লগ ও অপরিবর্তনীয় ট্রায়াল' : 'Enterprise Audit Log & Immutable Trail'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'ব্যবহারকারী, অ্যাকশন, মডিউল, পূর্বের মান ও নতুন মান, আইপি, ডিভাইস এবং সময়সূচির স্থায়ী ও অপরিবর্তনীয় অডিট লগ'
              : 'Tamper-proof record of user, action, module, record, old vs new values, IP, device, and timestamps'}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={handleRefresh}>
          {isBn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </Stack>

      {/* Immutability Banner */}
      <Alert severity="success" icon={<LockRoundedIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {isBn ? 'অপরিবর্তনীয় অডিট নীতি নিশ্চিত (Immutable Audit Record):' : 'Immutable Audit Assurance:'}
        </Typography>
        <Typography variant="body2">
          {isBn
            ? 'এই অডিট লগের প্রতিটি রেকর্ড ক্রিপ্টোগ্রাফিকভাবে সুরক্ষিত ও ডাটাবেজে শুধুমাত্র সংযোজনযোগ্য (Append-Only)। কোনো ব্যবহারকারী বা অ্যাডমিন এই লগ সম্পাদনা বা মুছতে পারবে না।'
            : 'Audit log entries are append-only and strictly immutable. No administrative role or user can edit, overwrite, or delete audit events.'}
        </Typography>
      </Alert>

      {/* Summary KPI Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Card sx={{ flex: 1, borderLeft: '4px solid #1976d2' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'মোট সংরক্ষিত অডিট ইভেন্ট' : 'Total Audit Events'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {summary?.totalEvents?.toLocaleString() ?? 0}
            </Typography>
            <Typography variant="caption" color="primary">
              {isBn ? 'স্থায়ী ট্রায়াল রেকর্ড' : 'Permanent governance trace'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #d32f2f' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'গুরুত্বপূর্ণ / সংবেদনশীল অ্যাকশন' : 'High-Impact Actions'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>
              {(summary?.actionCounts?.['POST'] || 0) + (summary?.actionCounts?.['DELETE'] || 0) + (summary?.actionCounts?.['LOCK'] || 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'পোস্টিং, ডিলিট ও লক অ্যাকশন' : 'Posts, Deletes & Lock decisions'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #0288d1' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'সক্রিয় মডিউল সংখ্যা' : 'Modules Monitored'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>
              {Object.keys(summary?.moduleCounts || {}).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'সংগ্রহ, মজুদ, বিক্রয়, হিসাব ইত্যাদি' : 'Procurement, Stock, Sales, GL, HR'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderLeft: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {isBn ? 'শীর্ষ সক্রিয় অপারেটর' : 'Top Active Operator'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main', fontSize: '1.1rem' }}>
              {summary?.topUsers?.[0]?.user || 'System'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {summary?.topUsers?.[0]?.count ?? 0} {isBn ? 'টি ইভেন্ট' : 'logged actions'}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between" alignItems="center">
          <Stack direction="row" gap={1.5} flexWrap="wrap">
            <AppSelect
              fieldName="resourceFilter"
              fullWidth={false}
              label={isBn ? 'মডিউল / রিসোর্স' : 'Module / Resource'}
              value={resourceFilter}
              options={[
                { value: 'ALL', label: isBn ? 'সকল মডিউল' : 'All Modules' },
                { value: 'PROCUREMENT', label: 'Procurement' },
                { value: 'INVENTORY', label: 'Inventory' },
                { value: 'SALES', label: 'Sales' },
                { value: 'ACCOUNTING', label: 'Accounting Engine' },
                { value: 'HR', label: 'HR & Payroll' },
                { value: 'MACHINES', label: 'Machines' },
                { value: 'FLEET', label: 'Fleet & Fuel' },
                { value: 'DOCUMENTS', label: 'Documents' },
                { value: 'APPROVALS', label: 'Approvals' },
                { value: 'ROLES', label: 'Roles & Users' },
                { value: 'AUTH', label: 'Authentication' },
              ]}
              onChange={(val) => {
                setResourceFilter(val);
                setPage(1);
              }}
              sx={{ minWidth: 195 }}
            />

            <AppSelect
              fieldName="actionFilter"
              fullWidth={false}
              label={isBn ? 'অ্যাকশন ধরন' : 'Action Type'}
              value={actionFilter}
              options={[
                { value: 'ALL', label: isBn ? 'সকল অ্যাকশন' : 'All Actions' },
                { value: 'CREATE', label: 'CREATE' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'APPROVE', label: 'APPROVE' },
                { value: 'POST', label: 'POST' },
                { value: 'LOCK', label: 'LOCK' },
                { value: 'REJECT', label: 'REJECT' },
                { value: 'RETURN_FOR_CORRECTION', label: 'RETURN' },
                { value: 'LOGIN', label: 'LOGIN' },
              ]}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              sx={{ minWidth: 175 }}
            />
          </Stack>

          <AppTextField
            fieldName="searchAudit"
            fullWidth={false}
            placeholder={isBn ? 'ব্যবহারকারী, রেকর্ড আইডি বা আইপি খুঁজুন...' : 'Search by user, record ID, or IP...'}
            value={searchTerm}
            onValueChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            sx={{ minWidth: 280 }}
          />
        </Stack>
      </Paper>

      {/* Audit Log Table */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead sx={{ backgroundColor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'ব্যবহারকারী' : 'User'}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'অ্যাকশন' : 'Action'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মডিউল' : 'Module'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'রেকর্ড আইডি' : 'Record ID'}</strong></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'আইপি ও ডিভাইস' : 'IP & Device'}</strong></TableCell>
              <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{isBn ? 'মান তুলনা' : 'Diff Inspector'}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logData?.events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {isBn ? 'কোনো অডিট রেকর্ড পাওয়া যায়নি।' : 'No audit events found matching filters.'}
                </TableCell>
              </TableRow>
            ) : (
              logData?.events?.map((ev: any) => {
                const color = ACTION_COLORS[ev.action] || 'default';
                return (
                  <TableRow key={ev.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(ev.occurredAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ev.occurredAt).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 190 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={ev.user?.fullName || ev.userName || (isBn ? 'সিস্টেম' : 'System')}>
                        {ev.user?.fullName || ev.userName || (isBn ? 'সিস্টেম' : 'System')}
                      </Typography>
                      {ev.user?.email && (
                        <Typography variant="caption" color="text.secondary" noWrap title={ev.user.email}>
                          {ev.user.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" color={color} label={ev.action} sx={{ fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip size="small" variant="outlined" label={ev.resource} sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {ev.resourceId || '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }} noWrap>
                        {ev.ipAddress || '127.0.0.1'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.device || 'Desktop Browser'}>
                        {ev.device || 'Desktop Browser'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CompareArrowsRoundedIcon fontSize="small" />}
                        onClick={() => handleInspectDiff(ev)}
                      >
                        {isBn ? 'তুলনা দেখুন' : 'Inspect'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {logData?.totalPages > 1 && (
          <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1} sx={{ mt: 2 }}>
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {isBn ? 'পূর্ববর্তী' : 'Previous'}
            </Button>
            <Typography variant="caption">
              {isBn ? `পৃষ্ঠা ${page} / ${logData.totalPages}` : `Page ${page} of ${logData.totalPages}`}
            </Typography>
            <Button
              size="small"
              disabled={page >= logData.totalPages}
              onClick={() => setPage((p) => Math.min(logData.totalPages, p + 1))}
            >
              {isBn ? 'পরবর্তী' : 'Next'}
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Diff Inspector Modal (Old Value vs New Value) */}
      <Dialog open={diffDialogOpen} onClose={() => setDiffDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityRoundedIcon color="primary" />
          {isBn ? 'অডিট রেকর্ড পরিবর্তন পরিদর্শন (Before vs After Diff)' : 'Audit Record Diff Inspector (Old vs New)'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {selectedEvent && (
            <Box>
              <Paper sx={{ p: 2, backgroundColor: 'action.hover', mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="space-between">
                  <Box>
                    <Typography variant="body2"><strong>{isBn ? 'মডিউল:' : 'Module:'}</strong> {selectedEvent.resource}</Typography>
                    <Typography variant="body2"><strong>{isBn ? 'অ্যাকশন:' : 'Action:'}</strong> {selectedEvent.action}</Typography>
                    <Typography variant="body2"><strong>{isBn ? 'রেকর্ড আইডি:' : 'Record ID:'}</strong> {selectedEvent.resourceId || 'N/A'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2"><strong>{isBn ? 'ব্যবহারকারী:' : 'User:'}</strong> {selectedEvent.user?.fullName || selectedEvent.userName || 'System'}</Typography>
                    <Typography variant="body2"><strong>{isBn ? 'আইপি এড্রেস:' : 'IP Address:'}</strong> {selectedEvent.ipAddress || 'Unknown'}</Typography>
                    <Typography variant="body2"><strong>{isBn ? 'সময়:' : 'Timestamp:'}</strong> {new Date(selectedEvent.occurredAt).toLocaleString()}</Typography>
                  </Box>
                </Stack>
                {selectedEvent.device && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    <ComputerRoundedIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    {selectedEvent.device}
                  </Typography>
                )}
              </Paper>

              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                {/* Old Value */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                    {isBn ? 'পূর্বের মান (Old Value / Before):' : 'Old Value (Before Modification):'}
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: '#fff5f5',
                      border: '1px solid #ffcdd2',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 320,
                      overflowY: 'auto',
                    }}
                  >
                    {selectedEvent.before
                      ? JSON.stringify(selectedEvent.before, null, 2)
                      : (isBn ? '[কোনো পূর্ববর্তী মান নেই / নতুন সৃষ্টি]' : '[No previous value / Created record]')}
                  </Paper>
                </Box>

                {/* New Value */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                    {isBn ? 'নতুন মান (New Value / After):' : 'New Value (After Modification):'}
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: '#f1f8e9',
                      border: '1px solid #c8e6c9',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 320,
                      overflowY: 'auto',
                    }}
                  >
                    {selectedEvent.after
                      ? JSON.stringify(selectedEvent.after, null, 2)
                      : (isBn ? '[রেকর্ড মুছে ফেলা হয়েছে]' : '[Record deleted]')}
                  </Paper>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiffDialogOpen(false)}>{isBn ? 'বন্ধ করুন' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

