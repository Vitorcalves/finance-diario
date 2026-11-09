import { Locais } from '../utils/local';
import { emTransacao, getConnection } from './database';
import {
  deleteItensTransacaoByTransacao,
  insertItemTransacao,
  type ItemTransacao,
  listItensTransacaoByTransacao,
} from './itensTransacao';
import {
  contabilizadoDe,
  NATUREZAS_DE_CAIXA,
  NATUREZAS_DO_FLUXO,
  NATUREZAS_VISIVEIS,
  type NaturezaTransacao,
  naturezasSql,
} from './naturezaTransacao';
import { restaurarTagsTransacao, tagsDaTransacao } from './tags';

export type Transacoes = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  empresa_id?: string | null;
  /** O que a linha e (gasto, compra no cartao, transferencia...); ver `naturezaTransacao.ts`. */
  natureza: NaturezaTransacao;
  /**
   * Legado: `0` para compra no cartao e registro de compra parcelada, `1` no
   * resto. Gravado a partir da `natureza`; nenhuma consulta le.
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

/**
 * Campos com valor padrao no insert, para o lancamento avulso continuar
 * simples. A `natureza` e obrigatoria: quem grava decide o que a linha e. O
 * `contabilizado_saldo` sai dela.
 */
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
  /** Traz tudo, inclusive compra no cartao e registro da compra parcelada. */
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
   * gasto do mes da compra, e o pagamento da fatura e as transferencias entre
   * contas ficam de fora para nao contar em dobro.
   */
  fluxoGastos?: boolean;
  /** Feed da Home: tudo o que o usuario lancou, inclusive as compras no cartao. */
  incluirComprasCartao?: boolean;
};

const COLUNAS =
  'id, descricao, valor, data, empresa_id, natureza, contabilizado_saldo, plano_id, parcela_numero, local, categoria_id, conta_id, conta_destino_id, fatura_id, created_at';

export const listTransacoes = async (
  start: string | null = null,
  end: string | null = null,
  opcoes: OpcoesListaTransacoes = {},
): Promise<Transacoes[]> => {
  const db = await getConnection();
  const condicoes: string[] = [];
  const params: (string | number)[] = [];

  if (opcoes.fluxoGastos) {
    condicoes.push(`natureza IN (${naturezasSql(NATUREZAS_DO_FLUXO)})`);
  } else if (opcoes.incluirComprasCartao) {
    condicoes.push(`natureza IN (${naturezasSql(NATUREZAS_VISIVEIS)})`);
  } else if (!opcoes.incluirNaoContabilizadas) {
    condicoes.push(`natureza IN (${naturezasSql(NATUREZAS_DE_CAIXA)})`);
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

/**
 * Todas as cobrancas de planos, no caixa e no cartao, sem corte de data nem o
 * limite de 50 do feed. O registro da compra parcelada (parcela 0) nao e
 * cobranca e fica de fora.
 */
export const listCobrancasDePlanos = async (): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS}
        FROM transacoes
        WHERE plano_id IS NOT NULL
          AND natureza IN (${naturezasSql(NATUREZAS_DO_FLUXO)})
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
        INSERT INTO transacoes (id, descricao, valor, data, empresa_id, natureza,
                                contabilizado_saldo, plano_id, parcela_numero, local,
                                categoria_id, conta_id, conta_destino_id, fatura_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      transacao.id,
      transacao.descricao,
      transacao.valor,
      transacao.data,
      transacao.empresa_id ?? null,
      transacao.natureza,
      contabilizadoDe(transacao.natureza),
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

/** Registros de compra parcelada (parcela 0): fora de qualquer saldo, donos dos itens. */
export const listTransacoesCompra = async (): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS}
        FROM transacoes
        WHERE natureza = 'registro_compra'
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

/** O que foi apagado por `excluirTransacao`, guardado para o "Desfazer". */
export type TransacaoExcluida = {
  transacao: Transacoes;
  itens: ItemTransacao[];
  /** Tags que o lancamento tinha; a exclusao apaga as ligacoes (`ON DELETE CASCADE`). */
  tagIds: string[];
};

/** Apaga a transacao, os itens e as tags dela, devolvendo o conteudo apagado. */
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
    const tagIds = await tagsDaTransacao(id);

    await deleteItensTransacaoByTransacao(id);
    await deleteTransacaoById(id);

    return { transacao, itens, tagIds };
  });

/** Grava de volta, com os mesmos ids, uma transacao apagada por `excluirTransacao`. */
export const restaurarTransacao = async ({
  transacao,
  itens,
  tagIds,
}: TransacaoExcluida): Promise<void> =>
  emTransacao(async () => {
    await insertTransacao(transacao);

    for (const item of itens) {
      await insertItemTransacao(item);
    }

    // Tag apagada enquanto o "Desfazer" estava na tela fica de fora.
    await restaurarTagsTransacao(transacao.id, tagIds);
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
  /** Tag de evento ("Viagem julho"). */
  tagId?: string | null;
};

/** Lancamento da busca, com a descricao dos itens para o filtro por texto. */
export type TransacaoBuscada = Transacoes & {
  /** Descricoes dos itens da compra, separadas por espaco; `null` sem itens. */
  itens_texto: string | null;
};

/**
 * Lancamentos que atendem aos filtros, do mais recente ao mais antigo, sem o
 * limite de 50 do feed da Home: tudo o que o usuario lancou, inclusive as
 * compras no cartao, as transferencias e os pagamentos de fatura.
 *
 * O texto e filtrado depois, em JS, para ignorar acentos ("acucar" acha
 * "Açúcar") - o LIKE do SQLite nao faz isso. Os itens de uma compra parcelada
 * ficam no registro da compra (parcela 0), que nao aparece: contam para a 1a
 * parcela.
 */
export const buscarTransacoes = async (filtros: FiltrosBusca = {}): Promise<TransacaoBuscada[]> => {
  const db = await getConnection();
  const condicoes = [`t.natureza IN (${naturezasSql(NATUREZAS_VISIVEIS)})`];
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

  if (filtros.tagId) {
    condicoes.push(
      'EXISTS (SELECT 1 FROM transacoes_tags tt WHERE tt.transacao_id = t.id AND tt.tag_id = ?)',
    );
    params.push(filtros.tagId);
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
