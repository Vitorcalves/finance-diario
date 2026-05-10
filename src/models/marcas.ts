import { getConnection } from './database';

export type Marca = {
  id: string;
  nome: string;
  created_at: string;
};

export const listMarcas = async (): Promise<Marca[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<Marca>(
    `
        SELECT id, nome, created_at
        FROM marcas
        ORDER BY created_at DESC
        `,
  );

  return rows;
};

export const insertMarca = async (marca: Marca): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO marcas (id, nome, created_at)
        VALUES (?, ?, ?)
        `,
    [marca.id, marca.nome, marca.created_at],
  );
};

export const deleteMarcaById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM marcas WHERE id = ?', [id]);
};

export const getMarcaById = async (id: string): Promise<Marca | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Marca>(
    `
        SELECT id, nome, created_at
        FROM marcas
        WHERE id = ?
        `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
