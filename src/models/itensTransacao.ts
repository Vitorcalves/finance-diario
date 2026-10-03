import { getConnection } from './database';

export type ItemTransacao = {
  id: string;
  transacao_id: string;
  produto_id?: string | null;
  variante_id?: string | null;
  descricao: string;
  /** Preco unitario do item. O total da linha e valor * quantidade. */
  valor: number;
  quantidade: number;
  created_at: string;
};

const COLUNAS =
  'id, transacao_id, produto_id, variante_id, descricao, valor, quantidade, created_at';

export const totalItemTransacao = (item: ItemTransacao): number => item.valor * item.quantidade;

export const listItensTransacao = async (): Promise<ItemTransacao[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ItemTransacao>(
    `
        SELECT ${COLUNAS}
        FROM itens_transacao
        ORDER BY created_at DESC
    `,
  );
};

export const listItensTransacaoByTransacao = async (
  transacaoId: string,
): Promise<ItemTransacao[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ItemTransacao>(
    `
        SELECT ${COLUNAS}
        FROM itens_transacao
        WHERE transacao_id = ?
        ORDER BY created_at
    `,
    [transacaoId],
  );
};

export const insertItemTransacao = async (item: ItemTransacao): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO itens_transacao (id, transacao_id, produto_id, variante_id, descricao, valor, quantidade,
                                     created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      item.id,
      item.transacao_id,
      item.produto_id ?? null,
      item.variante_id ?? null,
      item.descricao,
      item.valor,
      item.quantidade,
      item.created_at,
    ],
  );
};

export const deleteItemTransacaoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM itens_transacao WHERE id = ?', [id]);
};

export const deleteItensTransacaoByTransacao = async (transacaoId: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM itens_transacao WHERE transacao_id = ?', [transacaoId]);
};

export const getItemTransacaoById = async (id: string): Promise<ItemTransacao | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<ItemTransacao>(
    `
        SELECT ${COLUNAS}
        FROM itens_transacao
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
