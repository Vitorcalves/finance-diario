/** Preco de um item da lista anotado num mercado. */
export type PrecoAnotado = {
  itemId: string;
  empresaId: string;
  preco: number;
};

export type ItemDaComparacao = {
  id: string;
  quantidade: number;
};

export type ResumoMercadoLista = {
  empresaId: string;
  /** Soma de preco x quantidade de tudo que tem preco neste mercado. */
  total: number;
  itensComPreco: number;
  /** Soma so dos itens com preco em todos os mercados: a comparacao justa. */
  totalEmComum: number;
  /** Menor total nos itens em comum (empate de todos nao destaca ninguem). */
  maisBarato: boolean;
};

export type MenorPrecoItem = {
  preco: number;
  /** Mercados com esse preco (mais de um no empate). */
  mercados: string[];
  /** Em quantos mercados o item tem preco anotado. */
  cotacoes: number;
};

export type ComparativoLista = {
  /** Na ordem recebida. */
  mercados: ResumoMercadoLista[];
  /** Itens com preco em todos os mercados (so conta com 2 mercados ou mais). */
  itensEmComum: number;
  menorPorItem: Map<string, MenorPrecoItem>;
  /** Quanto o mais barato sai a menos que o segundo, nos itens em comum. */
  vantagem: { empresaId: string; sobre: string; valor: number } | null;
  /**
   * Comprar cada item em comum onde e mais barato, quando isso sai menos que
   * fazer tudo no mercado mais barato.
   */
  dividindo: { total: number; economia: number; mercados: number } | null;
};

/** Diferencas abaixo de meio centavo sao arredondamento, nao economia. */
const CENTAVO = 0.005;

/**
 * Compara os precos anotados na lista entre os mercados visitados. Os totais
 * completos variam com quantos itens cada mercado tem anotados, por isso o
 * "mais barato" sai da soma dos itens que tem preco em todos eles.
 */
export const compararLista = (
  itens: ItemDaComparacao[],
  mercados: string[],
  precos: PrecoAnotado[],
): ComparativoLista => {
  const idsMercados = new Set(mercados);
  const idsItens = new Set(itens.map((item) => item.id));
  const porItem = new Map<string, Map<string, number>>();

  for (const anotado of precos) {
    if (!idsMercados.has(anotado.empresaId) || !idsItens.has(anotado.itemId)) {
      continue;
    }

    const doItem = porItem.get(anotado.itemId) ?? new Map<string, number>();
    doItem.set(anotado.empresaId, anotado.preco);
    porItem.set(anotado.itemId, doItem);
  }

  const emComum =
    mercados.length >= 2
      ? itens.filter((item) => mercados.every((mercado) => porItem.get(item.id)?.has(mercado)))
      : [];

  const resumos: ResumoMercadoLista[] = mercados.map((empresaId) => {
    let total = 0;
    let itensComPreco = 0;
    let totalEmComum = 0;

    for (const item of itens) {
      const preco = porItem.get(item.id)?.get(empresaId);

      if (preco === undefined) {
        continue;
      }

      total += preco * item.quantidade;
      itensComPreco += 1;
    }

    for (const item of emComum) {
      totalEmComum += (porItem.get(item.id)?.get(empresaId) ?? 0) * item.quantidade;
    }

    return { empresaId, total, itensComPreco, totalEmComum, maisBarato: false };
  });

  const ordenados = [...resumos].sort((a, b) => a.totalEmComum - b.totalEmComum);
  const [primeiro, segundo] = ordenados;
  const temComparacao = emComum.length > 0 && primeiro !== undefined && segundo !== undefined;
  const ultimo = ordenados[ordenados.length - 1];

  if (temComparacao && ultimo.totalEmComum - primeiro.totalEmComum > CENTAVO) {
    for (const resumo of resumos) {
      resumo.maisBarato = resumo.totalEmComum - primeiro.totalEmComum <= CENTAVO;
    }
  }

  const menorPorItem = new Map<string, MenorPrecoItem>();

  for (const [itemId, doItem] of porItem) {
    const menor = Math.min(...doItem.values());

    menorPorItem.set(itemId, {
      preco: menor,
      mercados: [...doItem.entries()]
        .filter(([, preco]) => preco - menor <= CENTAVO)
        .map(([empresaId]) => empresaId),
      cotacoes: doItem.size,
    });
  }

  const vantagem =
    temComparacao && segundo.totalEmComum - primeiro.totalEmComum > CENTAVO
      ? {
          empresaId: primeiro.empresaId,
          sobre: segundo.empresaId,
          valor: segundo.totalEmComum - primeiro.totalEmComum,
        }
      : null;

  let dividindo: ComparativoLista['dividindo'] = null;

  if (temComparacao) {
    const mercadosUsados = new Set<string>();
    let total = 0;

    for (const item of emComum) {
      const menor = menorPorItem.get(item.id);

      if (menor) {
        total += menor.preco * item.quantidade;
        // No empate, fica no mais barato no geral, para nao inventar uma parada a mais.
        mercadosUsados.add(
          menor.mercados.includes(primeiro.empresaId) ? primeiro.empresaId : menor.mercados[0],
        );
      }
    }

    const economia = primeiro.totalEmComum - total;

    if (economia > CENTAVO && mercadosUsados.size > 1) {
      dividindo = { total, economia, mercados: mercadosUsados.size };
    }
  }

  return { mercados: resumos, itensEmComum: emComum.length, menorPorItem, vantagem, dividindo };
};
