/**
 * Tokens do Design System Atos Bank.
 * Fonte única da verdade para cores — nenhum componente deve usar hex direto.
 * Qualquer tela nova funciona nos dois temas "de graça" se toda cor vier daqui.
 */

export type ThemeMode = 'light' | 'dark';

export interface StateToken {
  state: string;
  statusBg: string;
}

export const brand = {
  light: {
    primary: '#bf152c',
    primaryHover: '#a01024',
    primaryStrong: '#893939',
    primaryMuted: '#7A2828',
    onBrand: '#ffffff',
  },
  dark: {
    primary: '#e85a72',
    primaryHover: '#f07686',
    primaryStrong: '#bf3a4f',
    primaryMuted: '#8a2a3a',
    onBrand: '#ffffff',
  },
} as const;

export const surface = {
  light: {
    canvas: '#f9f9f9',
    soft: '#fbf9f9',
    base: '#ffffff',
    alt: '#fafafa',
    overlay: 'rgba(0,0,0,0.45)',
  },
  dark: {
    canvas: '#0a0a0a',
    soft: '#0f0f0f',
    base: '#1a1a1a',
    alt: '#212121',
    overlay: 'rgba(0,0,0,0.65)',
  },
} as const;

export const border = {
  light: {
    subtle: '#ececec',
    default: '#e0e0e0',
    strong: '#bdbdbd',
  },
  dark: {
    subtle: '#252525',
    default: '#2e2e2e',
    strong: '#3d3d3d',
  },
} as const;

export const text = {
  light: {
    primary: '#212121',
    secondary: '#555555',
    muted: '#939393',
    inverse: '#ffffff',
  },
  dark: {
    primary: '#f5f5f5',
    secondary: '#c4c4c4',
    muted: '#8a8a8a',
    inverse: '#212121',
  },
} as const;

/** Cada estado tem o par state.* (texto/ícone) + statusBg.* (fundo translúcido do badge). */
export const states: Record<'success' | 'warning' | 'error' | 'info' | 'purple', Record<ThemeMode, StateToken>> = {
  success: {
    light: { state: '#2e7d32', statusBg: 'rgba(21,163,9,0.20)' },
    dark: { state: '#66bb6a', statusBg: 'rgba(21,163,9,0.20)' },
  },
  warning: {
    light: { state: '#ff9800', statusBg: 'rgba(255,152,0,0.20)' },
    dark: { state: '#ffa726', statusBg: 'rgba(255,152,0,0.20)' },
  },
  error: {
    light: { state: '#d32f2f', statusBg: 'rgba(211,47,47,0.20)' },
    dark: { state: '#ef5350', statusBg: 'rgba(211,47,47,0.20)' },
  },
  info: {
    light: { state: '#1976d2', statusBg: 'rgba(33,150,243,0.20)' },
    dark: { state: '#42a5f5', statusBg: 'rgba(33,150,243,0.20)' },
  },
  purple: {
    light: { state: '#7b1fa2', statusBg: 'rgba(123,31,162,0.16)' },
    dark: { state: '#ba68c8', statusBg: 'rgba(123,31,162,0.16)' },
  },
};

export const menu = {
  light: {
    background: 'linear-gradient(0deg, #7A2828, #893939)',
    text: '#ffffff',
  },
  dark: {
    background: 'linear-gradient(0deg, #2a0e0e, #3a1818)',
    text: '#f5f5f5',
  },
} as const;

export const table = {
  light: {
    headerBg: '#ECEFF1',
    rowAlt: '#fafafa',
  },
  dark: {
    headerBg: '#212121',
    rowAlt: '#1f1f1f',
  },
} as const;

export const scrollbar = {
  light: { thumb: '#e5e5e5' },
  dark: { thumb: '#3a3a3a' },
} as const;

/** Tipografia — nunca caixa alta total em botões (capitalize + weight 600). */
export const typography = {
  fontFamily: "'Poppins', sans-serif",
  screenTitle: { size: 24, weight: 600 }, // h1
  modalTitle: { size: 16, weight: 600 },
  sectionLabel: { size: 14, weight: 700 }, // caixa alta, cor da marca
  tableCell: { size: 14, weight: 400 }, // 13-14px, 400-500
  fieldLabel: { size: 12, weight: 500 },
  statusBadge: { size: 12, weight: 600 },
  helperText: { size: 11, weight: 400 },
};

export const logos = {
  logo: 'https://app.atosbank.com.br/brands/atos/logo.svg',
  favicon: 'https://app.atosbank.com.br/brands/atos/favicon.ico',
};
