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
  /** Categoria do lancamento (Mercado, Transporte...); `null` = sem categoria. */
  categoria_id?: string | null;
  /** Conta de onde o valor sai (ou onde a compra no cartao acontece). */
  conta_id?: string | null;
  /** Conta de destino em transferencias (aporte/resgate, pagamento de fatura). */
  conta_destino_id?: string | null;
  /** Fatura do ciclo, nas compras no cartao e no pagamento dela. */
  fatura_id?: string | null;
  created_at: string;
};

/** Campos com valor padrao no insert, para o lancamento avulso continuar simples. */
export type NovaTransacao = Omit<
  Transacoes,
  | 'contabilizado_saldo'
  | 'plano_id'
  | 'parcela_numero'
  | 'local'
  | 'categoria_id'
  | 'conta_id'
  | 'conta_destino_id'
  | 'fatura_id'
> &
  Partial<
    Pick<
      Transacoes,
      | 'contabilizado_saldo'
      | 'plano_id'
      | 'parcela_numero'
      | 'local'
      | 'categoria_id'
      | 'conta_id'
      | 'conta_destino_id'
      | 'fatura_id'
    >
  >;

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
  /**
   * Visao de gastos do mes (Home e Mensal): a compra no cartao conta como
   * gasto do mes da compra (`contabilizado_saldo = 0`, com fatura), e o
   * pagamento da fatura e as transferencias entre contas (`conta_destino_id`)
   * ficam de fora para nao contar em dobro.
   */
  fluxoGastos?: boolean;
  /** Visao de caixa da Home: inclui tambem as compras no cartao do feed. */
  incluirComprasCartao?: boolean;
};

const COLUNAS =
  'id, descricao, valor, data, empresa_id, contabilizado_saldo, plano_id, parcela_numero, local, categoria_id, conta_id, conta_destino_id, fatura_id, created_at';

export const listTransacoes = async (
  start: string | null = null,
  end: string | null = null,
  opcoes: OpcoesListaTransacoes = {},
): Promise<Transacoes[]> => {
  const db = await getConnection();
  const condicoes: string[] = [];
  const params: (string | number)[] = [];

  if (opcoes.fluxoGastos) {
    condicoes.push(`(
            contabilizado_saldo = 1 AND conta_destino_id IS NULL
        OR contabilizado_saldo = 0 AND fatura_id IS NOT NULL
    )`);
  } else if (opcoes.incluirComprasCartao) {
    condicoes.push('(contabilizado_saldo = 1 OR fatura_id IS NOT NULL)');
  } else if (!opcoes.incluirNaoContabilizadas) {
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

/** Todas as cobrancas de planos, sem corte de data nem o limite de 50 do feed. */
export const listCobrancasDePlanos = async (): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS}
        FROM transacoes
        WHERE plano_id IS NOT NULL
          AND contabilizado_saldo = 1
          AND conta_destino_id IS NULL
        ORDER BY data DESC, created_at DESC
    `,
  );
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
                                plano_id, parcela_numero, local, categoria_id, conta_id,
                                conta_destino_id, fatura_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      transacao.categoria_id ?? null,
      transacao.conta_id ?? null,
      transacao.conta_destino_id ?? null,
      transacao.fatura_id ?? null,
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

/** `SEM_CATEGORIA` no filtro busca os lancamentos que ainda nao tem categoria. */
export const SEM_CATEGORIA = '__sem_categoria__';

export type FiltrosBusca = {
  /** Periodo inclusivo, YYYY-MM-DD; sem ele a busca cobre todo o historico. */
  inicio?: string | null;
  fim?: string | null;
  empresaId?: string | null;
  /** Id da categoria ou `SEM_CATEGORIA`. */
  categoriaId?: string | null;
  tipo?: 'saida' | 'entrada' | null;
  /** Conta em qualquer uma das pontas (origem ou destino da transferencia). */
  contaId?: string | null;
};

/** Lancamento da busca, com a descricao dos itens para o filtro por texto. */
export type TransacaoBuscada = Transacoes & {
  /** Descricoes dos itens da compra, separadas por espaco; `null` sem itens. */
  itens_texto: string | null;
};

/**
 * Lancamentos do caixa que atendem aos filtros, do mais recente ao mais
 * antigo, sem o limite de 50 do feed da Home.
 *
 * O texto e filtrado depois, em JS, para ignorar acentos ("acucar" acha
 * "Açúcar") - o LIKE do SQLite nao faz isso. Os itens de uma compra parcelada
 * ficam na compra (parcela 0), entao contam para a 1a parcela.
 */
export const buscarTransacoes = async (filtros: FiltrosBusca = {}): Promise<TransacaoBuscada[]> => {
  const db = await getConnection();
  const condicoes = ['t.contabilizado_saldo = 1'];
  const params: string[] = [];

  if (filtros.inicio) {
    condicoes.push('t.data >= ?');
    params.push(filtros.inicio);
  }

  if (filtros.fim) {
    // Datas com hora (YYYY-MM-DDTHH:mm) do mesmo dia tambem entram.
    condicoes.push('t.data < ?');
    params.push(`${filtros.fim}~`);
  }

  if (filtros.empresaId) {
    condicoes.push('t.empresa_id = ?');
    params.push(filtros.empresaId);
  }

  if (filtros.categoriaId === SEM_CATEGORIA) {
    condicoes.push('t.categoria_id IS NULL');
  } else if (filtros.categoriaId) {
    condicoes.push('t.categoria_id = ?');
    params.push(filtros.categoriaId);
  }

  if (filtros.tipo === 'saida') {
    condicoes.push('t.valor < 0');
  } else if (filtros.tipo === 'entrada') {
    condicoes.push('t.valor > 0');
  }

  if (filtros.contaId) {
    condicoes.push('(t.conta_id = ? OR t.conta_destino_id = ?)');
    params.push(filtros.contaId, filtros.contaId);
  }

  return await db.getAllAsync<TransacaoBuscada>(
    `
        SELECT ${COLUNAS.split(', ')
          .map((coluna) => `t.${coluna}`)
          .join(', ')},
               (SELECT group_concat(i.descricao, ' ')
                FROM itens_transacao i
                WHERE i.transacao_id = t.id
                   OR (t.parcela_numero = 1 AND i.transacao_id IN (SELECT c.id
                                                                   FROM transacoes c
                                                                   WHERE c.plano_id = t.plano_id
                                                                     AND c.parcela_numero = 0))) AS itens_texto
        FROM transacoes t
        WHERE ${condicoes.join(' AND ')}
        ORDER BY t.data DESC, t.created_at DESC
    `,
    params,
  );
};
