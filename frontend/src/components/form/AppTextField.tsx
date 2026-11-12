'use client';

import React from 'react';
import {
  Box,
  InputAdornment,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useToast } from '@/components/ui/toast-provider';
import { focusFieldByName } from '@/lib/form-validation';
import { PrerequisiteConfig } from './types';

export type AppTextFieldProps = Omit<TextFieldProps, 'variant'> & {
  fieldName?: string;
  errorText?: string;
  prerequisite?: PrerequisiteConfig;
  disabledReason?: string;
  unit?: string;
  prefixText?: string;
  onValueChange?: (value: string) => void;
};

export function AppTextField({
  fieldName,
  name,
  error,
  errorText,
  helperText,
  prerequisite,
  disabled,
  disabledReason,
  unit,
  prefixText,
  type,
  placeholder,
  fullWidth = true,
  size = 'small',
  InputLabelProps,
  InputProps,
  onChange,
  onValueChange,
  sx,
  ...rest
}: AppTextFieldProps) {
  const toast = useToast();
  const resolvedName = fieldName ?? name;
  const lockedByPrereq = Boolean(prerequisite && !prerequisite.met);
  const isDisabled = Boolean(disabled || lockedByPrereq);
  const hasError = Boolean(errorText || error);

  const isDateLike = type === 'date' || type === 'datetime-local' || type === 'time';
  const mergedInputLabelProps = {
    ...(isDateLike || Boolean(placeholder) ? { shrink: true } : {}),
    ...InputLabelProps,
  };

  const startAdornment =
    InputProps?.startAdornment ??
    (prefixText ? (
      <InputAdornment position="start">
        <Typography fontSize="0.8rem" fontWeight={700} color="text.secondary">
          {prefixText}
        </Typography>
      </InputAdornment>
    ) : undefined);

  const endAdornment =
    InputProps?.endAdornment ??
    (lockedByPrereq ? (
      <InputAdornment position="end">
        <LockOutlinedIcon sx={{ fontSize: 16, color: '#b45309' }} />
      </InputAdornment>
    ) : unit ? (
      <InputAdornment position="end">
        <Typography
          fontSize="0.72rem"
          fontWeight={700}
          sx={{
            px: 0.75,
            py: 0.2,
            borderRadius: 1,
            bgcolor: '#f1f5f9',
            color: '#475569',
            letterSpacing: '0.02em',
          }}
        >
          {unit}
        </Typography>
      </InputAdornment>
    ) : undefined);

  const resolvedHelperText = hasError
    ? errorText || helperText
    : lockedByPrereq
    ? `🔒 ${prerequisite!.message}`
    : helperText || disabledReason;

  function handleLockedClick() {
    if (lockedByPrereq && prerequisite) {
      toast.warning(prerequisite.message);
      if (prerequisite.focusField) {
        focusFieldByName(prerequisite.focusField);
      }
      return;
    }
    if (disabled && disabledReason) {
      toast.info(disabledReason);
    }
  }

  const fieldNode = (
    <TextField
      variant="outlined"
      size={size}
      fullWidth={fullWidth}
      name={name}
      type={type}
      placeholder={placeholder}
      disabled={isDisabled}
      error={hasError}
      helperText={resolvedHelperText}
      InputLabelProps={mergedInputLabelProps}
      InputProps={{
        ...InputProps,
        startAdornment,
        endAdornment,
      }}
      FormHelperTextProps={{
        sx: lockedByPrereq && !hasError ? { color: '#b45309' } : undefined,
      }}
      onChange={e => {
        onChange?.(e);
        onValueChange?.(e.target.value);
      }}
      sx={[
        lockedByPrereq || (disabled && disabledReason) ? { pointerEvents: 'none' } : {},
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );

  if (lockedByPrereq || (disabled && disabledReason)) {
    return (
      <Box
        data-field-name={resolvedName}
        onClick={handleLockedClick}
        sx={{
          width: fullWidth ? '100%' : 'auto',
          cursor: 'not-allowed',
        }}
      >
        {fieldNode}
      </Box>
    );
  }

  return (
    <Box
      data-field-name={resolvedName}
      sx={{ width: fullWidth ? '100%' : 'auto' }}
    >
      {fieldNode}
    </Box>
  );
}

