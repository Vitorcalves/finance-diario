/** Tipos do formulario de lancamento da Home. */

export type ItemLancamento = {
  localId: string;
  produtoId: string | null;
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
};

export type TipoLancamento = 'saida' | 'entrada';

export type NovoLancamento = {
  tipo: TipoLancamento;
  descricao: string;
  data: string;
  empresaId: string | null;
  /** Valor ja com sinal: negativo para saida, positivo para entrada. */
  valor: number;
  itens: ItemLancamento[];
};
