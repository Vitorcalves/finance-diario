import type { ItemInflacao } from '../../utils/inflacaoPessoal';

/** Recorte do acumulado: ultimos 6 ou 12 meses, ou todo o historico. */
export type PeriodoInflacao = '6' | '12' | 'tudo';

/** O que o grafico mostra: a variacao de cada mes ou o acumulado do periodo. */
export type ModoGrafico = 'mensal' | 'acumulado';

/** Item da cesta com os nomes prontos para a lista. */
export type ItemDaCesta = ItemInflacao & {
  /** `null` quando a variante sumiu do cadastro. */
  produtoId: string | null;
  /** Nome do produto. */
  nome: string;
  /** Marca e embalagem da variante (`Camil • 5 kg`). */
  variante: string;
};
