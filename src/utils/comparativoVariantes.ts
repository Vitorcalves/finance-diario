import type { PrecoPorUnidade } from './variantes';

/** Um item com o preco reduzido a unidade primaria (`null` sem medida cadastrada). */
export type ComUnitario<T> = {
  item: T;
  unitario: PrecoPorUnidade | null;
};

export type GrupoVariantes<T> = {
  produtoId: string;
  itens: (ComUnitario<T> & {
    /** `true` quando e o mais barato por unidade dentro do grupo do produto. */
    maisBarato: boolean;
  })[];
  /** `true` quando todo item do grupo tem medida e reduz a mesma unidade primaria. */
  comparavel: boolean;
};

/**
 * Agrupa por produto os itens com mais de uma embalagem e aponta a mais
 * barata por unidade primaria: o preco pago sozinho nao diz nada quando as
 * embalagens tem tamanhos diferentes (leite de 500 ml x leite de 1 L).
 *
 * Usado pelo orcamento e pela lista de compras.
 */
export const agruparVariantesPorProduto = <T>(
  entradas: ComUnitario<T>[],
  produtoDe: (item: T) => string,
): GrupoVariantes<T>[] => {
  const porProduto = new Map<string, ComUnitario<T>[]>();

  for (const entrada of entradas) {
    const produtoId = produtoDe(entrada.item);
    const grupo = porProduto.get(produtoId) ?? [];
    grupo.push(entrada);
    porProduto.set(produtoId, grupo);
  }

  const resultado: GrupoVariantes<T>[] = [];

  for (const [produtoId, doProduto] of porProduto) {
    if (doProduto.length < 2) {
      continue;
    }

    const comMedida = doProduto.filter(
      (entrada): entrada is ComUnitario<T> & { unitario: PrecoPorUnidade } =>
        entrada.unitario !== null,
    );
    const unidadeBase = comMedida[0]?.unitario.unidadeId ?? null;
    const comparavel =
      comMedida.length === doProduto.length &&
      unidadeBase !== null &&
      comMedida.every((entrada) => entrada.unitario.unidadeId === unidadeBase);

    const menor = comparavel
      ? Math.min(...comMedida.map((entrada) => entrada.unitario.valor))
      : null;

    resultado.push({
      produtoId,
      comparavel,
      itens: doProduto.map((entrada) => ({
        ...entrada,
        maisBarato: comparavel && entrada.unitario !== null && entrada.unitario.valor === menor,
      })),
    });
  }

  return resultado;
};
