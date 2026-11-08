'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { apiRequest } from '@/lib/api';

const copy = {
  en: {
    title: 'Email verification', subtitle: 'Confirm the email address linked to your account.',
    verifying: 'Verifying…', verify: 'Verify email', back: 'Back to sign in',
    invalid: 'The verification link is missing or invalid.', failed: 'Email verification could not be completed.',
    language: 'বাংলা',
  },
  bn: {
    title: 'ইমেইল যাচাই', subtitle: 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা নিশ্চিত করুন।',
    verifying: 'যাচাই হচ্ছে…', verify: 'ইমেইল যাচাই করুন', back: 'সাইন-ইনে ফিরুন',
    invalid: 'যাচাই লিংক অনুপস্থিত বা অবৈধ।', failed: 'ইমেইল যাচাই সম্পন্ন করা যায়নি।',
    language: 'English',
  },
} as const;

export default function VerifyEmailPage() {
  const [token, setToken] = useState('');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    setLanguage(window.localStorage.getItem('rice-mill-language') === 'bn' ? 'bn' : 'en');
  }, []);
  const t = copy[language];

  async function verify() {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ message: string }>('/auth/email-verification/complete', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }, false);
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setBusy(false);
    }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
    <Paper elevation={0} sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 } }}>
      <Button size="small" onClick={() => setLanguage(current => {
        const next = current === 'en' ? 'bn' : 'en';
        window.localStorage.setItem('rice-mill-language', next);
        return next;
      })} sx={{ mb: 2 }}>{t.language}</Button>
      <Typography className="brand-font" variant="h4" fontWeight={800} mb={1}>{t.title}</Typography>
      <Typography color="text.secondary" fontSize={14} mb={3}>{t.subtitle}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {!message && token && <Button variant="contained" disabled={busy} onClick={() => void verify()}>
        {busy ? <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} color="inherit" />{t.verifying}</Stack> : t.verify}
      </Button>}
      {!token && <Alert severity="warning">{t.invalid}</Alert>}
      <Button component={Link} href="/" sx={{ mt: 2 }}>{t.back}</Button>
    </Paper>
  </Box>;
}
