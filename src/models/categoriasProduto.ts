import {getConnection} from './database';

export type CategoriaProduto = {
  id: string;
  categoria_id: string;
  produto_id: string;
  created_at: string;
};

export const listCategorias = async (): Promise<CategoriaProduto[]> => {
  const db = await getConnection();


  return await db.getAllAsync<CategoriaProduto>(
    `
        SELECT id, categoria_id, produto_id, created_at
        FROM categoria_produto
        ORDER BY created_at DESC
    `,
  );
};

export const insertCategoria = async (categoria: CategoriaProduto): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO categoria_produto (id, categoria_id, produto_id, created_at)
        VALUES (?, ?, ?, ?)
    `,
    [categoria.id, categoria.categoria_id, categoria.produto_id, categoria.created_at],
  );
};

export const deleteCategoriaById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM categoria_produto   WHERE id = ?', [id]);
};

export const getCategoriaById = async (id: string): Promise<CategoriaProduto | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<CategoriaProduto>(
    `
        SELECT id, categoria_id, produto_id, created_at
        FROM categoria_produto
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
