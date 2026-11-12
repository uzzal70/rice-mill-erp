'use client';

import React, { FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  SxProps,
  Theme,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | { xs?: number; sm?: number; md?: number; lg?: number };
  gap?: number;
  sx?: SxProps<Theme>;
}

export function FormGrid({ children, columns = 2, gap = 2, sx }: FormGridProps) {
  const gridTemplateColumns =
    typeof columns === 'number'
      ? {
          xs: '1fr',
          sm: columns >= 2 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          md: `repeat(${columns}, minmax(0, 1fr))`,
        }
      : {
          xs: columns.xs ? `repeat(${columns.xs}, minmax(0, 1fr))` : '1fr',
          sm: columns.sm ? `repeat(${columns.sm}, minmax(0, 1fr))` : undefined,
          md: columns.md ? `repeat(${columns.md}, minmax(0, 1fr))` : undefined,
          lg: columns.lg ? `repeat(${columns.lg}, minmax(0, 1fr))` : undefined,
        };

  return (
    <Box
      sx={[
        {
          display: 'grid',
          gridTemplateColumns,
          gap,
          alignItems: 'start',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

export function FormSection({
  title,
  subtitle,
  children,
  sx,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          p: 2,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box mb={1.5}>
        <Typography fontSize="0.82rem" fontWeight={800} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography fontSize="0.74rem" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
  subtitle?: string;
  error?: string | null;
  onClearError?: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  submitColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  submitDisabled?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

export function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  error,
  onClearError,
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitColor = 'primary',
  submitDisabled = false,
  maxWidth = 'sm',
  extraActions,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      fullWidth
      maxWidth={maxWidth}
    >
      <Box component="form" noValidate onSubmit={onSubmit}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography fontFamily='"Manrope", "DM Sans", sans-serif' fontWeight={800} fontSize="1.05rem">
              {title}
            </Typography>
            {subtitle && (
              <Typography fontSize="0.76rem" color="text.secondary" fontWeight={500} mt={0.25}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              if (!loading) onClose();
            }}
            disabled={loading}
            aria-label="Close"
            sx={{ mt: -0.5, mr: -0.75 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert
              severity="error"
              onClose={onClearError}
              sx={{ mb: 0.5 }}
            >
              {error}
            </Alert>
          )}
          {children}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            {cancelLabel}
          </Button>
          {extraActions}
          <Button
            type="submit"
            variant="contained"
            color={submitColor}
            disabled={loading || submitDisabled}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

