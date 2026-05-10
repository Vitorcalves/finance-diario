import { getConnection } from './database';

export type HistoricoPrecoProduto = {
  id: string;
  produto_id: string;
  preco: number;
  data: string;
  created_at: string;
};

export const listHistoricoPrecoProdutos = async (): Promise<HistoricoPrecoProduto[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<HistoricoPrecoProduto>(
    `
        SELECT id, produto_id, preco, data, created_at
        FROM historico_preco_produtos
        ORDER BY created_at DESC
        `,
  );

  return rows;
};

export const insertHistoricoPrecoProduto = async (
  historico: HistoricoPrecoProduto,
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO historico_preco_produtos (id, produto_id, preco, data, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
    [historico.id, historico.produto_id, historico.preco, historico.data, historico.created_at],
  );
};

export const deleteHistoricoPrecoProdutoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM historico_preco_produtos WHERE id = ?', [id]);
};

export const getHistoricoPrecoProdutoById = async (
  id: string,
): Promise<HistoricoPrecoProduto | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<HistoricoPrecoProduto>(
    `
        SELECT id, produto_id, preco, data, created_at
        FROM historico_preco_produtos
        WHERE id = ?
        `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
