import dayjs from 'dayjs';
import type { HistoricoPreco } from '../models/historicoPreco';

/** O que a selecao precisa saber de um item da lista. */
export type ItemDaPesquisa = {
  id: string;
  produto_id: string | null;
};

/** Cotacao anotada na lista, com o momento em que foi anotada (ISO). */
export type PrecoDaPesquisa = {
  id: string;
  item_id: string;
  empresa_id: string;
  preco: number;
  /** Variante cotada; `null` = marca nao informada. */
  variante_id: string | null;
  updated_at: string;
};

export type RegistroParaHistorico = {
  produtoId: string;
  varianteId: string;
  empresaId: string;
  preco: number;
  /** Data e hora locais em que o preco foi anotado: `YYYY-MM-DDTHH:mm:ss`. */
  data: string;
};

export type SelecaoParaHistorico = {
  registros: RegistroParaHistorico[];
  /** Itens com preco anotado que ficaram de fora por nao terem marca definida. */
  semMarca: number;
};

/** Diferencas abaixo de meio centavo sao arredondamento. */
const CENTAVO = 0.005;

/** A variante do produto quando ele so tem uma; com mais de uma, nao da para adivinhar. */
export const unicaVarianteDoProduto = (
  produtoId: string | null,
  variantesPorProduto: Map<string, string[]>,
): string | null => {
  const doProduto = produtoId ? variantesPorProduto.get(produtoId) : undefined;
  return doProduto?.length === 1 ? doProduto[0] : null;
};

/**
 * A variante cujo historico recebe o preco da cotacao: a anotada nela ou,
 * quando o produto so tem uma variante, essa unica. A variante do item nao
 * entra: ela diz o que o usuario quer levar, nao a marca que estava na gondola.
 */
export const varianteDaCotacao = (
  cotacao: Pick<PrecoDaPesquisa, 'variante_id'>,
  item: Pick<ItemDaPesquisa, 'produto_id'>,
  variantesPorProduto: Map<string, string[]>,
): string | null =>
  cotacao.variante_id ?? unicaVarianteDoProduto(item.produto_id, variantesPorProduto);

/**
 * Escolhe as cotacoes da pesquisa que ainda nao estao no historico, cada uma
 * na sua variante (`varianteDaCotacao`). Cada uma vai com a data em que foi
 * anotada, e o mesmo preco no mesmo dia nao entra de novo - finalizar a lista
 * duas vezes nao duplica nada.
 */
export const selecionarPrecosParaHistorico = (
  itens: ItemDaPesquisa[],
  precos: PrecoDaPesquisa[],
  historico: HistoricoPreco[],
  variantesPorProduto: Map<string, string[]>,
  ignorar: (cotacao: PrecoDaPesquisa) => boolean = (): boolean => false,
): SelecaoParaHistorico => {
  const itemPorId = new Map(itens.map((item) => [item.id, item]));
  const registros: RegistroParaHistorico[] = [];
  const semMarca = new Set<string>();

  for (const preco of precos) {
    const item = itemPorId.get(preco.item_id);

    if (!item || ignorar(preco)) {
      continue;
    }

    const varianteId = varianteDaCotacao(preco, item, variantesPorProduto);

    if (!item.produto_id || !varianteId) {
      semMarca.add(item.id);
      continue;
    }

    const data = dayjs(preco.updated_at).format('YYYY-MM-DDTHH:mm:ss');
    const jaRegistrado = historico.some(
      (registro) =>
        registro.variante_id === varianteId &&
        registro.empresa_id === preco.empresa_id &&
        registro.data.slice(0, 10) === data.slice(0, 10) &&
        Math.abs(registro.preco - preco.preco) <= CENTAVO,
    );

    if (!jaRegistrado) {
      registros.push({
        produtoId: item.produto_id,
        varianteId,
        empresaId: preco.empresa_id,
        preco: preco.preco,
        data,
      });
    }
  }

  return { registros, semMarca: semMarca.size };
};
