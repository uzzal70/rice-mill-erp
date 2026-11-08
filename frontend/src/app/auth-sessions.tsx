'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, List, ListItem, Paper, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { apiRequest } from '@/lib/api';

type AuthSessionRow = {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};
type LoginEvent = {
  id: string;
  result: 'SUCCESS' | 'FAILED' | 'LOCKED';
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const labels = {
  en: {
    title: 'Account security',
    subtitle: 'Review sign-in history, active devices, and email verification.',
    sessions: 'Devices & sessions',
    history: 'Login history',
    verification: 'Send verification email',
    close: 'Close',
    revoke: 'Revoke session',
    current: 'This device',
    revoked: 'Revoked',
    active: 'Active',
    expires: 'Expires',
    signedIn: 'Signed in',
    emptySessions: 'No sessions found.',
    emptyHistory: 'No sign-in history found.',
    loading: 'Loading account security…',
    failed: 'Could not load account security details.',
    verifiedSent: 'If verification is needed, instructions have been sent.',
    verificationFailed: 'Could not send verification email.',
    success: 'Success',
    failedResult: 'Failed',
    lockedResult: 'Locked',
  },
  bn: {
    title: 'অ্যাকাউন্ট নিরাপত্তা',
    subtitle: 'সাইন-ইন ইতিহাস, সক্রিয় ডিভাইস এবং ইমেইল যাচাই দেখুন।',
    sessions: 'ডিভাইস ও সেশন',
    history: 'লগইন ইতিহাস',
    verification: 'যাচাই ইমেইল পাঠান',
    close: 'বন্ধ করুন',
    revoke: 'সেশন বাতিল',
    current: 'এই ডিভাইস',
    revoked: 'বাতিল',
    active: 'সক্রিয়',
    expires: 'মেয়াদ শেষ',
    signedIn: 'সাইন-ইন',
    emptySessions: 'কোনো সেশন পাওয়া যায়নি।',
    emptyHistory: 'কোনো লগইন ইতিহাস নেই।',
    loading: 'অ্যাকাউন্ট নিরাপত্তার তথ্য লোড হচ্ছে…',
    failed: 'অ্যাকাউন্ট নিরাপত্তার তথ্য লোড করা যায়নি।',
    verifiedSent: 'যাচাই প্রয়োজন হলে নির্দেশনা পাঠানো হয়েছে।',
    verificationFailed: 'যাচাই ইমেইল পাঠানো যায়নি।',
    success: 'সফল',
    failedResult: 'ব্যর্থ',
    lockedResult: 'লকড',
  },
} as const;

export function AuthSessionsDialog({
  open,
  onClose,
  language,
  currentSessionId,
  onCurrentSessionRevoked,
  onMessage,
}: {
  open: boolean;
  onClose: () => void;
  language: 'en' | 'bn';
  currentSessionId?: string;
  onCurrentSessionRevoked: () => void;
  onMessage: (message: string) => void;
}) {
  const t = labels[language];
  const [tab, setTab] = useState(0);
  const [sessions, setSessions] = useState<AuthSessionRow[]>([]);
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sessionRows, loginRows] = await Promise.all([
        apiRequest<AuthSessionRow[]>('/auth/sessions'),
        apiRequest<LoginEvent[]>('/auth/login-history'),
      ]);
      setSessions(sessionRows);
      setHistory(loginRows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function revoke(session: AuthSessionRow) {
    setWorkingId(session.id);
    setError('');
    try {
      await apiRequest(`/auth/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' });
      if (session.id === currentSessionId) onCurrentSessionRevoked();
      else {
        setSessions(current => current.map(row => row.id === session.id ? { ...row, revokedAt: new Date().toISOString() } : row));
        await load();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setWorkingId('');
    }
  }

  async function requestVerification() {
    setWorkingId('verification');
    setError('');
    try {
      await apiRequest('/auth/email-verification/request', { method: 'POST' });
      onMessage(t.verifiedSent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.verificationFailed);
    } finally {
      setWorkingId('');
    }
  }

  function date(value: string) {
    return new Date(value).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-BD');
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle className="brand-font" fontWeight={800}>{t.title}</DialogTitle>
    <DialogContent>
      <Typography color="text.secondary" fontSize={13} mb={2}>{t.subtitle}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1}>
        <Button variant="outlined" disabled={workingId === 'verification'} onClick={requestVerification}>
          {workingId === 'verification' ? <CircularProgress size={16} /> : t.verification}
        </Button>
      </Stack>
      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label={t.sessions} />
        <Tab label={t.history} />
      </Tabs>
      {loading && <Stack direction="row" spacing={1} alignItems="center" py={2}><CircularProgress size={18} /><Typography fontSize={13}>{t.loading}</Typography></Stack>}
      {!loading && tab === 0 && <List disablePadding>
        {sessions.map(session => {
          const current = session.id === currentSessionId;
          return <ListItem key={session.id} disableGutters sx={{ mb: 1 }}>
            <Paper variant="outlined" sx={{ width: '100%', p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={.5}>
                    <Typography fontWeight={700} fontSize={13}>{session.deviceName || session.userAgent || 'Unknown device'}</Typography>
                    {current && <Chip size="small" color="primary" label={t.current} />}
                    <Chip size="small" color={session.revokedAt ? 'default' : 'success'} label={session.revokedAt ? t.revoked : t.active} />
                  </Stack>
                  <Typography color="text.secondary" fontSize={11}>{session.ipAddress || '—'} · {t.signedIn}: {date(session.createdAt)}</Typography>
                  <Typography color="text.secondary" fontSize={11}>{t.expires}: {date(session.expiresAt)}{session.userAgent ? ` · ${session.userAgent}` : ''}</Typography>
                </Box>
                {!session.revokedAt && <Button color="error" size="small" disabled={workingId === session.id} onClick={() => void revoke(session)}>
                  {workingId === session.id ? <CircularProgress size={16} /> : t.revoke}
                </Button>}
              </Stack>
            </Paper>
          </ListItem>;
        })}
        {!sessions.length && <Typography color="text.secondary" fontSize={13} py={2}>{t.emptySessions}</Typography>}
      </List>}
      {!loading && tab === 1 && <List disablePadding>
        {history.map(event => <ListItem key={event.id} disableGutters sx={{ mb: 1 }}>
          <Paper variant="outlined" sx={{ width: '100%', p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Box>
                <Typography fontWeight={700} fontSize={13}>{event.deviceName || event.userAgent || 'Unknown device'}</Typography>
                <Typography color="text.secondary" fontSize={11}>{event.ipAddress || '—'} · {date(event.createdAt)}</Typography>
                {event.userAgent && <Typography color="text.secondary" fontSize={11}>{event.userAgent}</Typography>}
              </Box>
              <Chip size="small" color={event.result === 'SUCCESS' ? 'success' : event.result === 'LOCKED' ? 'error' : 'warning'}
                label={event.result === 'SUCCESS' ? t.success : event.result === 'LOCKED' ? t.lockedResult : t.failedResult} />
            </Stack>
          </Paper>
        </ListItem>)}
        {!history.length && <Typography color="text.secondary" fontSize={13} py={2}>{t.emptyHistory}</Typography>}
      </List>}
      <Divider sx={{ mt: 1 }} />
    </DialogContent>
    <DialogActions><Button onClick={onClose}>{t.close}</Button></DialogActions>
  </Dialog>;
}
