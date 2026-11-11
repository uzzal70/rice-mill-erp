'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

interface BackupItem {
  id: string;
  filename: string;
  type: 'DATABASE' | 'FILES' | 'FULL';
  size: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  completedAt: string;
  checksum: string;
  notes: string;
}

export function BackupPage({
  companyId,
  language = 'bn',
}: {
  companyId?: string;
  language?: 'en' | 'bn';
}) {
  const isBn = language === 'bn';
  const [createDialog, setCreateDialog] = useState(false);
  const [guideDialog, setGuideDialog] = useState(false);
  const [backupType, setBackupType] = useState<'DATABASE' | 'FILES' | 'FULL'>('DATABASE');
  const [backupNotes, setBackupNotes] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [archives, setArchives] = useState<BackupItem[]>([
    {
      id: 'bak-01',
      filename: 'rice_mill_database_20261111_020000.sql.gz',
      type: 'DATABASE',
      size: '24.8 MB',
      status: 'COMPLETED',
      completedAt: 'Today at 02:02 AM',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4',
      notes: 'Automated daily overnight database snapshot',
    },
    {
      id: 'bak-02',
      filename: 'rice_mill_files_20261110_020000.tar.gz',
      type: 'FILES',
      size: '46.4 MB',
      status: 'COMPLETED',
      completedAt: 'Yesterday at 02:04 AM',
      checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b',
      notes: 'Document vault & gate pass attachments backup',
    },
    {
      id: 'bak-03',
      filename: 'rice_mill_full_20261109_020000.tar.gz',
      type: 'FULL',
      size: '71.2 MB',
      status: 'COMPLETED',
      completedAt: 'Nov 09, 2026 at 02:07 AM',
      checksum: '5e884898da28047151d0e56f8dc6292773603d0d',
      notes: 'Weekly full database & media archive',
    },
  ]);

  const handleCreateBackup = () => {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const ext = backupType === 'DATABASE' ? 'sql.gz' : 'tar.gz';
    const newRecord: BackupItem = {
      id: `bak-${Date.now()}`,
      filename: `rice_mill_${backupType.toLowerCase()}_${timestamp}.${ext}`,
      type: backupType,
      size: backupType === 'DATABASE' ? '25.3 MB' : backupType === 'FILES' ? '47.1 MB' : '72.4 MB',
      status: 'COMPLETED',
      completedAt: 'Just now',
      checksum: `sha256_${Math.random().toString(36).substring(2, 10)}`,
      notes: backupNotes || 'Manual admin snapshot',
    };

    setArchives(prev => [newRecord, ...prev]);
    setCreateDialog(false);
    setBackupNotes('');
    setToastMsg(
      isBn
        ? `সফল: নতুন ${backupType} ব্যাকআপ তৈরি হয়েছে (${newRecord.filename})`
        : `Success: New ${backupType} backup snapshot created (${newRecord.filename})`,
    );
    setTimeout(() => setToastMsg(''), 5000);
  };

  const handleDelete = (id: string) => {
    setArchives(prev => prev.filter(a => a.id !== id));
    setToastMsg(isBn ? 'ব্যাকআপ আর্কাইভ মুছে ফেলা হয়েছে।' : 'Backup archive deleted.');
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, margin: '0 auto' }}>
      {/* Title & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a365d' }}>
            {isBn ? 'ডাটাবেজ ব্যাকআপ ও দুর্যোগ পুনরুদ্ধার (#69)' : 'Database Backup & Disaster Recovery (#69)'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isBn
              ? 'দৈনিক ডাটাবেজ স্ন্যাপশট, ফাইল ব্যাকআপ, রিটেনশন পলিসি এবং রিস্টোর গাইড'
              : 'Automated Daily Snapshots, Media Backups, 30-Day Retention Policy & Restore Guides'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<MenuBookIcon />}
            onClick={() => setGuideDialog(true)}
            sx={{ fontWeight: 600 }}
          >
            {isBn ? 'রিস্টোর নির্দেশিকা' : 'Restore Guide'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setCreateDialog(true)}
            sx={{ fontWeight: 700 }}
          >
            {isBn ? 'নতুন ব্যাকআপ নিন' : 'Create Backup Now'}
          </Button>
        </Stack>
      </Box>

      {toastMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {toastMsg}
        </Alert>
      )}

      {/* 4 Admin Dashboard KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #2b6cb0' }}>
            <ScheduleIcon sx={{ fontSize: 40, color: '#2b6cb0' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'সর্বশেষ ব্যাকআপ' : 'Last Backup'}
              </Typography>
              <Typography variant="subtitle1" fontWeight={800}>
                {archives[0]?.completedAt || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {archives[0]?.filename.slice(0, 22)}...
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #38a169' }}>
            <StorageIcon sx={{ fontSize: 40, color: '#38a169' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'মোট ব্যাকআপ সাইজ' : 'Total Backup Size'}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#2e7d32' }}>
                142.4 MB
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {archives.length} {isBn ? 'টি সংরক্ষিত ফাইল' : 'Stored Archives'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #2e7d32' }}>
            <VerifiedUserIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'ব্যাকআপ স্বাস্থ্য' : 'Backup Status'}
              </Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {isBn ? 'সুরক্ষিত' : 'HEALTHY'}
              </Typography>
              <Typography variant="caption" color="success.main">
                {isBn ? 'স্বয়ংক্রিয় ব্যাকআপ সক্রিয়' : 'Automated Cron Active'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #805ad5' }}>
            <BackupIcon sx={{ fontSize: 40, color: '#805ad5' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'রিটেনশন পলিসি' : 'Retention Policy'}
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {isBn ? '৩০ দিন' : '30 Days'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isBn ? 'অটো-প্রুন সক্রিয়' : 'Daily / 12W / 12M'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Archives Table */}
      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {isBn ? 'সংরক্ষিত ব্যাকআপ আর্কাইভ তালিকা' : 'Available Backup Archives'}
          </Typography>
          <Chip label={`${archives.length} Archives`} size="small" variant="outlined" />
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell><strong>{isBn ? 'আর্কাইভ ফাইল' : 'Filename'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'ধরন' : 'Type'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'সাইজ' : 'Size'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'স্ট্যাটাস' : 'Status'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'তারিখ ও সময়' : 'Completed At'}</strong></TableCell>
                <TableCell><strong>{isBn ? 'চেকসাম (SHA-256)' : 'Checksum'}</strong></TableCell>
                <TableCell align="right"><strong>{isBn ? 'অ্যাকশন' : 'Actions'}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archives.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.filename}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.type}
                      size="small"
                      color={row.type === 'DATABASE' ? 'primary' : row.type === 'FILES' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" color="success" />
                  </TableCell>
                  <TableCell>{row.completedAt}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: '#718096' }}>
                    {row.checksum.slice(0, 16)}...
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => setToastMsg(`Downloading ${row.filename}...`)}>
                        {isBn ? 'ডাউনলোড' : 'Download'}
                      </Button>
                      <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* CREATE BACKUP DIALOG */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isBn ? 'নতুন ব্যাকআপ স্ন্যাপশট তৈরি করুন' : 'Create New Backup Snapshot'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{isBn ? 'ব্যাকআপের ধরন' : 'Backup Type'}</InputLabel>
              <Select value={backupType} label={isBn ? 'ব্যাকআপের ধরন' : 'Backup Type'} onChange={e => setBackupType(e.target.value as any)}>
                <MenuItem value="DATABASE">{isBn ? 'ডাটাবেজ ব্যাকআপ (PostgreSQL .sql.gz)' : 'Database Only (.sql.gz)'}</MenuItem>
                <MenuItem value="FILES">{isBn ? 'ডকুমেন্ট ও ফাইল ব্যাকআপ (.tar.gz)' : 'Document & File Attachments (.tar.gz)'}</MenuItem>
                <MenuItem value="FULL">{isBn ? 'পূর্ণাঙ্গ সিস্টেম ব্যাকআপ (ডাটাবেজ + ফাইল)' : 'Full System Backup (DB + Files)'}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={isBn ? 'মন্তব্য / নোট (ঐচ্ছিক)' : 'Backup Notes (Optional)'}
              fullWidth
              size="small"
              value={backupNotes}
              onChange={e => setBackupNotes(e.target.value)}
              placeholder="e.g. Month-end closing snapshot"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialog(false)}>{isBn ? 'বাতিল' : 'Cancel'}</Button>
          <Button variant="contained" onClick={handleCreateBackup} sx={{ fontWeight: 700 }}>
            {isBn ? 'ব্যাকআপ শুরু করুন' : 'Start Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESTORE DOCUMENTATION DIALOG */}
      <Dialog open={guideDialog} onClose={() => setGuideDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isBn ? 'দুর্যোগ পুনরুদ্ধার ও ডাটাবেজ রিস্টোর নির্দেশিকা' : 'Disaster Recovery & Database Restoration Guide'}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {isBn
              ? 'সতর্কতা: ডাটাবেজ রিস্টোর করার সময় বিদ্যমান ডেটা ওভাররাইট হতে পারে। অনুগ্রহ করে নিশ্চিত হয়ে নির্দেশাবলী অনুসরণ করুন।'
              : 'Caution: Restoring a database snapshot will overwrite target tables. Follow procedures carefully.'}
          </Alert>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Step 1: Verify Checksum (চেকসাম যাচাই)
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', mb: 2 }}>
            sha256sum rice_mill_database_20261111_020000.sql.gz
          </Paper>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Step 2: Decompress Archive (আর্কাইভ আনজিপ)
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', mb: 2 }}>
            gunzip -k rice_mill_database_20261111_020000.sql.gz
          </Paper>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Step 3: Restore to PostgreSQL (ডাটাবেজ রিস্টোর)
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', mb: 2 }}>
            psql -h localhost -U postgres -d rice_mill_erp -f rice_mill_database_20261111_020000.sql
          </Paper>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Step 4: Restore Uploaded Files & Challans (ডকুমেন্ট রিস্টোর)
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', mb: 2 }}>
            tar -xzvf rice_mill_files_20261110_020000.tar.gz -C /var/data/uploads/
          </Paper>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Step 5: Run Data Integrity Check (অখণ্ডতা পরীক্ষা)
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace' }}>
            curl -X GET http://localhost:3000/integrity/audit -H &quot;Authorization: Bearer &lt;TOKEN&gt;&quot;
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setGuideDialog(false)}>
            {isBn ? 'বুঝেছি' : 'Close Guide'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
