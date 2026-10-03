import dayjs from 'dayjs';
import type { HistoricoPreco } from '../models/historicoPreco';

/** Item que entra na comparacao de precos (do orcamento ou da lista de compras). */
export type ItemComparavel = {
  id: string;
  produtoId: string | null;
  /** `null` = qualquer variante do produto serve (vale a mais barata). */
  varianteId: string | null;
  quantidade: number;
};

export type PrecoEncontrado = {
  /** Preco unitario. */
  preco: number;
  /** Variante a que o preco se refere; `null` quando veio de fora do historico. */
  varianteId: string | null;
  /** Data do registro no historico; `null` quando o preco foi informado agora. */
  data: string | null;
};

export type MercadoComparado = {
  empresaId: string;
  total: number;
  itensComPreco: number;
  /** `true` quando ha preco para todos os itens comparaveis. */
  completo: boolean;
  /** Preco usado para cada item, pelo `id` do item. */
  precos: Map<string, PrecoEncontrado>;
};

type OpcoesComparacao = {
  /** Mercados que entram mesmo sem historico dos itens (ex.: o escolhido na tela). */
  incluir?: string[];
  /**
   * Preco que vale mais que o historico naquele mercado (ex.: o digitado no
   * orcamento ou o pago na lista). `undefined` usa o historico; `null` = sem preco.
   */
  precoFixo?: (item: ItemComparavel, empresaId: string) => number | null | undefined;
};

/** Ordena do registro mais recente para o mais antigo, com o created_at como desempate. */
export const maisRecentePrimeiro = (a: HistoricoPreco, b: HistoricoPreco): number => {
  const diffData = dayjs(b.data).valueOf() - dayjs(a.data).valueOf();
  return diffData !== 0 ? diffData : b.created_at.localeCompare(a.created_at);
};

/** So da para comparar o que aponta para um produto cadastrado. */
export const ehComparavel = (item: ItemComparavel): boolean =>
  item.produtoId !== null || item.varianteId !== null;

/**
 * Preco de referencia de um item dentro de um conjunto de registros (de um
 * mercado ou de todos): o ultimo preco da variante ou, quando o item aceita
 * qualquer variante, o menor entre os ultimos precos de cada variante do produto.
 */
export const precoDoItem = (
  item: ItemComparavel,
  registros: HistoricoPreco[],
): PrecoEncontrado | null => {
  const relevantes = registros.filter((registro) =>
    item.varianteId !== null
      ? registro.variante_id === item.varianteId
      : registro.produto_id === item.produtoId,
  );

  const ultimoPorVariante = new Map<string, HistoricoPreco>();

  for (const registro of [...relevantes].sort(maisRecentePrimeiro)) {
    if (!ultimoPorVariante.has(registro.variante_id)) {
      ultimoPorVariante.set(registro.variante_id, registro);
    }
  }

  let escolhido: HistoricoPreco | null = null;

  for (const registro of ultimoPorVariante.values()) {
    if (!escolhido || registro.preco < escolhido.preco) {
      escolhido = registro;
    }
  }

  return escolhido
    ? { preco: escolhido.preco, varianteId: escolhido.variante_id, data: escolhido.data }
    : null;
};

/**
 * Simula o total dos itens em cada mercado com o ultimo preco registrado ali.
 * Os mercados que cobrem todos os itens vem primeiro; depois os com mais itens
 * com preco; no empate, o mais barato.
 */
export const compararMercados = (
  itens: ItemComparavel[],
  historico: HistoricoPreco[],
  { incluir = [], precoFixo }: OpcoesComparacao = {},
): MercadoComparado[] => {
  const comparaveis = itens.filter(ehComparavel);

  if (comparaveis.length === 0) {
    return [];
  }

  const produtos = new Set(comparaveis.map((item) => item.produtoId));
  const variantes = new Set(comparaveis.map((item) => item.varianteId));
  const porMercado = new Map<string, HistoricoPreco[]>();

  for (const registro of historico) {
    if (registro.empresa_id === null) {
      continue;
    }

    // So os registros de algum item da lista interessam.
    if (!produtos.has(registro.produto_id) && !variantes.has(registro.variante_id)) {
      continue;
    }

    const lista = porMercado.get(registro.empresa_id) ?? [];
    lista.push(registro);
    porMercado.set(registro.empresa_id, lista);
  }

  for (const empresaId of incluir) {
    if (!porMercado.has(empresaId)) {
      porMercado.set(empresaId, []);
    }
  }

  const resultado: MercadoComparado[] = [];

  for (const [empresaId, registros] of porMercado) {
    const precos = new Map<string, PrecoEncontrado>();
    let total = 0;

    for (const item of comparaveis) {
      const fixo = precoFixo?.(item, empresaId);
      const encontrado =
        fixo === undefined
          ? precoDoItem(item, registros)
          : fixo === null
            ? null
            : { preco: fixo, varianteId: item.varianteId, data: null };

      if (!encontrado) {
        continue;
      }

      precos.set(item.id, encontrado);
      total += encontrado.preco * item.quantidade;
    }

    // Mercado que nao tem preco de nenhum item so entra se foi pedido.
    if (precos.size === 0 && !incluir.includes(empresaId)) {
      continue;
    }

    resultado.push({
      empresaId,
      total,
      itensComPreco: precos.size,
      completo: precos.size === comparaveis.length,
      precos,
    });
  }

  return resultado.sort((a, b) => {
    if (a.completo !== b.completo) {
      return a.completo ? -1 : 1;
    }

    if (a.itensComPreco !== b.itensComPreco) {
      return b.itensComPreco - a.itensComPreco;
    }

    return a.total - b.total;
  });
};

/** So faz sentido eleger o mais barato entre ao menos dois mercados que cobrem todos os itens. */
export const menorTotalCompleto = (
  mercados: Pick<MercadoComparado, 'completo' | 'total'>[],
): number | null => {
  const completos = mercados.filter((mercado) => mercado.completo);
  return completos.length > 1 ? Math.min(...completos.map((mercado) => mercado.total)) : null;
};
