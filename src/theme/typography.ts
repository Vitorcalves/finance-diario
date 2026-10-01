import type { TextStyle } from 'react-native';
import type { Paleta } from './colors';

export const fontSize = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 14,
  input: 15,
  subtitle: 16,
  section: 18,
  title: 24,
  display: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Familias da Inter carregadas no boot (`App.tsx`). Cada peso e um arquivo
 * proprio: no Android `fontWeight` nao escolhe o arquivo, por isso o `Text`
 * do app troca o peso pela familia certa.
 */
export const fontes = {
  regular: 'Inter_400Regular',
  medium: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
} as const;

/** Familia da Inter que corresponde ao peso pedido no estilo. */
export const familiaPorPeso = (peso: TextStyle['fontWeight']): string => {
  switch (peso) {
    case '500':
    case '600':
    case 'medium':
    case 'semibold':
      return fontes.medium;
    case '700':
    case 'bold':
      return fontes.bold;
    case '800':
    case '900':
    case 'heavy':
    case 'black':
      return fontes.heavy;
    default:
      return fontes.regular;
  }
};

type ChaveTipografia =
  | 'display'
  | 'title'
  | 'section'
  | 'cardTitle'
  | 'label'
  | 'body'
  | 'small'
  | 'caption'
  | 'micro';

export type Tipografia = Record<ChaveTipografia, TextStyle>;

/** Estilos de texto reutilizaveis. Combine com cores de estado quando necessario. */
export const criarTipografia = (colors: Paleta): Tipografia => ({
  display: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
    letterSpacing: -0.5,
  },
  section: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.body,
    color: colors.text,
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
});
