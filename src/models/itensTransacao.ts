import {getConnection} from './database';
import {upadetePrecoProduto} from './produtos';

export type ItemTransacao = {
  id: string;
  transacao_id: string;
  produto_id?: string;
  descricao: string;
  valor: number;
  quantidade: number;
  created_at: string;
};

export const listItensTransacao = async (): Promise<ItemTransacao[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<ItemTransacao>(
    `
        SELECT id, transacao_id, produto_id, descricao, valor, quantidade, created_at
        FROM itens_transacao
        ORDER BY created_at DESC
    `,
  );

  return rows;
};

export const insertItemTransacao = async (item: ItemTransacao): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO itens_transacao (id, transacao_id, produto_id, descricao, valor, quantidade, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      item.id,
      item.transacao_id,
      item.produto_id ?? null,
      item.descricao,
      item.valor,
      item.quantidade,
      item.created_at,
    ],
  );

  // Se o item estiver associado a um produto, atualizar o preço do produto
  if (item.produto_id) {
    await upadetePrecoProduto(item.produto_id, item.valor);
  }

};

export const deleteItemTransacaoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM itens_transacao WHERE id = ?', [id]);
};

export const getItemTransacaoById = async (id: string): Promise<ItemTransacao | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<ItemTransacao>(
    `
        SELECT id, transacao_id, produto_id, descricao, valor, quantidade, created_at
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
