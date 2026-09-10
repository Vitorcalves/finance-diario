import type { PrecoPorUnidade } from '../../utils/variantes';

export type ItemOrcamento = {
  localId: string;
  produtoId: string;
  varianteId: string;
  /** Texto pronto para exibicao: `Produto - Marca • medida`. */
  descricao: string;
  quantidade: number;
  preco: number;
};

export type ItemComUnitario = {
  item: ItemOrcamento;
  /** `null` quando a variante nao tem quantidade e unidade cadastradas. */
  unitario: PrecoPorUnidade | null;
};

export type ItemComparado = ItemComUnitario & {
  /** `true` quando e o mais barato por unidade dentro do grupo do produto. */
  maisBarato: boolean;
};

/**
 * Comparacao, dentro do orcamento atual, entre variantes de um mesmo produto
 * (ex.: leite de 500 ml x leite de 1 L) pelo preco por unidade primaria.
 */
export type ComparativoProduto = {
  produtoId: string;
  nomeProduto: string;
  itens: ItemComparado[];
  /** `true` quando todo item do grupo tem medida e reduz a mesma unidade primaria. */
  comparavel: boolean;
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
