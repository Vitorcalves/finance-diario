import type { ViewStyle } from 'react-native';

/** Altura util dos dois graficos, em pixels. */
export const ALTURA_ACUMULADO = 140;
export const ALTURA_POR_DIA = 96;

/** Altura minima de uma barra com valor, para um gasto pequeno nao sumir. */
const BARRA_MINIMA = 3;

/** Quantidade de tracos que formam a linha pontilhada de referencia. */
export const TRACOS_REFERENCIA = 26;

/**
 * Estilos dependentes dos dados ficam em funcoes, fora do JSX
 * (regra `react-native/no-inline-styles`).
 */
export const alturaBarra = (valor: number, maximo: number, altura: number): ViewStyle => {
  if (valor <= 0) {
    return { height: 0 };
  }

  const proporcao = maximo > 0 ? valor / maximo : 0;

  return { height: Math.max(BARRA_MINIMA, proporcao * altura) };
};

export const posicaoLinha = (valor: number, maximo: number, altura: number): ViewStyle => ({
  bottom: maximo > 0 ? Math.min(altura, (valor / maximo) * altura) : 0,
});
