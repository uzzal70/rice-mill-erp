'use client';

import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  SxProps,
  Theme,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useToast } from '@/components/ui/toast-provider';
import { focusFieldByName } from '@/lib/form-validation';
import { AppSelectOption, PrerequisiteConfig } from './types';

export interface AppSelectProps {
  name?: string;
  fieldName?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  emptyOptionLabel?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  error?: boolean;
  errorText?: string;
  helperText?: string;
  prerequisite?: PrerequisiteConfig;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export function AppSelect({
  name,
  fieldName,
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyOptionLabel,
  emptyMessage = 'No options available yet.',
  required = false,
  disabled = false,
  disabledReason,
  loading = false,
  error = false,
  errorText,
  helperText,
  prerequisite,
  fullWidth = true,
  size = 'small',
  sx,
}: AppSelectProps) {
  const toast = useToast();
  const resolvedName = fieldName ?? name;
  const lockedByPrereq = Boolean(prerequisite && !prerequisite.met);
  const isDisabled = Boolean(disabled || lockedByPrereq);
  const hasError = Boolean(errorText || error);
  const labelId = `${resolvedName || label}-label`.replace(/\s+/g, '-').toLowerCase();

  // Preserve an Edit value even while async options are still loading or if legacy record is inactive
  const hasMatchingOption = !value || options.some(o => o.value === value);
  const effectiveOptions: AppSelectOption[] = hasMatchingOption
    ? options
    : [{ value, label: loading ? 'Loading...' : value }, ...options];

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

  function handleSelectChange(event: SelectChangeEvent<string>) {
    onChange(event.target.value);
  }

  const resolvedPlaceholder = placeholder ?? (emptyOptionLabel || `Select ${label}`);

  const controlNode = (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      required={required}
      disabled={isDisabled}
      error={hasError}
      sx={[
        lockedByPrereq || (disabled && disabledReason) ? { pointerEvents: 'none' } : {},
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={labelId}
        name={name}
        label={label}
        value={value ?? ''}
        displayEmpty
        onChange={handleSelectChange}
        endAdornment={
          lockedByPrereq ? (
            <InputAdornment position="end" sx={{ mr: 2.5 }}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: '#b45309' }} />
            </InputAdornment>
          ) : loading ? (
            <InputAdornment position="end" sx={{ mr: 2.5 }}>
              <CircularProgress size={14} />
            </InputAdornment>
          ) : undefined
        }
        renderValue={selected => {
          if (!selected) {
            return (
              <Typography
                component="span"
                fontSize="0.84rem"
                color="text.disabled"
                noWrap
              >
                {emptyOptionLabel ?? resolvedPlaceholder}
              </Typography>
            );
          }
          const found = effectiveOptions.find(opt => opt.value === selected);
          return (
            <Typography component="span" fontSize="0.84rem" noWrap>
              {found ? found.label : selected}
            </Typography>
          );
        }}
        MenuProps={{
          PaperProps: {
            sx: { maxHeight: 320 },
          },
        }}
      >
        {emptyOptionLabel !== undefined && (
          <MenuItem value="">
            <Typography fontSize="0.83rem" color="text.secondary" fontStyle="italic">
              {emptyOptionLabel}
            </Typography>
          </MenuItem>
        )}

        {loading && effectiveOptions.length === 0 ? (
          <MenuItem disabled value="__loading__">
            <StackLoading />
          </MenuItem>
        ) : effectiveOptions.length === 0 ? (
          <MenuItem disabled value="__empty__">
            <Typography fontSize="0.82rem" color="text.secondary">
              {emptyMessage}
            </Typography>
          </MenuItem>
        ) : (
          effectiveOptions.map(option => {
            const isSelected = option.value === value;
            return (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography fontSize="0.84rem" fontWeight={isSelected ? 700 : 500} noWrap>
                    {option.label}
                  </Typography>
                  {option.subLabel && (
                    <Typography fontSize="0.72rem" color="text.secondary" noWrap>
                      {option.subLabel}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  {option.badge && (
                    <Chip
                      label={option.badge}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                    />
                  )}
                  {isSelected && <CheckRoundedIcon fontSize="small" color="primary" sx={{ fontSize: 16 }} />}
                </Box>
              </MenuItem>
            );
          })
        )}
      </Select>
      {resolvedHelperText && (
        <FormHelperText sx={lockedByPrereq && !hasError ? { color: '#b45309' } : undefined}>
          {resolvedHelperText}
        </FormHelperText>
      )}
    </FormControl>
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
        {controlNode}
      </Box>
    );
  }

  return (
    <Box
      data-field-name={resolvedName}
      sx={{ width: fullWidth ? '100%' : 'auto' }}
    >
      {controlNode}
    </Box>
  );
}

function StackLoading() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      <CircularProgress size={15} />
      <Typography fontSize="0.82rem" color="text.secondary">
        Loading options...
      </Typography>
    </Box>
  );
}

