import {getConnection} from './database';

export type HistoricoPreco = {
  id: string;
  produto_id: string;
  variante_id: string;
  empresa_id: string | null;
  preco: number;
  data: string;
  created_at: string;
};

export const listHistoricoPreco = async (): Promise<HistoricoPreco[]> => {
  const db = await getConnection();

  return await db.getAllAsync<HistoricoPreco>(
    `
        SELECT id, produto_id, variante_id, empresa_id, preco, data, created_at
        FROM historico_preco
        ORDER BY created_at DESC
    `,
  );
};

export const insertHistoricoPreco = async (
  historico: HistoricoPreco,
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO historico_preco (id, produto_id, variante_id, empresa_id, preco, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      historico.id,
      historico.produto_id,
      historico.variante_id,
      historico.empresa_id ?? null,
      historico.preco,
      historico.data,
      historico.created_at,
    ],
  );
};

export const deleteHistoricoPrecoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM historico_preco WHERE id = ?', [id]);
};

export const getHistoricoPrecoById = async (
  id: string,
): Promise<HistoricoPreco | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<HistoricoPreco>(
    `
        SELECT id, produto_id, variante_id, empresa_id, preco, data, created_at
        FROM historico_preco
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
