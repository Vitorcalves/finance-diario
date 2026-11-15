import { Locais } from '../utils/local';
import { getConnection } from './database';

export type HistoricoPreco = {
  id: string;
  produto_id: string;
  variante_id: string;
  empresa_id: string | null;
  preco: number;
  data: string;
  /** Local onde o preco foi pago ou cotado; ver `Locais`. */
  local: number;
  created_at: string;
};

/**
 * Todo o historico, inclusive o de produto, variante e empresa excluidos (ver
 * `exclusaoLogica`). E o que as telas de analise mostram.
 */
export const listHistoricoPreco = async (): Promise<HistoricoPreco[]> => {
  const db = await getConnection();

  return await db.getAllAsync<HistoricoPreco>(
    `
        SELECT id, produto_id, variante_id, empresa_id, preco, data, local, created_at
        FROM historico_preco
        ORDER BY created_at DESC
    `,
  );
};

/**
 * Historico que serve de referencia para uma compra nova (lista de compras e
 * orcamento): so de produto e variante ativos, e o preco visto numa empresa
 * excluida fica sem mercado. Preco de variante excluida nao pode ser sugerido,
 * nem mercado excluido entrar na comparacao.
 */
export const listHistoricoPrecoDeAtivos = async (): Promise<HistoricoPreco[]> => {
  const db = await getConnection();

  return await db.getAllAsync<HistoricoPreco>(
    `
        SELECT h.id,
               h.produto_id,
               h.variante_id,
               CASE WHEN e.id IS NOT NULL AND e.deleted_at IS NULL THEN h.empresa_id END AS empresa_id,
               h.preco,
               h.data,
               h.local,
               h.created_at
        FROM historico_preco h
                 JOIN produtos p ON p.id = h.produto_id
                 JOIN produto_variantes v ON v.id = h.variante_id
                 LEFT JOIN empresas e ON e.id = h.empresa_id
        WHERE p.deleted_at IS NULL
          AND v.deleted_at IS NULL
        ORDER BY h.created_at DESC
    `,
  );
};

export const insertHistoricoPreco = async (historico: HistoricoPreco): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO historico_preco (id, produto_id, variante_id, empresa_id, preco, data, local,
                                     created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      historico.id,
      historico.produto_id,
      historico.variante_id,
      historico.empresa_id ?? null,
      historico.preco,
      historico.data,
      historico.local ?? Locais.padrao,
      historico.created_at,
    ],
  );
};

export const deleteHistoricoPrecoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM historico_preco WHERE id = ?', [id]);
};

export const getHistoricoPrecoById = async (id: string): Promise<HistoricoPreco | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<HistoricoPreco>(
    `
        SELECT id, produto_id, variante_id, empresa_id, preco, data, local, created_at
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
