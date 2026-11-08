'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { apiRequest } from '@/lib/api';

const copy = {
  en: {
    title: 'Reset password', subtitle: 'Choose a new password with at least 12 characters.',
    password: 'New password', confirmation: 'Confirm password', mismatch: 'The passwords do not match.',
    submit: 'Update password', back: 'Back to sign in', invalid: 'The reset link is missing or invalid.',
    language: 'বাংলা',
  },
  bn: {
    title: 'পাসওয়ার্ড রিসেট', subtitle: 'কমপক্ষে ১২ অক্ষরের নতুন পাসওয়ার্ড দিন।',
    password: 'নতুন পাসওয়ার্ড', confirmation: 'পাসওয়ার্ড নিশ্চিত করুন', mismatch: 'পাসওয়ার্ড দুটি মেলেনি।',
    submit: 'পাসওয়ার্ড আপডেট', back: 'সাইন-ইনে ফিরুন', invalid: 'রিসেট লিংক অনুপস্থিত বা অবৈধ।',
    language: 'English',
  },
} as const;

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    setLanguage(window.localStorage.getItem('rice-mill-language') === 'bn' ? 'bn' : 'en');
  }, []);
  const t = copy[language];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmation) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/password-reset/complete', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }, false);
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The password could not be updated.');
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {!message && <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <TextField type="password" autoComplete="new-password" label={t.password} value={password}
            onChange={event => setPassword(event.target.value)} inputProps={{ minLength: 12 }} required fullWidth />
          <TextField type="password" autoComplete="new-password" label={t.confirmation} value={confirmation}
            onChange={event => setConfirmation(event.target.value)} inputProps={{ minLength: 12 }} required fullWidth />
          <Button type="submit" variant="contained" disabled={busy || !token || password.length < 12 || confirmation.length < 12}>
            {busy ? <CircularProgress size={18} color="inherit" /> : t.submit}
          </Button>
          {!token && <Alert severity="warning">{t.invalid}</Alert>}
        </Stack>
      </Box>}
      <Button component={Link} href="/" sx={{ mt: 2 }}>{t.back}</Button>
    </Paper>
  </Box>;
}
