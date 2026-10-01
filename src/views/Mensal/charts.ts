import type { ViewStyle } from 'react-native';

/** Altura util dos dois graficos, em pixels. */
export const ALTURA_ACUMULADO = 150;
export const ALTURA_POR_DIA = 96;

/** Altura minima de uma barra com valor, para um gasto pequeno nao sumir. */
const BARRA_MINIMA = 3;

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

/** Altura do valor no grafico, a partir da base, sem passar do topo. */
export const alturaProporcional = (valor: number, maximo: number, altura: number): number =>
  maximo > 0 ? Math.max(0, Math.min(altura, (valor / maximo) * altura)) : 0;

export type PontoGrafico = { x: number; y: number };

const fmt = (valor: number): string => valor.toFixed(1);

/**
 * Curva suave que passa por todos os pontos sem "ultrapassar" nenhum deles
 * (interpolacao cubica monotona, a mesma do `curveMonotoneX` do d3). Para o
 * gasto acumulado isso importa: a curva nunca desce entre dois dias.
 */
export const caminhoSuave = (pontos: PontoGrafico[]): string => {
  if (pontos.length === 0) {
    return '';
  }

  const [primeiro] = pontos;

  if (pontos.length === 1) {
    return `M${fmt(primeiro.x)} ${fmt(primeiro.y)}`;
  }

  const total = pontos.length;
  const inclinacoes: number[] = [];

  for (let i = 0; i < total - 1; i++) {
    const dx = pontos[i + 1].x - pontos[i].x;
    inclinacoes.push(dx === 0 ? 0 : (pontos[i + 1].y - pontos[i].y) / dx);
  }

  const tangentes = pontos.map((_, i) => {
    if (i === 0) {
      return inclinacoes[0];
    }

    if (i === total - 1) {
      return inclinacoes[total - 2];
    }

    const antes = inclinacoes[i - 1];
    const depois = inclinacoes[i];
    return antes * depois <= 0 ? 0 : (antes + depois) / 2;
  });

  // Ajuste de Fritsch-Carlson: limita as tangentes para manter a monotonia.
  for (let i = 0; i < total - 1; i++) {
    if (inclinacoes[i] === 0) {
      tangentes[i] = 0;
      tangentes[i + 1] = 0;
      continue;
    }

    const a = tangentes[i] / inclinacoes[i];
    const b = tangentes[i + 1] / inclinacoes[i];
    const soma = a * a + b * b;

    if (soma > 9) {
      const fator = 3 / Math.sqrt(soma);
      tangentes[i] = fator * a * inclinacoes[i];
      tangentes[i + 1] = fator * b * inclinacoes[i];
    }
  }

  let caminho = `M${fmt(primeiro.x)} ${fmt(primeiro.y)}`;

  for (let i = 0; i < total - 1; i++) {
    const atual = pontos[i];
    const proximo = pontos[i + 1];
    const terco = (proximo.x - atual.x) / 3;

    caminho +=
      ` C${fmt(atual.x + terco)} ${fmt(atual.y + tangentes[i] * terco)}` +
      ` ${fmt(proximo.x - terco)} ${fmt(proximo.y - tangentes[i + 1] * terco)}` +
      ` ${fmt(proximo.x)} ${fmt(proximo.y)}`;
  }

  return caminho;
};

/** A mesma curva fechada ate a linha de base, para preencher a area abaixo dela. */
export const caminhoArea = (pontos: PontoGrafico[], base: number): string => {
  if (pontos.length < 2) {
    return '';
  }

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  return `${caminhoSuave(pontos)} L${fmt(ultimo.x)} ${fmt(base)} L${fmt(primeiro.x)} ${fmt(base)} Z`;
};
