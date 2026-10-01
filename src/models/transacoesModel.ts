import { Locais } from '../utils/local';
import { emTransacao, getConnection } from './database';
import {
  deleteItensTransacaoByTransacao,
  insertItemTransacao,
  type ItemTransacao,
  listItensTransacaoByTransacao,
} from './itensTransacao';

export type Transacoes = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  empresa_id?: string | null;
  /**
   * `1` entra no fluxo de caixa; `0` fica de fora.
   *
   * A compra parcelada grava duas coisas: a compra em si (valor cheio, com os
   * itens, `0`) e as parcelas (`1`). Somar as duas contaria a compra em dobro.
   */
  contabilizado_saldo: number;
  /** Plano que gerou a linha; `null` nos lancamentos avulsos. */
  plano_id?: string | null;
  /** `0` e a transacao da compra; `1..n` sao as parcelas/cobrancas. */
  parcela_numero?: number | null;
  /** Local onde a compra aconteceu; ver `Locais`. */
  local?: number;
  created_at: string;
};

/** Campos com valor padrao no insert, para o lancamento avulso continuar simples. */
export type NovaTransacao = Omit<
  Transacoes,
  'contabilizado_saldo' | 'plano_id' | 'parcela_numero' | 'local'
> &
  Partial<Pick<Transacoes, 'contabilizado_saldo' | 'plano_id' | 'parcela_numero' | 'local'>>;

export type OpcoesListaTransacoes = {
  /** Traz tambem as transacoes de compra fora do caixa (`contabilizado_saldo = 0`). */
  incluirNaoContabilizadas?: boolean;
  /**
   * Teto de data para a listagem sem periodo.
   *
   * Sem ele, um parcelamento de 24x ocuparia quase todo o `LIMIT 50` com
   * cobrancas de anos a frente e empurraria os gastos recentes para fora.
   */
  ateData?: string;
};

const COLUNAS =
  'id, descricao, valor, data, empresa_id, contabilizado_saldo, plano_id, parcela_numero, local, created_at';

export const listTransacoes = async (
  start: string | null = null,
  end: string | null = null,
  opcoes: OpcoesListaTransacoes = {},
): Promise<Transacoes[]> => {
  const db = await getConnection();
  const condicoes: string[] = [];
  const params: (string | number)[] = [];

  if (!opcoes.incluirNaoContabilizadas) {
    condicoes.push('contabilizado_saldo = 1');
  }

  if (start && end) {
    condicoes.push('data BETWEEN ? AND ?');
    params.push(start, end);
  } else if (opcoes.ateData) {
    condicoes.push('data <= ?');
    params.push(opcoes.ateData);
  }

  let query = `
      SELECT ${COLUNAS}
      FROM transacoes
  `;

  if (condicoes.length > 0) {
    query += ` WHERE ${condicoes.join(' AND ')}`;
  }

  query += ' ORDER BY data DESC, created_at DESC';

  if (!start || !end) {
    query += ' LIMIT 50';
  }

  return await db.getAllAsync<Transacoes>(query, params);
};

/** Todas as linhas de um plano, da compra (0) a ultima parcela. */
export const listTransacoesByPlano = async (planoId: string): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS}
        FROM transacoes
        WHERE plano_id = ?
        ORDER BY parcela_numero
    `,
    [planoId],
  );
};

export const insertTransacao = async (transacao: NovaTransacao): Promise<void> => {
  const db = await getConnection();
  await db.runAsync(
    `
        INSERT INTO transacoes (id, descricao, valor, data, empresa_id, contabilizado_saldo,
                                plano_id, parcela_numero, local, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      transacao.id,
      transacao.descricao,
      transacao.valor,
      transacao.data,
      transacao.empresa_id ?? null,
      transacao.contabilizado_saldo ?? 1,
      transacao.plano_id ?? null,
      transacao.parcela_numero ?? null,
      transacao.local ?? Locais.padrao,
      transacao.created_at,
    ],
  );
};

/** Transacoes de compra parcelada (parcela 0): fora do caixa, donas dos itens. */
export const listTransacoesCompra = async (): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS}
        FROM transacoes
        WHERE parcela_numero = 0
    `,
  );
};

export const deleteTransacaoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM transacoes WHERE id = ?', [id]);
};

/** Usado ao cancelar uma assinatura: apaga so o que ainda nao aconteceu. */
export const deleteTransacoesFuturasDoPlano = async (
  planoId: string,
  aPartirDe: string,
): Promise<void> => {
  const db = await getConnection();
  await db.runAsync(
    'DELETE FROM transacoes WHERE plano_id = ? AND data > ? AND parcela_numero > 0',
    [planoId, aPartirDe],
  );
};

export type ResumoCaixa = {
  /** Entradas menos saidas ate `hoje`, inclusive. */
  saldoAtual: number;
  /** Saidas ja lancadas depois de `hoje` e ate `ate` (valor negativo). */
  comprometido: number;
};

/**
 * Saldo e comprometido somados no proprio banco.
 *
 * O feed da Home traz so as 50 transacoes mais recentes: somar aquela lista
 * dava um saldo errado assim que o historico passava disso.
 */
export const resumoCaixa = async (hoje: string, ate: string): Promise<ResumoCaixa> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ saldo: number | null; comprometido: number | null }>(
    `
        SELECT SUM(CASE WHEN data <= ? THEN valor ELSE 0 END)                           AS saldo,
               SUM(CASE WHEN data > ? AND data <= ? AND valor < 0 THEN valor ELSE 0 END) AS comprometido
        FROM transacoes
        WHERE contabilizado_saldo = 1
    `,
    [hoje, hoje, ate],
  );

  return { saldoAtual: row?.saldo ?? 0, comprometido: row?.comprometido ?? 0 };
};

/** O que foi apagado por `excluirTransacao`, guardado para o "Desfazer". */
export type TransacaoExcluida = {
  transacao: Transacoes;
  itens: ItemTransacao[];
};

/** Apaga a transacao e os itens dela, devolvendo o conteudo apagado. */
export const excluirTransacao = async (id: string): Promise<TransacaoExcluida | null> =>
  emTransacao(async () => {
    const db = await getConnection();
    const transacao = await db.getFirstAsync<Transacoes>(
      `
          SELECT ${COLUNAS}
          FROM transacoes
          WHERE id = ?
      `,
      [id],
    );

    if (!transacao) {
      return null;
    }

    const itens = await listItensTransacaoByTransacao(id);

    await deleteItensTransacaoByTransacao(id);
    await deleteTransacaoById(id);

    return { transacao, itens };
  });

/** Grava de volta, com os mesmos ids, uma transacao apagada por `excluirTransacao`. */
export const restaurarTransacao = async ({ transacao, itens }: TransacaoExcluida): Promise<void> =>
  emTransacao(async () => {
    await insertTransacao(transacao);

    for (const item of itens) {
      await insertItemTransacao(item);
    }
  });
