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

/** Parcelamento escolhido no formulario; ausente no lancamento a vista. */
export type ParcelamentoLancamento = {
  /** Quantidade de parcelas mensais. */
  parcelas: number;
  /** Vencimento da 1a parcela, que pode ser depois da data da compra. */
  primeiraParcela: string;
};

export type NovoLancamento = {
  tipo: TipoLancamento;
  descricao: string;
  data: string;
  empresaId: string | null;
  /** Valor ja com sinal: negativo para saida, positivo para entrada. */
  valor: number;
  itens: ItemLancamento[];
  /** Quando informado, o valor vira um plano e o caixa recebe as parcelas. */
  parcelamento?: ParcelamentoLancamento | null;
};
