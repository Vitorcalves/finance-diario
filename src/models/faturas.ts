import { v4 as uuidv4 } from 'uuid';
import type { CicloFatura } from '../utils/cartao';
import { Locais } from '../utils/local';
import { getContaById } from './contas';
import { emTransacao, getConnection } from './database';

/**
 * Fatura: um ciclo de fechamento de um cartao de credito.
 *
 * Nasce vazia no ato da compra (`garantirFatura`) e acumula as transacoes do
 * ciclo (`fatura_id`). O pagamento e a unica transacao que sai do caixa e,
 * como carrega `conta_destino_id` do cartao, nao entra no total da fatura.
 */

export type Fatura = {
  id: string;
  conta_id: string;
  /** 'YYYY-MM' do ciclo de fechamento. */
  mes_ref: string;
  data_fechamento: string;
  data_vencimento: string;
  paga: number;
  created_at: string;
};

export type FaturaComTotal = Fatura & {
  /** Soma das compras do ciclo (negativo); o pagamento nao entra. */
  total: number;
};

const COLUNAS = `id, conta_id, mes_ref, data_fechamento, data_vencimento, paga, created_at`;

const TOTAL_DAS_COMPRAS = `
    COALESCE((SELECT SUM(t.valor)
              FROM transacoes t
              WHERE t.fatura_id = f.id
                AND t.conta_id = f.conta_id), 0)
`;

export const getFaturaById = async (id: string): Promise<Fatura | null> => {
  const db = await getConnection();

  return await db.getFirstAsync<Fatura>(
    `
        SELECT ${COLUNAS}
        FROM faturas
        WHERE id = ?
    `,
    [id],
  );
};

/**
 * Devolve a fatura do ciclo, criando-a se ainda nao existir: compra no
 * cartao nunca falha por calendario. O `UNIQUE (conta_id, mes_ref)` faz o
 * upsert; chamadas concurrentes repetidas devolvem a mesma linha.
 */
export const garantirFatura = async (contaId: string, ciclo: CicloFatura): Promise<Fatura> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync(
      `
          INSERT INTO faturas (id, conta_id, mes_ref, data_fechamento, data_vencimento,
                               paga, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
          ON CONFLICT (conta_id, mes_ref) DO NOTHING
      `,
      [
        uuidv4(),
        contaId,
        ciclo.mesRef,
        ciclo.dataFechamento,
        ciclo.dataVencimento,
        new Date().toISOString(),
      ],
    );

    const fatura = await db.getFirstAsync<Fatura>(
      `
          SELECT ${COLUNAS}
          FROM faturas
          WHERE conta_id = ?
            AND mes_ref = ?
      `,
      [contaId, ciclo.mesRef],
    );

    if (!fatura) {
      throw new Error(`Não foi possível garantir a fatura de ${ciclo.mesRef}.`);
    }

    return fatura;
  });

/** Faturas de um cartao (ou de todos), do ciclo mais recente para o mais antigo, com o total. */
export const listFaturas = async (contaId?: string): Promise<FaturaComTotal[]> => {
  const db = await getConnection();

  const condicao = contaId ? 'WHERE f.conta_id = ?' : '';
  const params = contaId ? [contaId] : [];

  return await db.getAllAsync<FaturaComTotal>(
    `
        SELECT ${COLUNAS.split(', ')
          .map((coluna) => `f.${coluna}`)
          .join(', ')},
               ${TOTAL_DAS_COMPRAS} AS total
        FROM faturas f
        ${condicao}
        ORDER BY f.mes_ref DESC
    `,
    params,
  );
};

/** Soma das compras do ciclo: e o valor que a fatura pede de pagamento. */
export const totalDaFatura = async (faturaId: string): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ total: number | null }>(
    `
        SELECT ${TOTAL_DAS_COMPRAS} AS total
        FROM faturas f
        WHERE f.id = ?
    `,
    [faturaId],
  );

  return row?.total ?? 0;
};

export class FaturaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaturaError';
  }
}

/**
 * Paga a fatura: grava a transacao de pagamento (sai da conta pagante, quita
 * a divida do cartao) e marca a fatura como paga. Tudo numa transacao.
 *
 * Idempotente: uma fatura ja paga nao gera outro pagamento.
 */
export const pagarFatura = async (
  faturaId: string,
  contaPaganteId: string,
  dataPagamento: string,
): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();
    const fatura = await getFaturaById(faturaId);

    if (!fatura) {
      throw new FaturaError('Fatura não encontrada.');
    }

    if (fatura.paga) {
      return;
    }

    const [total, cartao] = await Promise.all([
      totalDaFatura(faturaId),
      getContaById(fatura.conta_id),
    ]);

    if (total >= 0) {
      throw new FaturaError('Fatura sem compras: nada a pagar.');
    }

    await db.runAsync(
      `
          INSERT INTO transacoes (id, descricao, valor, data, empresa_id, contabilizado_saldo,
                                  local, conta_id, conta_destino_id, fatura_id, created_at)
          VALUES (?, ?, ?, ?, NULL, 1, ?, ?, ?, ?, ?)
      `,
      [
        uuidv4(),
        `Pagamento fatura ${fatura.mes_ref}${cartao ? ` — ${cartao.nome}` : ''}`,
        total,
        dataPagamento,
        Locais.padrao,
        contaPaganteId,
        fatura.conta_id,
        faturaId,
        new Date().toISOString(),
      ],
    );

    await db.runAsync('UPDATE faturas SET paga = 1 WHERE id = ?', [faturaId]);
  });
