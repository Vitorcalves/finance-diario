/**
 * Paleta unica do app. Nenhuma tela deve declarar cor em hexadecimal:
 * sempre consumir um token daqui para manter o padrao visual.
 */
export const colors = {
  // Marca
  primary: '#0f7a5b',
  primaryDark: '#0b3d2e',
  primaryDeep: '#123a2d',
  primarySoft: '#e6f4ed',
  primarySurface: '#f0f7f4',

  // Superficies
  background: '#f4f6f5',
  surface: '#ffffff',
  surfaceMuted: '#f9fdfb',
  surfaceAlt: '#f8fbfa',
  overlay: 'rgba(0, 0, 0, 0.35)',
  overlayStrong: 'rgba(0, 0, 0, 0.5)',

  // Bordas
  border: '#deebe4',
  borderStrong: '#d6dfdb',
  divider: '#edf2ef',

  // Texto
  text: '#0b3d2e',
  textStrong: '#0f2c23',
  textBody: '#17342b',
  textMuted: '#5b6f67',
  textSubtle: '#8ba29a',
  textInverse: '#ffffff',
  placeholder: '#8ba29a',

  // Estados
  success: '#0d8f50',
  successSoft: '#e6f4ed',
  danger: '#c0352b',
  dangerStrong: '#dc2626',
  dangerSoft: '#fee2e2',
  dangerBorder: '#fecaca',
  dangerSurface: '#fff5f5',
  warning: '#c98a05',
  info: '#1d4ed8',
  infoSoft: '#e0f2fe',
  infoBorder: '#bfdbfe',
  disabled: '#8ba29a',
} as const;

export type ColorToken = keyof typeof colors;
