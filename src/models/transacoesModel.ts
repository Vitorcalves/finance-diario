import { getConnection } from './database';
import dayjs from 'dayjs';
import { getSaldoAtual, novoSaldoAtual } from './saldoModel';

export type Transacoes = {
  id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  contabilizado_saldo: boolean;
  data: string;
  created_at: string;
};

export const listTransacoes = async (
  start: string | null = null,
  end: string | null = null,
): Promise<Transacoes[]> => {
  const db = await getConnection();
  let query = `
    SELECT id, descricao, valor, data, created_at, contabilizado_saldo, categoria_id
    FROM transacoes
  `;
  const params: (string | number)[] = [];
  if (start && end) {
    query += ' WHERE data BETWEEN ? AND ?';
    params.push(start, end);
  }
  query += ' ORDER BY data DESC, created_at DESC';
  if (!start || !end) {
    query += ' LIMIT 50';
  }
  const rows = await db.getAllAsync<Transacoes>(query, params);
  console.log('Transações carregadas:', rows);
  return rows;
};

export const insertTransacao = async (transacao: Transacoes): Promise<void> => {
  const db = await getConnection();

  if (!dayjs(transacao.data).isBefore(dayjs(), 'day')) {
    transacao.contabilizado_saldo = true;
    try {
      const saldoAtual = await getSaldoAtual();
      const novoValor = saldoAtual ? saldoAtual.valor + transacao.valor : transacao.valor;
      await novoSaldoAtual(novoValor);
    } catch (e) {
      console.error('Erro ao atualizar saldo:', e);
    }
  }
  await db.runAsync(
    `
      INSERT INTO transacoes (id, descricao, valor, data, contabilizado_saldo, categoria_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      transacao.id,
      transacao.descricao,
      transacao.valor,
      transacao.data,
      transacao.contabilizado_saldo,
      transacao.categoria_id,
      transacao.created_at,
    ],
  );
};

export const deleteTransacaoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM transacoes WHERE id = ?', [id]);
};
