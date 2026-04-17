import { getConnection } from './database';

export type Transacoes = {
  id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  positivo: number;
  data: string;
  created_at: string;
};

type TransacoesRow = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  positivo: number;
  categoria_id: string | null;
  created_at: string;
};

export const listExpenses = async () => {
  const db = await getConnection();

  const rows = await db.getAllAsync<TransacoesRow>(
    `
      SELECT id, descricao, valor, data, created_at, positivo, categoria_id
      FROM transacoes
      ORDER BY data DESC, created_at DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    descricao: row.descricao,
    valor: row.valor,
    data: row.data,
    created_at: row.created_at,
    positivo: row.positivo,
    categoria_id: row.categoria_id,
  }));
};

export const insertExpense = async (expense: Transacoes) => {
  const db = await getConnection();

  await db.runAsync(
    `
      INSERT INTO transacoes (id, descricao, valor, data, positivo, categoria_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      expense.id,
      expense.descricao,
      expense.valor,
      expense.data,
      expense.positivo,
      expense.categoria_id,
      expense.created_at,
    ],
  );
};

export const deleteExpenseById = async (id: string) => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM transacoes WHERE id = ?', [id]);
};
