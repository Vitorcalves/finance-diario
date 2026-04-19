import { getConnection } from './database';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

export type Saldos = {
  id: string;
  valor: number;
  atual: number;
  data: string;
  created_at: string;
};

export const getSaldoAtual = async (): Promise<Saldos | null> => {
  try {
    const db = await getConnection();
    const query = `
      SELECT id, valor, atual, data, created_at
      FROM saldos
      WHERE atual = 1
      LIMIT 1
    `;
    const rows = await db.getAllAsync<Saldos>(query);
    console.log('Saldos carregados:', rows);
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error('Erro ao obter saldo atual:', e);
    return null;
  }
};

export const listSaldosDiarios = async (
  start: string | null = null,
  end: string | null = null,
): Promise<Saldos[]> => {
  const db = await getConnection();
  let query = `
    SELECT s.id, s.valor, s.atual, s.data, s.created_at
    FROM saldos s
    INNER JOIN (
      SELECT data as d, MAX(rowid) as max_rowid
      FROM saldos
      GROUP BY data
    ) latest ON s.data = latest.d AND s.rowid = latest.max_rowid
  `;
  const params: (string | number)[] = [];
  if (start && end) {
    query += ' WHERE s.data BETWEEN ? AND ?';
    params.push(start, end);
  }
  query += ' ORDER BY s.data DESC, s.created_at DESC';
  if (!start || !end) {
    query += ' LIMIT 50';
  }
  const rows = await db.getAllAsync<Saldos>(query, params);
  console.log('Saldos diários carregados:', rows);
  return rows;
};

export const novoSaldoAtual = async (valor: number): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('UPDATE saldos SET atual = 0 WHERE atual = 1');
  const saldo: Saldos = {
    id: uuidv4(),
    valor,
    atual: 1,
    data: dayjs().format('YYYY-MM-DD'),
    created_at: dayjs().toISOString(),
  };
  await insertSaldo(saldo);
};

export const insertSaldo = async (saldo: Saldos): Promise<void> => {
  const db = await getConnection();
  await db.runAsync(
    `
      INSERT INTO saldos (id, valor, atual, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [saldo.id, saldo.valor, saldo.atual, saldo.data, saldo.created_at],
  );
};

export const deleteSaldoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM saldos WHERE id = ?', [id]);
};
