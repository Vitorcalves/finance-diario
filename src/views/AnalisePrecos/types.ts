import type { PrecoPorUnidade } from '../../utils/variantes';

export type SerieId = 'pago' | 'historico';

/** Preco pago ou do historico, com o valor ja reduzido a unidade base. */
export type RegistroUnitario = {
  /** Data no formato YYYY-MM-DD. */
  data: string;
  /** Preco do produto: o da embalagem ou o da medida a granel. */
  preco: number;
  /** `null` quando a variante nao tem quantidade e unidade cadastradas. */
  unitario: PrecoPorUnidade | null;
};

/**
 * Unidade base em que os precos do filtro podem ser comparados (R$/kg, R$/L,
 * R$/un), a mesma reducao usada no historico de precos.
 *
 * `semMedida`: nenhum registro tem variante com quantidade e unidade.
 * `unidadesIncompativeis`: o filtro mistura medidas de grupos diferentes
 * (ex.: uma variante em gramas e outra avulsa), entao nao ha base comum.
 */
export type UnidadeBase =
  | {
      status: 'ok';
      unidadeId: number;
      sigla: string;
      /** Registros deixados de fora por nao terem medida cadastrada. */
      semMedida: number;
    }
  | { status: 'semMedida' }
  | { status: 'unidadesIncompativeis' };

/** Um ponto do grafico: o preco medio de um dia. */
export type PontoSerie = {
  /** Data no formato YYYY-MM-DD. */
  data: string;
  valor: number;
  /** Quantos registros do dia foram reduzidos a este ponto (media). */
  registros: number;
};

export type Serie = {
  id: SerieId;
  rotulo: string;
  /** Pontos do mais antigo para o mais recente, um por dia. */
  pontos: PontoSerie[];
};

/** Limites em que as duas series sao desenhadas na mesma area. */
export type Dominio = {
  /** Timestamps (ms) do primeiro e do ultimo dia; sempre `fim > inicio`. */
  inicio: number;
  fim: number;
  /** Escala vertical ja arredondada para ticks "redondos". */
  minimo: number;
  maximo: number;
  /** Valores dos ticks do eixo vertical, do menor para o maior. */
  ticks: number[];
};

/** Ponto projetado em pixels dentro da area util do grafico. */
export type PontoProjetado = {
  x: number;
  y: number;
  ponto: PontoSerie;
};

export type ResumoPrecos = {
  /** Ultimo preco pago; `null` sem compra. */
  ultimoPago: number | null;
  /** Variacao percentual do ultimo pago contra o anterior; `null` com menos de duas compras. */
  variacaoPago: number | null;
  menorPago: number | null;
  maiorPago: number | null;
  /** Ultimo preco registrado no historico (pago ou cotado). */
  ultimoHistorico: number | null;
  compras: number;
  registros: number;
};
