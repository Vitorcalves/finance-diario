/** Tipos do formulario de lancamento da Home. */

/**
 * Item que veio da nota fiscal (QR Code do cupom): o que a nota dizia dele.
 * Ao salvar ligado a um produto, vira o de-para da empresa para a proxima nota.
 */
export type ItemDaNota = {
  /** Codigo do item na nota (o do cadastro da loja); `null` quando nao veio. */
  codigo: string | null;
  /** Descricao como veio na nota. */
  descricao: string;
  /** Unidade da nota (`KG`, `UN`...): em peso ou volume a quantidade tem casas decimais. */
  unidade: string;
};

export type ItemLancamento = {
  localId: string;
  produtoId: string | null;
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  /** So no item lido da nota fiscal. */
  itemNota?: ItemDaNota | null;
};

export type TipoLancamento = 'saida' | 'entrada' | 'transferencia';

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
  /** Categoria do lancamento; `null` = sem categoria. */
  categoriaId: string | null;
  /** Valor ja com sinal: negativo para saida, positivo para entrada. */
  valor: number;
  itens: ItemLancamento[];
  /** Quando informado, o valor vira um plano e o caixa recebe as parcelas. */
  parcelamento?: ParcelamentoLancamento | null;
  /**
   * Conta do lancamento (origem, na transferencia). `null`/ausente usa a
   * caixa padrao; conta cartao significa compra que cai na fatura do ciclo.
   */
  contaId?: string | null;
  /** So transferencia: conta de destino do valor. */
  contaDestinoId?: string | null;
  /** Tags de evento ("Viagem julho"); a transferencia nao leva tags. */
  tagIds?: string[];
  /** Chave da NFC-e quando o lancamento veio do QR Code do cupom. */
  chaveNfce?: string | null;
};

/**
 * Lancamento pre-preenchido por outra tela (ex.: a lista de compras ao
 * finalizar): o formulario abre com estes dados para o usuario so conferir.
 */
export type RascunhoLancamento = {
  /** Ausente = saida. */
  tipo?: Exclude<TipoLancamento, 'transferencia'>;
  descricao?: string;
  /** Valor sem sinal; ignorado quando ha itens (o total vem deles). */
  valor?: number;
  /** YYYY-MM-DD; ausente = hoje. */
  data?: string;
  /** Ausente/`null` = a caixa padrao do formulario. */
  contaId?: string | null;
  /** Quantidade de parcelas (2 ou mais) de uma saida parcelada. */
  parcelas?: number;
  empresaId?: string | null;
  categoriaId?: string | null;
  itens?: Omit<ItemLancamento, 'localId'>[];
  /** Chave da NFC-e lida pelo QR Code; vai junto para o lancamento gravado. */
  chaveNfce?: string | null;
  /** O que nao fechou na leitura da nota, mostrado no topo do formulario para conferir. */
  avisos?: string[];
};
