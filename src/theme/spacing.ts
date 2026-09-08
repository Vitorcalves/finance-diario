/** Escala de espacamento (multiplos de 4) usada em padding, margin e gap. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Raios de canto padronizados por tipo de elemento. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  pill: 999,
} as const;

/** Tamanhos de icone usados nos cabecalhos, acoes e estados vazios. */
export const iconSize = {
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  empty: 64,
} as const;
