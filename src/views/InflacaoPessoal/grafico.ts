/**
 * Funcoes puras do grafico e dos textos da inflacao pessoal: escala do eixo,
 * rotulos de mes, formato dos percentuais e o desenho das barras.
 */

/** Altura util da area de desenho, em pixels. */
export const ALTURA_GRAFICO = 170;

/** Margens da area util: espaco para os rotulos dos eixos. */
export const MARGEM = { topo: 12, direita: 8, base: 24, esquerda: 46 } as const;

/** Quantidade alvo de marcas no eixo vertical. */
const MARCAS_Y = 4;

/** Folga para o ponto flutuante nao criar uma marca a mais (0,3 / 0,1 = 2,9999...). */
const FOLGA = 1e-9;

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const MESES_LONGOS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const numeroDoMes = (mes: string): number => Number(mes.slice(5, 7)) - 1;

/** `2026-10` vira `out/26`; sem o ano, so `out`. */
export const rotuloMes = (mes: string, comAno = true): string => {
  const curto = MESES_CURTOS[numeroDoMes(mes)] ?? mes;
  return comAno ? `${curto}/${mes.slice(2, 4)}` : curto;
};

/** `2026-10` vira `Outubro de 2026`. */
export const nomeDoMes = (mes: string): string =>
  `${MESES_LONGOS[numeroDoMes(mes)] ?? mes} de ${mes.slice(0, 4)}`;

/** Janeiro abre um ano novo: o rotulo dele leva o ano para o eixo nao ficar ambiguo. */
export const ehJaneiro = (mes: string): boolean => numeroDoMes(mes) === 0;

const formatadorVariacao = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatadorPontos = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const comSinal = (valor: number, casas: number, formatador: Intl.NumberFormat): string | null => {
  const escala = Math.pow(10, casas);
  const arredondado = Math.round(valor * escala) / escala;

  // Zero (ou quase) sai sem sinal: `+0,0%` sugere uma alta que nao houve.
  if (arredondado === 0) {
    return null;
  }

  return `${arredondado > 0 ? '+' : '-'}${formatador.format(Math.abs(arredondado))}`;
};

/** Ex.: `+8,4%`, `-0,3%` ou `0%`. */
export const formatarVariacao = (valor: number): string =>
  `${comSinal(valor, 1, formatadorVariacao) ?? '0'}%`;

/** Ex.: `+0,85 p.p.` (pontos percentuais). */
export const formatarPontos = (valor: number): string =>
  `${comSinal(valor, 2, formatadorPontos) ?? '0'} p.p.`;

/** Fatia da cesta (0 a 1) como percentual inteiro: `25%`; abaixo de 1% vira `<1%`. */
export const formatarFatia = (fatia: number): string => {
  const percentual = fatia * 100;

  return percentual > 0 && percentual < 1 ? '<1%' : `${Math.round(percentual)}%`;
};

/** Media por mes que, composta, da o acumulado do periodo (em %). */
export const mediaMensal = (acumulado: number, meses: number): number => {
  if (meses <= 0) {
    return 0;
  }

  const fator = 1 + acumulado / 100;

  return fator > 0 ? (Math.pow(fator, 1 / meses) - 1) * 100 : acumulado / meses;
};

