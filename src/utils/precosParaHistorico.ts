import dayjs from 'dayjs';
import type { HistoricoPreco } from '../models/historicoPreco';

/** O que a selecao precisa saber de um item da lista. */
export type ItemDaPesquisa = {
  id: string;
  produto_id: string | null;
  variante_id: string | null;
};

/** Preco anotado na lista, com o momento em que foi anotado (ISO). */
export type PrecoDaPesquisa = {
  item_id: string;
  empresa_id: string;
  preco: number;
  /** Variante vista naquele mercado; vale mais que a do item. */
  variante_id?: string | null;
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

/**
 * A variante cujo historico recebe o preco: a escolhida no item ou, quando o
 * item aceita qualquer marca e o produto so tem uma variante, essa unica.
 */
export const varianteParaHistorico = (
  item: Pick<ItemDaPesquisa, 'produto_id' | 'variante_id'>,
  variantesPorProduto: Map<string, string[]>,
): string | null => {
  if (item.variante_id) {
    return item.variante_id;
  }

  const doProduto = item.produto_id ? variantesPorProduto.get(item.produto_id) : undefined;
  return doProduto?.length === 1 ? doProduto[0] : null;
};

/**
 * Escolhe os precos da pesquisa que ainda nao estao no historico, cada um na
 * variante anotada com ele (ou na do item, quando nao foi anotada). Cada um vai
 * com a data em que foi anotado, e o mesmo preco no mesmo dia nao entra de
 * novo - finalizar a lista duas vezes nao duplica nada.
 */
export const selecionarPrecosParaHistorico = (
  itens: ItemDaPesquisa[],
  precos: PrecoDaPesquisa[],
  historico: HistoricoPreco[],
  variantesPorProduto: Map<string, string[]>,
  ignorar: (itemId: string, empresaId: string) => boolean = (): boolean => false,
): SelecaoParaHistorico => {
  const itemPorId = new Map(itens.map((item) => [item.id, item]));
  const registros: RegistroParaHistorico[] = [];
  const semMarca = new Set<string>();

  for (const preco of precos) {
    const item = itemPorId.get(preco.item_id);

    if (!item || ignorar(item.id, preco.empresa_id)) {
      continue;
    }

    const varianteId = preco.variante_id ?? varianteParaHistorico(item, variantesPorProduto);

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
