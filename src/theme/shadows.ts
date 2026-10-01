import type { ViewStyle } from 'react-native';

/**
 * Elevacoes padronizadas: cartoes usam `card`, sobreposicoes usam `floating`.
 * A sombra substitui a borda de 1px nos cartoes; no modo escuro ela some e o
 * contraste entre `surface` e `background` faz o mesmo papel.
 */
export const shadows = {
  card: {
    shadowColor: '#0b2a20',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const satisfies Record<string, ViewStyle>;
