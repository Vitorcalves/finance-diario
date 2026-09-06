import {getConnection} from './database';

export type Categoria = {
  id: string;
  nome: string;
  created_at: string;
};

export const listCategorias = async (): Promise<Categoria[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Categoria>(
    `
        SELECT id, nome, created_at
        FROM categorias
        ORDER BY created_at DESC
    `,
  );
};

export const insertCategoria = async (categoria: Categoria): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO categorias (id, nome, created_at)
        VALUES (?, ?, ?)
    `,
    [categoria.id, categoria.nome, categoria.created_at],
  );
};

export const deleteCategoriaById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM categorias WHERE id = ?', [id]);
};

export const getCategoriaById = async (id: string): Promise<Categoria | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Categoria>(
    `
        SELECT id, nome, created_at
        FROM categorias
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
