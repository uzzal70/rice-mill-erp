'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { apiRequest } from '@/lib/api';
import { extractApiError, useToast } from '@/components/ui/toast-provider';
import { focusFieldByName, validateFormFields } from '@/lib/form-validation';
import { AppTextField } from '@/components/form';

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
  const toast = useToast();
  const [token, setToken] = useState('');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    if (!token) {
      setError(t.invalid);
      toast.error(t.invalid);
      return;
    }
    const validation = validateFormFields(
      [
        { name: 'password', label: t.password, value: password, required: true, minLength: 12 },
        {
          name: 'confirmation',
          label: t.confirmation,
          value: confirmation,
          required: true,
          minLength: 12,
          custom: val => (String(val) !== password ? t.mismatch : null),
        },
      ],
      language,
    );
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.summary);
      toast.warning(validation.summary);
      focusFieldByName(validation.firstField);
      return;
    }

    setBusy(true);
    setFieldErrors({});
    try {
      const result = await apiRequest<{ message: string }>('/auth/password-reset/complete', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }, false);
      setMessage(result.message);
      toast.success(result.message);
    } catch (reason) {
      const msg = extractApiError(reason, 'The password could not be updated.');
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
    <Paper elevation={0} sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 }, border: '1px solid #e2e8f0' }}>
      <Button size="small" onClick={() => setLanguage(current => {
        const next = current === 'en' ? 'bn' : 'en';
        window.localStorage.setItem('rice-mill-language', next);
        return next;
      })} sx={{ mb: 2 }}>{t.language}</Button>
      <Typography className="brand-font" variant="h4" fontWeight={800} mb={1}>{t.title}</Typography>
      <Typography color="text.secondary" fontSize={14} mb={3}>{t.subtitle}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {!message && <Box component="form" noValidate onSubmit={submit}>
        <Stack spacing={2}>
          <AppTextField
            fieldName="password"
            type="password"
            autoComplete="new-password"
            label={t.password}
            value={password}
            onValueChange={val => { setPassword(val); setFieldErrors(p => ({ ...p, password: '' })); }}
            errorText={fieldErrors.password}
            required
          />
          <AppTextField
            fieldName="confirmation"
            type="password"
            autoComplete="new-password"
            label={t.confirmation}
            value={confirmation}
            onValueChange={val => { setConfirmation(val); setFieldErrors(p => ({ ...p, confirmation: '' })); }}
            errorText={fieldErrors.confirmation}
            required
          />
          <Button type="submit" variant="contained" disabled={busy || !token} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {t.submit}
          </Button>
          {!token && <Alert severity="warning">{t.invalid}</Alert>}
        </Stack>
      </Box>}
      <Button component={Link} href="/" sx={{ mt: 2 }}>{t.back}</Button>
    </Paper>
  </Box>;
}
