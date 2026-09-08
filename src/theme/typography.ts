import type { TextStyle } from 'react-native';
import { colors } from './colors';

export const fontSize = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 14,
  input: 15,
  subtitle: 16,
  section: 18,
  title: 22,
  display: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Estilos de texto reutilizaveis. Combine com cores de estado quando necessario. */
export const typography = {
  display: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.primaryDark,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  section: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.bold,
    color: colors.primaryDeep,
  },
  cardTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.primaryDark,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  small: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  caption: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  micro: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
} as const satisfies Record<string, TextStyle>;
