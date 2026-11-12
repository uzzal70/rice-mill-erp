'use client';

import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useToast } from '@/components/ui/toast-provider';
import { focusFieldByName } from '@/lib/form-validation';
import { AppSelectOption, PrerequisiteConfig } from './types';

export interface AppAutocompleteProps {
  name?: string;
  fieldName?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
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
  clearable?: boolean;
  sx?: SxProps<Theme>;
}

export function AppAutocomplete({
  name,
  fieldName,
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = 'No matching options found.',
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
  clearable = true,
  sx,
}: AppAutocompleteProps) {
  const toast = useToast();
  const resolvedName = fieldName ?? name;
  const lockedByPrereq = Boolean(prerequisite && !prerequisite.met);
  const isDisabled = Boolean(disabled || lockedByPrereq);
  const hasError = Boolean(errorText || error);

  const selectedOption =
    options.find(opt => opt.value === value) ??
    (value ? { value, label: loading ? 'Loading...' : value } : null);

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

  const autoNode = (
    <Autocomplete<AppSelectOption, false, boolean, false>
      size={size}
      fullWidth={fullWidth}
      disabled={isDisabled}
      loading={loading}
      disableClearable={!clearable}
      options={options}
      value={selectedOption}
      noOptionsText={emptyMessage}
      getOptionLabel={option => option.label}
      getOptionDisabled={option => Boolean(option.disabled)}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      onChange={(_event, newValue) => {
        onChange(newValue ? newValue.value : '');
      }}
      filterOptions={(opts, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return opts;
        return opts.filter(
          o =>
            o.label.toLowerCase().includes(query) ||
            (o.subLabel && o.subLabel.toLowerCase().includes(query)) ||
            (o.badge && o.badge.toLowerCase().includes(query)),
        );
      }}
      renderOption={(props, option) => {
        const { key, ...liProps } = props;
        return (
          <Box
            component="li"
            key={option.value || key}
            {...liProps}
            sx={{
              display: 'flex !important',
              alignItems: 'center',
              justifyContent: 'space-between !important',
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontSize="0.84rem" fontWeight={500} noWrap>
                {option.label}
              </Typography>
              {option.subLabel && (
                <Typography fontSize="0.72rem" color="text.secondary" noWrap>
                  {option.subLabel}
                </Typography>
              )}
            </Box>
            {option.badge && (
              <Chip
                label={option.badge}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}
              />
            )}
          </Box>
        );
      }}
      renderInput={params => (
        <TextField
          {...params}
          name={name}
          label={label}
          required={required}
          error={hasError}
          helperText={resolvedHelperText}
          placeholder={placeholder ?? `Search ${label}...`}
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
          FormHelperTextProps={{
            sx: lockedByPrereq && !hasError ? { color: '#b45309' } : undefined,
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {lockedByPrereq ? (
                  <InputAdornment position="end" sx={{ mr: 0.5 }}>
                    <LockOutlinedIcon sx={{ fontSize: 16, color: '#b45309' }} />
                  </InputAdornment>
                ) : loading ? (
                  <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                ) : null}
                {!lockedByPrereq && params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={[
        lockedByPrereq || (disabled && disabledReason) ? { pointerEvents: 'none' } : {},
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
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
        {autoNode}
      </Box>
    );
  }

  return (
    <Box
      data-field-name={resolvedName}
      sx={{ width: fullWidth ? '100%' : 'auto' }}
    >
      {autoNode}
    </Box>
  );
}

