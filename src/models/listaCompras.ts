import { emTransacao, getConnection } from './database';

/** Um item da lista de compras; ver as migracoes 009, 010 e 016. */
export type ItemListaCompras = {
  id: string;
  /** `null` quando o item e so um texto livre ("papel toalha"). */
  produto_id: string | null;
  /**
   * Marca/embalagem que o usuario quer levar; `null` = qualquer uma (em cada
   * mercado vale a cotacao mais barata).
   */
  variante_id: string | null;
  descricao: string;
  quantidade: number;
  /** `1` quando ja foi para o carrinho. */
  comprado: number;
  ordem: number;
  created_at: string;
};

export type NovoItemListaCompras = Omit<ItemListaCompras, 'ordem' | 'comprado'> &
  Partial<Pick<ItemListaCompras, 'comprado'>>;

/**
 * Cotacao: o preco unitario de uma marca/embalagem de um item num mercado. O
 * mesmo item pode ter varias no mesmo mercado (migracao 016), uma por variante.
 */
export type CotacaoNaLista = {
  id: string;
  item_id: string;
  empresa_id: string;
  preco: number;
  /**
   * Variante cotada; `null` = marca nao informada (nao herda a do item). Num
   * produto com uma variante so, vale essa unica.
   */
  variante_id: string | null;
  updated_at: string;
};

/** Uma compra passada de um produto, usada para sugerir o que entra na lista. */
export type CompraDeProduto = {
  produto_id: string;
  variante_id: string | null;
  quantidade: number;
  /** Data do lancamento, YYYY-MM-DD. */
  data: string;
};

const COLUNAS = 'id, produto_id, variante_id, descricao, quantidade, comprado, ordem, created_at';

/** Mercado em que o usuario esta agora (onde anota os precos e fecha a compra). */
const MERCADO_ATUAL_KEY = 'lista_compras_mercado';

// --- Itens -------------------------------------------------------------------

/** O que falta comprar primeiro, na ordem em que entrou; depois o que ja esta no carrinho. */
export const listItensListaCompras = async (): Promise<ItemListaCompras[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ItemListaCompras>(
    `
        SELECT ${COLUNAS}
        FROM lista_compras_itens
        ORDER BY comprado, ordem, created_at
    `,
  );
};

/** Grava os itens no fim da lista, na ordem recebida. */
export const insertItensListaCompras = async (itens: NovoItemListaCompras[]): Promise<void> => {
  const db = await getConnection();

  const ultimo = await db.getFirstAsync<{ ordem: number | null }>(
    'SELECT MAX(ordem) AS ordem FROM lista_compras_itens',
  );
  let ordem = (ultimo?.ordem ?? 0) + 1;

  for (const item of itens) {
    await db.runAsync(
      `
          INSERT INTO lista_compras_itens (id, produto_id, variante_id, descricao, quantidade, comprado,
                                           ordem, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        item.id,
        item.produto_id,
        item.variante_id,
        item.descricao,
        item.quantidade,
        item.comprado ?? 0,
        ordem,
        item.created_at,
      ],
    );
    ordem += 1;
  }
};

export const updateItemListaCompras = async (item: ItemListaCompras): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE lista_compras_itens
        SET produto_id  = ?,
            variante_id = ?,
            descricao   = ?,
            quantidade  = ?,
            comprado    = ?
        WHERE id = ?
    `,
    [item.produto_id, item.variante_id, item.descricao, item.quantidade, item.comprado, item.id],
  );
};

/** Apaga o item; as cotacoes dele vao junto (FK em cascata). */
export const deleteItemListaCompras = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM lista_compras_itens WHERE id = ?', [id]);
};

/** Tira da lista o que ja foi comprado (depois de virar lancamento). */
export const deleteItensComprados = async (): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM lista_compras_itens WHERE comprado = 1');
};

export const deleteTodosItensListaCompras = async (): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM lista_compras_itens');
};

// --- Cotacoes por mercado ----------------------------------------------------

/** Todas as cotacoes, na ordem em que foram anotadas (o `rowid` da tabela). */
export const listCotacoesDaLista = async (): Promise<CotacaoNaLista[]> => {
  const db = await getConnection();

  return await db.getAllAsync<CotacaoNaLista>(
    `
        SELECT id, item_id, empresa_id, preco, variante_id, updated_at
        FROM lista_compras_precos
        ORDER BY rowid
    `,
  );
};

/** Grava a cotacao nova ou troca preco e variante da que ja existe (pelo `id`). */
export const salvarCotacao = async (cotacao: CotacaoNaLista): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO lista_compras_precos (id, item_id, empresa_id, preco, variante_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET preco       = excluded.preco,
                                      variante_id = excluded.variante_id,
                                      updated_at  = excluded.updated_at
    `,
    [
      cotacao.id,
      cotacao.item_id,
      cotacao.empresa_id,
      cotacao.preco,
      cotacao.variante_id,
      cotacao.updated_at,
    ],
  );
};

export const deleteCotacao = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM lista_compras_precos WHERE id = ?', [id]);
};

/** Comeca uma nova rodada de pesquisa: apaga as cotacoes, mantem itens e mercados. */
export const deleteTodasCotacoesDaLista = async (): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM lista_compras_precos');
};

// --- Mercados comparados -----------------------------------------------------

/** Mercados que entram na comparacao, na ordem em que foram adicionados. */
export const listMercadosDaLista = async (): Promise<string[]> => {
  const db = await getConnection();

  const linhas = await db.getAllAsync<{ empresa_id: string }>(
    'SELECT empresa_id FROM lista_compras_mercados ORDER BY ordem, created_at',
  );

  return linhas.map((linha) => linha.empresa_id);
};

export const adicionarMercadoNaLista = async (empresaId: string): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT OR IGNORE INTO lista_compras_mercados (empresa_id, ordem, created_at)
        VALUES (?, (SELECT COALESCE(MAX(ordem), -1) + 1 FROM lista_compras_mercados), ?)
    `,
    [empresaId, new Date().toISOString()],
  );
};

/** Tira o mercado da comparacao junto com as cotacoes anotadas nele. */
export const removerMercadoDaLista = async (empresaId: string): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();
    await db.runAsync('DELETE FROM lista_compras_precos WHERE empresa_id = ?', [empresaId]);
    await db.runAsync('DELETE FROM lista_compras_mercados WHERE empresa_id = ?', [empresaId]);
  });

export const getMercadoAtualDaLista = async (): Promise<string | null> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [MERCADO_ATUAL_KEY],
  );

  return row?.value || null;
};

export const saveMercadoAtualDaLista = async (empresaId: string | null): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [MERCADO_ATUAL_KEY, empresaId ?? ''],
  );
};

// --- Historico -----------------------------------------------------------------

/**
 * Cada vez que um produto cadastrado entrou num lancamento, com a data do
 * lancamento. A base para descobrir o que e comprado com frequencia.
 */
export const listComprasDeProdutos = async (): Promise<CompraDeProduto[]> => {
  const db = await getConnection();

  return await db.getAllAsync<CompraDeProduto>(
    `
        SELECT i.produto_id, i.variante_id, i.quantidade, t.data
        FROM itens_transacao i
                 JOIN transacoes t ON t.id = i.transacao_id
        WHERE i.produto_id IS NOT NULL
        ORDER BY t.data
    `,
  );
};
