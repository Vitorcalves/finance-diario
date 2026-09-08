import { getConnection } from './database';

export type Marca = {
  id: number;
  nome: string;
  created_at: string;
};

export const listMarcas = async (): Promise<Marca[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Marca>(
    `
        SELECT id, nome, created_at
        FROM marcas
        ORDER BY created_at DESC
    `,
  );
};

export const insertMarca = async (marca: Omit<Marca, 'id'>): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO marcas (nome, created_at)
        VALUES (?, ?)
    `,
    [marca.nome, marca.created_at],
  );
};

export const deleteMarcaById = async (id: number): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM marcas WHERE id = ?', [id]);
};

export const getMarcaById = async (id: number): Promise<Marca | null> => {
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

export const updateMarca = async (marca: Marca): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE marcas
        SET nome       = ?,
            created_at = ?
        WHERE id = ?
    `,
    [marca.nome, marca.created_at, marca.id],
  );
};
