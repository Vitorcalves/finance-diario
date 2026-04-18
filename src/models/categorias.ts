import { getConnection } from './database';

export type Categoria = {
  id: string;
  nome: string;
  tipo: 'entrada' | 'saida';
  created_at: string;
};


export const listCategorias = async () => {
  const db = await getConnection();

  const rows = await db.getAllAsync<Categoria>(
    `
        SELECT id, nome, tipo, created_at
        FROM categorias
        ORDER BY created_at DESC
        `,
  );

  return rows;
};

export const insertCategoria = async (categoria: Categoria) => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO categorias (id, nome, tipo, created_at)
        VALUES (?, ?, ?, ?)
        `,
    [categoria.id, categoria.nome, categoria.tipo, categoria.created_at],
  );
};

export const deleteCategoriaById = async (id: string) => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM categorias WHERE id = ?', [id]);
};

export const getCategoriaById = async (id: string) => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Categoria>(
    `
        SELECT id, nome, tipo, created_at
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
