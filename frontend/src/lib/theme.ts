import { createTheme } from '@mui/material/styles';

export type AppDesignMode = 'advanced' | 'classic';

export function createAppTheme(design: AppDesignMode = 'advanced') {
  const isClassic = design === 'classic';
  const inputRadius = isClassic ? 6 : 10;
  const dialogRadius = isClassic ? 8 : 16;
  const primaryMain = isClassic ? '#245c82' : '#1b6a4a';
  const primaryDark = isClassic ? '#163d59' : '#104c36';
  const focusRing = isClassic ? 'rgba(36, 92, 130, 0.14)' : 'rgba(27, 106, 74, 0.14)';
  const rowHover = isClassic ? 'rgba(36, 92, 130, 0.04)' : 'rgba(27, 106, 74, 0.035)';

  return createTheme({
    palette: {
      primary: { main: primaryMain, dark: primaryDark },
      background: { default: isClassic ? '#f1f2f4' : '#f5f8f5', paper: '#ffffff' },
      success: { main: '#2e7d5b' },
      warning: { main: '#c88a32' },
      error: { main: '#c62828' },
    },
    typography: {
      fontFamily: '"DM Sans", sans-serif',
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: isClassic ? 6 : 12 },
    components: {
      MuiFormControl: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.84rem',
            fontWeight: 600,
            color: '#475569',
            '&.Mui-focused': {
              color: primaryMain,
            },
            '&.Mui-error': {
              color: '#c62828',
            },
            '&.Mui-disabled': {
              color: '#64748b',
            },
          },
          asterisk: {
            color: '#dc2626',
            fontWeight: 800,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: inputRadius,
            backgroundColor: '#ffffff',
            fontSize: '0.875rem',
            transition: 'border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#cbd5e1',
              borderWidth: '1px',
              transition: 'border-color 0.16s ease, border-width 0.1s ease',
            },
            '&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: '#94a3b8',
            },
            '&.Mui-focused:not(.Mui-error)': {
              boxShadow: `0 0 0 3px ${focusRing}`,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: primaryMain,
                borderWidth: '1.5px',
              },
            },
            '&.Mui-error': {
              backgroundColor: '#fffafa',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ef4444',
                borderWidth: '1.5px',
              },
              '&.Mui-focused': {
                boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.14)',
              },
            },
            '&.Mui-disabled': {
              backgroundColor: '#f1f5f9',
              cursor: 'not-allowed',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e2e8f0',
                borderStyle: 'dashed',
              },
              '& .MuiInputBase-input': {
                WebkitTextFillColor: '#64748b',
                cursor: 'not-allowed',
              },
            },
          },
          input: {
            padding: '8.5px 12px',
            '&::placeholder': {
              color: '#94a3b8',
              opacity: 1,
            },
          },
          inputSizeSmall: {
            padding: '7.5px 11px',
            fontSize: '0.84rem',
          },
          multiline: {
            padding: '8.5px 12px',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '1.4em',
          },
          icon: {
            color: '#64748b',
            right: '8px',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: isClassic ? 6 : 12,
            marginTop: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            maxHeight: 340,
          },
          list: {
            padding: '4px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: isClassic ? 4 : 8,
            margin: '1px 0',
            fontSize: '0.84rem',
            padding: '7px 11px',
            '&:hover': {
              backgroundColor: rowHover,
            },
            '&.Mui-selected': {
              backgroundColor: isClassic ? 'rgba(36, 92, 130, 0.1)' : 'rgba(27, 106, 74, 0.1)',
              color: primaryDark,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: isClassic ? 'rgba(36, 92, 130, 0.15)' : 'rgba(27, 106, 74, 0.15)',
              },
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: isClassic ? 6 : 12,
            marginTop: '4px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          },
          listbox: {
            padding: '4px',
            maxHeight: 280,
          },
          option: {
            borderRadius: isClassic ? 4 : 8,
            fontSize: '0.84rem',
            padding: '7px 11px !important',
            margin: '1px 0',
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: '2px',
            marginRight: 0,
            marginTop: '4px',
            fontSize: '0.73rem',
            lineHeight: 1.35,
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: dialogRadius,
            border: '1px solid #e2e8f0',
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: '"Manrope", "DM Sans", sans-serif',
            fontWeight: 800,
            fontSize: '1.08rem',
            padding: '16px 24px',
            borderBottom: '1px solid #e8eee9',
            backgroundColor: '#fafcfb',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '20px 24px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '14px 24px',
            borderTop: '1px solid #e8eee9',
            backgroundColor: '#fafcfb',
            gap: '8px',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: isClassic ? 6 : 9,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: '0 4px 12px rgba(27, 106, 74, 0.2)',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: isClassic ? 6 : 10,
            fontSize: '0.835rem',
            alignItems: 'center',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            overflowX: 'auto',
            maxWidth: '100%',
            scrollbarWidth: 'thin',
          },
        },
      },
      MuiTable: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: '#f8fafc',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: '#e8eee9',
            padding: '9px 12px',
            fontSize: '12px',
            lineHeight: 1.45,
          },
          head: {
            fontWeight: 700,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: '#475569',
            backgroundColor: '#f8fafc',
            whiteSpace: 'nowrap',
            borderBottom: '2px solid #e2e8f0',
          },
          alignRight: {
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          },
          alignCenter: {
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: `${rowHover} !important`,
            },
            '&:last-child td': {
              borderBottom: 0,
            },
          },
        },
      },
    },
  });
}

export const appTheme = createAppTheme('advanced');

