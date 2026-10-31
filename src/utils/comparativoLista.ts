/** Preco de um item da lista anotado num mercado. */
export type PrecoAnotado = {
  itemId: string;
  empresaId: string;
  preco: number;
  precoUnitario?: { valor: number; sigla: string } | null;
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
  unidade: string | null;
  precoUnitario: number | null;
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
  const porItemUnitario = new Map<string, Map<string, { valor: number; sigla: string } | null>>();

  for (const anotado of precos) {
    if (!idsMercados.has(anotado.empresaId) || !idsItens.has(anotado.itemId)) {
      continue;
    }

    const doItem = porItem.get(anotado.itemId) ?? new Map<string, number>();
    doItem.set(anotado.empresaId, anotado.preco);
    porItem.set(anotado.itemId, doItem);

    const doItemU =
      porItemUnitario.get(anotado.itemId) ??
      new Map<string, { valor: number; sigla: string } | null>();
    doItemU.set(anotado.empresaId, anotado.precoUnitario ?? null);
    porItemUnitario.set(anotado.itemId, doItemU);
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

    return {empresaId, total, itensComPreco, totalEmComum, maisBarato: false};
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
    const pares = [...doItem.entries()];                 // [[empresaId, preco], ...]
    const menorBruto = Math.min(...pares.map(([, p]) => p));

    const unitarios = [...(porItemUnitario.get(itemId)?.entries() ?? [])];

// Só compara por unidade se TODOS têm unidade E a MESMA unidade.
    const todosComUnidade =
      unitarios.length > 1 &&
      unitarios.every(([, u]) => u !== null) &&
      unitarios.every(([, u]) => u!.sigla === unitarios[0][1]!.sigla);

    let precoUnitario: number | null = null;
    let unidade: string | null = null;
    let mercadosMenores: string[];

    if (todosComUnidade) {
// Caminho novo: menor POR UNIDADE (ex.: R$/L)
      const menorU = Math.min(...unitarios.map(([, u]) => u!.valor));
      precoUnitario = menorU;
      unidade = unitarios[0][1]!.sigla;
      mercadosMenores = unitarios
        .filter(([, u]) => u!.valor - menorU <= CENTAVO)
        .map(([empresaId]) => empresaId);
    } else {
// Caminho antigo: menor BRUTO (comportamento de hoje)
      mercadosMenores = pares
        .filter(([, p]) => p - menorBruto <= CENTAVO)
        .map(([empresaId]) => empresaId);
    }

    menorPorItem.set(itemId, {
      preco: menorBruto,
      precoUnitario,
      unidade,
      mercados: mercadosMenores,   // ← agora correto: quem é menor POR UNIDADE
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

      if (!menor) {
        continue;
      }

      // No empate, fica no mais barato no geral para nao inventar uma parada a mais.
      const mercado = menor.mercados.includes(primeiro.empresaId)
        ? primeiro.empresaId
        : menor.mercados[0];
      const precoNoMercado = porItem.get(item.id)?.get(mercado);

      if (precoNoMercado === undefined) {
        continue;
      }

      // A escolha pode ser por unidade, mas o total usa o preco bruto desse mercado.
      total += precoNoMercado * item.quantidade;
      mercadosUsados.add(mercado);
    }

    const economia = primeiro.totalEmComum - total;

    if (economia > CENTAVO && mercadosUsados.size > 1) {
      dividindo = {total, economia, mercados: mercadosUsados.size};
    }
  }

  return {mercados: resumos, itensEmComum: emComum.length, menorPorItem, vantagem, dividindo};
};
