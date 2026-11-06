import { v4 as uuidv4 } from 'uuid';
import type { CicloFatura } from '../utils/cartao';
import { Locais } from '../utils/local';
import { getContaById } from './contas';
import { emTransacao, getConnection } from './database';
import { contabilizadoDe } from './naturezaTransacao';

/**
 * Fatura: um ciclo de fechamento de um cartao de credito.
 *
 * Nasce vazia no ato da compra (`garantirFatura`) e acumula as compras do
 * ciclo (`compra_cartao` com `fatura_id`). O pagamento (`pagamento_fatura`)
 * tambem aponta para ela, mas nao entra no total: ele quita o total.
 *
 * A situacao (paga ou nao) sai dos valores, e nao de uma flag gravada: uma
 * compra lancada depois, com data de um ciclo ja pago, reabre a fatura, e o
 * novo pagamento cobre so a diferenca.
 */

export type Fatura = {
  id: string;
  conta_id: string;
  /** 'YYYY-MM' do ciclo de fechamento. */
  mes_ref: string;
  data_fechamento: string;
  data_vencimento: string;
  /**
   * `1` quando havia compra e nao falta nada a pagar. Calculado pelos valores;
   * a coluna `faturas.paga` ficou como legado e nao e lida.
   */
  paga: number;
  created_at: string;
};

export type FaturaComTotal = Fatura & {
  /** Soma das compras do ciclo (negativo); o pagamento nao entra. */
  total: number;
  /** O que falta pagar (negativo, como o total); `0` quando quitada. */
  restante: number;
};

/** Soma das compras do ciclo `f` (negativa). */
const TOTAL_DAS_COMPRAS = `
    COALESCE((SELECT SUM(t.valor)
              FROM transacoes t
              WHERE t.fatura_id = f.id
                AND t.natureza = 'compra_cartao'), 0)
`;

/** Soma dos pagamentos do ciclo `f` (negativa: o valor saiu da conta pagante). */
const TOTAL_PAGO = `
    COALESCE((SELECT SUM(t.valor)
              FROM transacoes t
              WHERE t.fatura_id = f.id
                AND t.natureza = 'pagamento_fatura'), 0)
`;

/** O que falta pagar: negativo enquanto houver divida, zero (ou credito) depois. */
const RESTANTE = `ROUND(${TOTAL_DAS_COMPRAS} - ${TOTAL_PAGO}, 2)`;

/** Paga: havia compra e nao falta nada. */
const PAGA = `CASE WHEN ${TOTAL_DAS_COMPRAS} < 0 AND ${RESTANTE} >= 0 THEN 1 ELSE 0 END`;

const COLUNAS = `f.id, f.conta_id, f.mes_ref, f.data_fechamento, f.data_vencimento,
                 ${PAGA} AS paga, f.created_at`;

export const getFaturaById = async (id: string): Promise<Fatura | null> => {
  const db = await getConnection();

  return await db.getFirstAsync<Fatura>(
    `
        SELECT ${COLUNAS}
        FROM faturas f
        WHERE f.id = ?
    `,
    [id],
  );
};

/**
 * Devolve a fatura do ciclo, criando-a se ainda nao existir: compra no
 * cartao nunca falha por calendario. O `UNIQUE (conta_id, mes_ref)` faz o
 * upsert; chamadas concurrentes repetidas devolvem a mesma linha. Uma fatura
 * ja paga tambem e devolvida: a compra nova a reabre.
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
          FROM faturas f
          WHERE f.conta_id = ?
            AND f.mes_ref = ?
      `,
      [contaId, ciclo.mesRef],
    );

    if (!fatura) {
      throw new Error(`Não foi possível garantir a fatura de ${ciclo.mesRef}.`);
    }

    return fatura;
  });

/** Faturas de um cartao (ou de todos), do ciclo mais recente para o mais antigo, com os valores. */
export const listFaturas = async (contaId?: string): Promise<FaturaComTotal[]> => {
  const db = await getConnection();

  const condicao = contaId ? 'WHERE f.conta_id = ?' : '';
  const params = contaId ? [contaId] : [];

  return await db.getAllAsync<FaturaComTotal>(
    `
        SELECT ${COLUNAS},
               ${TOTAL_DAS_COMPRAS} AS total,
               ${RESTANTE} AS restante
        FROM faturas f
        ${condicao}
        ORDER BY f.mes_ref DESC
    `,
    params,
  );
};

type ValoresFatura = { total: number; pago: number; restante: number };

const valoresDaFatura = async (faturaId: string): Promise<ValoresFatura> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<ValoresFatura>(
    `
        SELECT ${TOTAL_DAS_COMPRAS} AS total,
               ${TOTAL_PAGO} AS pago,
               ${RESTANTE} AS restante
        FROM faturas f
        WHERE f.id = ?
    `,
    [faturaId],
  );

  return row ?? { total: 0, pago: 0, restante: 0 };
};

/** Soma das compras do ciclo (negativa), sem descontar o que ja foi pago. */
export const totalDaFatura = async (faturaId: string): Promise<number> =>
  (await valoresDaFatura(faturaId)).total;

/** O que falta pagar (negativo); `0` quando a fatura esta quitada. */
export const restanteDaFatura = async (faturaId: string): Promise<number> =>
  (await valoresDaFatura(faturaId)).restante;

export class FaturaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaturaError';
  }
}

/**
 * Apaga as faturas que nao tem nenhuma transacao presa a elas. Cancelar um
 * plano parcelado remove as parcelas futuras e pode deixar o ciclo vazio; a
 * fatura some junto em vez de ficar como lixo na lista. Fatura paga nunca e
 * vazia: o pagamento aponta para ela.
 */
export const apagarFaturasVazias = async (): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        DELETE FROM faturas
        WHERE id NOT IN (SELECT fatura_id FROM transacoes WHERE fatura_id IS NOT NULL)
    `,
  );
};

/**
 * Paga o que falta da fatura: grava o pagamento (sai da conta pagante, quita
 * a divida do cartao), tudo numa transacao. Depois de uma compra retroativa,
 * o pagamento novo cobre so a diferenca.
 *
 * Idempotente: uma fatura quitada nao gera outro pagamento.
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

    const [valores, cartao] = await Promise.all([
      valoresDaFatura(faturaId),
      getContaById(fatura.conta_id),
    ]);

    if (valores.restante >= 0) {
      throw new FaturaError('Fatura sem compras: nada a pagar.');
    }

    const complemento = valores.pago < 0 ? ' (complemento)' : '';

    await db.runAsync(
      `
          INSERT INTO transacoes (id, descricao, valor, data, empresa_id, natureza,
                                  contabilizado_saldo, local, conta_id, conta_destino_id,
                                  fatura_id, created_at)
          VALUES (?, ?, ?, ?, NULL, 'pagamento_fatura', ?, ?, ?, ?, ?, ?)
      `,
      [
        uuidv4(),
        `Pagamento fatura ${fatura.mes_ref}${cartao ? ` — ${cartao.nome}` : ''}${complemento}`,
        valores.restante,
        dataPagamento,
        contabilizadoDe('pagamento_fatura'),
        Locais.padrao,
        contaPaganteId,
        fatura.conta_id,
        faturaId,
        new Date().toISOString(),
      ],
    );

    // Legado: a situacao e calculada pelos valores, mas a coluna acompanha.
    await db.runAsync('UPDATE faturas SET paga = 1 WHERE id = ?', [faturaId]);
  });
