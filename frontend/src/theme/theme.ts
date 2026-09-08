import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import { brand, surface, border, text, table, scrollbar, typography, type ThemeMode } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    surfaceAlt: Palette['background'];
    borderColors: {
      subtle: string;
      default: string;
      strong: string;
    };
  }
  interface PaletteOptions {
    surfaceAlt?: PaletteOptions['background'];
    borderColors?: {
      subtle: string;
      default: string;
      strong: string;
    };
  }
}

export function buildTheme(mode: ThemeMode) {
  const b = brand[mode];
  const s = surface[mode];
  const bd = border[mode];
  const t = text[mode];
  const tb = table[mode];
  const sc = scrollbar[mode];

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: b.primary,
        dark: b.primaryHover,
        contrastText: b.onBrand,
      },
      background: {
        default: s.canvas,
        paper: s.base,
      },
      surfaceAlt: {
        default: s.alt,
      },
      borderColors: {
        subtle: bd.subtle,
        default: bd.default,
        strong: bd.strong,
      },
      text: {
        primary: t.primary,
        secondary: t.secondary,
        disabled: t.muted,
      },
      success: { main: mode === 'light' ? '#2e7d32' : '#66bb6a' },
      warning: { main: mode === 'light' ? '#ff9800' : '#ffa726' },
      error: { main: mode === 'light' ? '#d32f2f' : '#ef5350' },
      info: { main: mode === 'light' ? '#1976d2' : '#42a5f5' },
    },
    typography: {
      fontFamily: typography.fontFamily,
      h1: { fontSize: typography.screenTitle.size, fontWeight: typography.screenTitle.weight },
      h6: { fontSize: typography.modalTitle.size, fontWeight: typography.modalTitle.weight },
      body1: { fontSize: typography.tableCell.size, fontWeight: typography.tableCell.weight },
      body2: { fontSize: typography.fieldLabel.size, fontWeight: typography.fieldLabel.weight },
      caption: { fontSize: typography.helperText.size, fontWeight: typography.helperText.weight },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: s.canvas,
          },
          // Scrollbar de acordo com o token
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: sc.thumb,
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'capitalize',
            fontWeight: 600,
            borderRadius: 8,
          },
          containedPrimary: {
            backgroundColor: b.primary,
            '&:hover': { backgroundColor: b.primaryHover },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${bd.subtle}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: bd.default,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: tb.headerBg,
            fontWeight: 600,
            fontSize: typography.fieldLabel.size,
          },
          root: {
            fontSize: typography.tableCell.size,
            borderColor: bd.subtle,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(even)': {
              backgroundColor: tb.rowAlt,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: typography.statusBadge.weight,
            fontSize: typography.statusBadge.size,
          },
        },
      },
    },
  };

  return createTheme(options);
}
