import {getConnection} from './database';

export type Unidade = {
  id: number;
  descricao: string;
  primario: boolean;
};

export const listUnidades = async (): Promise<Unidade[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<{ id: number; descricao: string; primario: number }>(
    `
        SELECT id, descricao, primario
        FROM unidades
        ORDER BY descricao
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    descricao: row.descricao,
    primario: row.primario === 1,
  }));
};
