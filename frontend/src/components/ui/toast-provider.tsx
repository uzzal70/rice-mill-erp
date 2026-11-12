'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, AlertColor, AlertTitle, Box, IconButton, Slide, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

export type ToastSeverity = AlertColor;

export interface ToastItem {
  id: string;
  severity: ToastSeverity;
  message: string;
  title?: string;
}

export interface ToastApi {
  notify: (severity: ToastSeverity, message: string, title?: string, durationMs?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const noop = () => undefined;
const fallbackToastApi: ToastApi = {
  notify: noop,
  success: noop,
  error: noop,
  warning: noop,
  info: noop,
  dismiss: noop,
};

const ToastContext = createContext<ToastApi>(fallbackToastApi);

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * Extracts a clean, user-friendly error message from NestJS/Prisma/Fetch/Validation errors.
 */
export function extractApiError(error: unknown, fallback = 'Operation could not be completed.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  if (error instanceof Error) {
    const raw = error.message?.trim();
    if (!raw) return fallback;
    if (raw === 'Failed to fetch' || raw.includes('NetworkError') || raw.includes('ECONNREFUSED')) {
      return 'Server connection failed. Please ensure the backend service is running and try again.';
    }
    return raw;
  }
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (Array.isArray(msg)) {
      const joined = msg.filter(Boolean).map(String).join(', ');
      return joined || fallback;
    }
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return fallback;
}

const DEFAULT_DURATIONS: Record<ToastSeverity, number> = {
  success: 4000,
  info: 4500,
  warning: 5500,
  error: 6500,
};

const TOAST_ICONS: Record<ToastSeverity, React.ReactNode> = {
  success: <CheckCircleRoundedIcon fontSize="small" />,
  error: <ErrorRoundedIcon fontSize="small" />,
  warning: <WarningAmberRoundedIcon fontSize="small" />,
  info: <InfoRoundedIcon fontSize="small" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastFiredRef = useRef<{ key: string; at: number } | null>(null);

  const dismiss = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(item => item.id !== id));
  }, []);

  const notify = useCallback(
    (severity: ToastSeverity, message: string, title?: string, durationMs?: number) => {
      const trimmed = message?.trim();
      if (!trimmed) return;

      const dedupeKey = `${severity}:${trimmed}`;
      const now = Date.now();
      if (lastFiredRef.current && lastFiredRef.current.key === dedupeKey && now - lastFiredRef.current.at < 700) {
        return;
      }
      lastFiredRef.current = { key: dedupeKey, at: now };

      const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
      const timeout = durationMs ?? DEFAULT_DURATIONS[severity];

      setToasts(prev => {
        const filtered = prev.filter(item => !(item.severity === severity && item.message === trimmed));
        const next = [...filtered, { id, severity, message: trimmed, title }];
        return next.slice(-4);
      });

      const timer = setTimeout(() => {
        dismiss(id);
      }, timeout);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      notify,
      success: (message, title) => notify('success', message, title),
      error: (message, title) => notify('error', message, title),
      warning: (message, title) => notify('warning', message, title),
      info: (message, title) => notify('info', message, title),
      dismiss,
    }),
    [notify, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Box
        role="region"
        aria-label="Notifications"
        sx={{
          position: 'fixed',
          top: { xs: 12, sm: 20 },
          right: { xs: 12, sm: 20 },
          left: { xs: 12, sm: 'auto' },
          zIndex: 1600,
          width: { xs: 'auto', sm: 410 },
          maxWidth: 'calc(100vw - 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(item => (
          <Slide key={item.id} in direction="left" mountOnEnter unmountOnExit>
            <Alert
              severity={item.severity}
              variant="filled"
              icon={TOAST_ICONS[item.severity]}
              sx={{
                pointerEvents: 'auto',
                borderRadius: 2.5,
                boxShadow: '0 14px 36px rgba(15, 23, 42, 0.22)',
                alignItems: 'flex-start',
                py: 1.15,
                px: 1.75,
                '& .MuiAlert-icon': {
                  mt: '2px',
                  opacity: 0.95,
                },
                '& .MuiAlert-message': {
                  flex: 1,
                  py: 0,
                  wordBreak: 'break-word',
                },
              }}
              action={
                <IconButton
                  size="small"
                  aria-label="Close notification"
                  color="inherit"
                  onClick={() => dismiss(item.id)}
                  sx={{ opacity: 0.82, '&:hover': { opacity: 1 } }}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              }
            >
              {item.title && (
                <AlertTitle sx={{ fontSize: '0.84rem', fontWeight: 800, mb: 0.25 }}>
                  {item.title}
                </AlertTitle>
              )}
              <Typography fontSize="0.83rem" fontWeight={500} lineHeight={1.45} color="inherit">
                {item.message}
              </Typography>
            </Alert>
          </Slide>
        ))}
      </Box>
    </ToastContext.Provider>
  );
}

