export type ItemOrcamento = {
  localId: string;
  produtoId: string;
  varianteId: string;
  /** Texto pronto para exibicao: `Produto - Marca • medida`. */
  descricao: string;
  quantidade: number;
  preco: number;
};

/** Campos preenchidos no mini formulario de item. */
export type DadosItemOrcamento = {
  produtoId: string;
  varianteId: string;
  quantidade: number;
  preco: number;
};

export type ComparativoMercado = {
  empresaId: string;
  nome: string;
  total: number;
  itensComPreco: number;
  /** `true` quando o mercado tem preco para todos os itens do orcamento. */
  completo: boolean;
  /** `true` no mercado escolhido na tela, que usa os precos digitados agora. */
  mercadoDoOrcamento: boolean;
};