/** Passo "redondo" (1, 2, 5 x 10^n) para dividir um intervalo em ~`alvo` marcas. */
const passoRedondo = (intervalo: number, alvo: number): number => {
  const bruto = intervalo / alvo;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  const normalizado = bruto / magnitude;

  if (normalizado <= 1) {
    return magnitude;
  }

  if (normalizado <= 2) {
    return 2 * magnitude;
  }

  if (normalizado <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
};

export type EscalaVariacao = {
  minimo: number;
  maximo: number;
  passo: number;
  /** Valores das marcas do eixo vertical, do menor para o maior; o zero sempre esta. */
  marcas: number[];
};

/**
 * Eixo vertical dos percentuais. O zero entra sempre, porque e contra ele que
 * se le "subiu" ou "caiu", e os limites caem em marcas redondas.
 */
export const escalaVariacao = (valores: number[]): EscalaVariacao => {
  const finitos = valores.filter((valor) => Number.isFinite(valor));
  const menor = Math.min(0, ...finitos);
  const maior = Math.max(0, ...finitos);

  // Tudo zero (ou vazio): abre um ponto para o eixo existir.
  if (maior - menor < FOLGA) {
    return { minimo: 0, maximo: 1, passo: 0.5, marcas: [0, 0.5, 1] };
  }

  const passo = passoRedondo(maior - menor, MARCAS_Y);
  const primeira = Math.floor(menor / passo + FOLGA);
  const ultima = Math.ceil(maior / passo - FOLGA);
  const marcas: number[] = [];

  for (let indice = primeira; indice <= ultima; indice += 1) {
    marcas.push(Number((indice * passo).toFixed(6)));
  }

  return { minimo: marcas[0], maximo: marcas[marcas.length - 1], passo, marcas };
};

const formatadoresMarca = [0, 1, 2].map(
  (casas) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }),
);

/** Rotulo de uma marca do eixo, com as casas que o passo pede (`2%`, `0,5%`, `0,05%`). */
export const rotuloMarca = (valor: number, passo: number): string => {
  const casas = passo >= 1 ? 0 : passo >= 0.1 ? 1 : 2;
  return `${formatadoresMarca[casas].format(valor)}%`;
};

/** Posicao vertical (px) de um valor dentro da area util. */
export const posicaoY = (valor: number, escala: EscalaVariacao, altura: number): number =>
  altura - ((valor - escala.minimo) / (escala.maximo - escala.minimo)) * altura;

/**
 * Indices das colunas que recebem rotulo no eixo horizontal: no maximo
 * `maximo`, de tantos em tantos meses e contados a partir da ultima - o mes
 * mais recente sempre tem rotulo e o espaco entre eles e sempre o mesmo.
 */
export const marcasEixoMeses = (total: number, maximo: number): number[] => {
  const passo = Math.max(1, Math.ceil(total / Math.max(1, maximo)));
  const indices: number[] = [];

  for (let indice = total - 1; indice >= 0; indice -= passo) {
    indices.unshift(indice);
  }

  return indices;
};

const fmt = (valor: number): string => valor.toFixed(1);

/**
 * Barra que sai da linha do zero (`yBase`) ate o valor (`yValor`), para cima
 * ou para baixo. So a ponta do valor e arredondada: a base reta deixa claro de
 * onde a barra parte.
 */
export const caminhoBarra = (
  x: number,
  largura: number,
  yBase: number,
  yValor: number,
  raio: number,
): string => {
  const canto = Math.max(0, Math.min(raio, largura / 2, Math.abs(yValor - yBase)));
  // Sentido em que a barra "volta" da ponta para a base.
  const volta = yValor < yBase ? canto : -canto;
  const direita = x + largura;

  return (
    `M${fmt(x)} ${fmt(yBase)}` +
    ` L${fmt(x)} ${fmt(yValor + volta)}` +
    ` Q${fmt(x)} ${fmt(yValor)} ${fmt(x + canto)} ${fmt(yValor)}` +
    ` L${fmt(direita - canto)} ${fmt(yValor)}` +
    ` Q${fmt(direita)} ${fmt(yValor)} ${fmt(direita)} ${fmt(yValor + volta)}` +
    ` L${fmt(direita)} ${fmt(yBase)} Z`
  );
};

/** Indice da coluna mais proxima, na horizontal, de `x`; `null` sem colunas. */
export const colunaMaisProxima = (posicoes: number[], x: number): number | null => {
  if (posicoes.length === 0) {
    return null;
  }

  let melhor = 0;

  for (let indice = 1; indice < posicoes.length; indice += 1) {
    if (Math.abs(posicoes[indice] - x) < Math.abs(posicoes[melhor] - x)) {
      melhor = indice;
    }
  }

  return melhor;
};
