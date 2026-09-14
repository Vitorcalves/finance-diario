export type SerieId = 'pago' | 'historico';

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
