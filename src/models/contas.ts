import { getConnection } from './database';

/**
 * Contas: onde o dinheiro esta.
 *
 * `caixa` entra no saldo disponivel; `reserva` e dinheiro alocado para um
 * objetivo (meta opcional) e `cartao` acumula divida ate a fatura ser paga.
 * Aportes/resgates e pagamentos de fatura sao uma unica linha em
 * `transacoes` carregando as duas pontas (`conta_id` origem,
 * `conta_destino_id` destino), entao o saldo de cada ponta sai do mesmo
 * valor com sinais opostos.
 */

export type TipoConta = 'caixa' | 'reserva' | 'cartao';

/** Conta criada pela migration 012 para o caixa unico global existente. */
export const CONTA_CAIXA_PADRAO = 'caixa-padrao';

export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  caixa: 'Caixa',
  reserva: 'Reserva',
  cartao: 'Cartão',
};

export type Conta = {
  id: string;
  nome: string;
  tipo: TipoConta;
  /** Cartao: dia do fechamento (1..31); `null` nos demais tipos. */
  dia_fechamento?: number | null;
  /** Cartao: dia do vencimento (1..31); `null` nos demais tipos. */
  dia_vencimento?: number | null;
  /** Reserva: valor que se pretende acumular; `null` sem meta. */
  meta_valor?: number | null;
  saldo_inicial: number;
  cor?: string | null;
  ativo: number;
  ordem: number;
  created_at: string;
};

export type ContaComSaldo = Conta & {
  /** Saldo corrente: saldo inicial + transacoes contabilizadas da conta. */
  saldo: number;
};

const COLUNAS = `id, nome, tipo, dia_fechamento, dia_vencimento, meta_valor, saldo_inicial,
                 cor, ativo, ordem, created_at`;

/**
 * Saldo de uma conta, somado no banco. As tres pontas:
 * - origem contabilizada (gasto a vista, entrada, pagamento de fatura,
 *   aporte/resgate saindo): soma `valor`;
 * - destino contabilizado (recebimento de aporte/resgate, pagamento de
 *   fatura quitando divida): subtrai `valor` (mesma linha, sinal invertido);
 * - compra no cartao (fora do caixa): soma `valor`, que e negativo e por
 *   isso aumenta a divida do cartao.
 */
const EXPRESSAO_SALDO = `
    c.saldo_inicial
        + COALESCE((SELECT SUM(
             CASE
                 WHEN t.conta_id = c.id AND t.contabilizado_saldo = 1 THEN t.valor
                 WHEN t.conta_destino_id = c.id AND t.contabilizado_saldo = 1 THEN -t.valor
                 WHEN t.conta_id = c.id AND t.contabilizado_saldo = 0 THEN t.valor
                 ELSE 0
                 END)
           FROM transacoes t), 0)
`;

const SQL_SALDO = `
    SELECT ${EXPRESSAO_SALDO} AS saldo
    FROM contas c
    WHERE c.id = ?
`;

export const listContas = async (): Promise<Conta[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Conta>(
    `
        SELECT ${COLUNAS}
        FROM contas
        ORDER BY ativo DESC, ordem, created_at
    `,
  );
};

/** Contas ativas de um tipo, para os seletores de lancamento. */
export const listContasPorTipo = async (tipo: TipoConta): Promise<Conta[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Conta>(
    `
        SELECT ${COLUNAS}
        FROM contas
        WHERE tipo = ?
          AND ativo = 1
        ORDER BY ordem, created_at
    `,
    [tipo],
  );
};

export const listContasComSaldo = async (): Promise<ContaComSaldo[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ContaComSaldo>(
    `
        SELECT c.id, c.nome, c.tipo, c.dia_fechamento, c.dia_vencimento, c.meta_valor,
               c.saldo_inicial, c.cor, c.ativo, c.ordem, c.created_at,
               ${EXPRESSAO_SALDO} AS saldo
        FROM contas c
        ORDER BY c.ativo DESC, c.ordem, c.created_at
    `,
  );
};

export const saldoDaConta = async (contaId: string): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ saldo: number | null }>(SQL_SALDO, [contaId]);

  return row?.saldo ?? 0;
};

export type TotaisPorTipo = {
  /** Soma dos saldos das contas caixa ativas. */
  caixaDisponivel: number;
  /** Soma dos saldos das reservas ativas. */
  totalReservas: number;
  /** Divida total dos cartoes ativos (valor positivo). */
  totalFaturasAbertas: number;
};

/** Caixa disponivel, total em reservas e divida aberta nos cartoes. */
export const totaisPorTipo = async (): Promise<TotaisPorTipo> => {
  const contas = await listContas();
  const totais: TotaisPorTipo = { caixaDisponivel: 0, totalReservas: 0, totalFaturasAbertas: 0 };

  for (const conta of contas) {
    if (!conta.ativo) {
      continue;
    }

    const saldo = await saldoDaConta(conta.id);

    if (conta.tipo === 'caixa') {
      totais.caixaDisponivel += saldo;
    } else if (conta.tipo === 'reserva') {
      totais.totalReservas += saldo;
    } else {
      totais.totalFaturasAbertas += -saldo;
    }
  }

  return totais;
};

export const getContaById = async (id: string): Promise<Conta | null> => {
  const db = await getConnection();

  return await db.getFirstAsync<Conta>(
    `
        SELECT ${COLUNAS}
        FROM contas
        WHERE id = ?
    `,
    [id],
  );
};

export class ValidacaoContaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoContaError';
  }
}

const validarDia = (valor: number | null | undefined, rotulo: string): number | null => {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
    throw new ValidacaoContaError(`${rotulo} deve ser um inteiro entre 1 e 31.`);
  }

  return valor;
};

export type DadosConta = {
  nome: string;
  tipo: TipoConta;
  cor?: string | null;
  /** So cartao; obrigatorios quando o tipo e `cartao`. */
  diaFechamento?: number | null;
  diaVencimento?: number | null;
  /** So reserva; opcional. */
  metaValor?: number | null;
  saldoInicial?: number;
};

/** Aplica as regras por tipo: dia so em cartao, meta so em reserva. */
export const normalizarDadosConta = (
  dados: DadosConta,
): Pick<
  Conta,
  'nome' | 'tipo' | 'dia_fechamento' | 'dia_vencimento' | 'meta_valor' | 'saldo_inicial' | 'cor'
> => {
  const nome = dados.nome.trim();

  if (!nome) {
    throw new ValidacaoContaError('Nome da conta é obrigatório.');
  }

  if (!['caixa', 'reserva', 'cartao'].includes(dados.tipo)) {
    throw new ValidacaoContaError('Tipo de conta inválido.');
  }

  if (dados.tipo === 'cartao') {
    if (dados.diaFechamento == null || dados.diaVencimento == null) {
      throw new ValidacaoContaError('Cartão precisa do dia de fechamento e do dia de vencimento.');
    }
  }

  const diaFechamento =
    dados.tipo === 'cartao' ? validarDia(dados.diaFechamento, 'Dia de fechamento') : null;
  const diaVencimento =
    dados.tipo === 'cartao' ? validarDia(dados.diaVencimento, 'Dia de vencimento') : null;
  const metaValor =
    dados.tipo === 'reserva' && dados.metaValor != null && dados.metaValor > 0
      ? dados.metaValor
      : null;

  return {
    nome,
    tipo: dados.tipo,
    dia_fechamento: diaFechamento,
    dia_vencimento: diaVencimento,
    meta_valor: metaValor,
    saldo_inicial: dados.saldoInicial ?? 0,
    cor: dados.cor?.trim() || null,
  };
};

export const insertConta = async (conta: Conta): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO contas (id, nome, tipo, dia_fechamento, dia_vencimento, meta_valor,
                            saldo_inicial, cor, ativo, ordem, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      conta.id,
      conta.nome,
      conta.tipo,
      conta.dia_fechamento ?? null,
      conta.dia_vencimento ?? null,
      conta.meta_valor ?? null,
      conta.saldo_inicial,
      conta.cor ?? null,
      conta.ativo,
      conta.ordem,
      conta.created_at,
    ],
  );
};

export const updateConta = async (conta: Conta): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE contas
        SET nome            = ?,
            tipo            = ?,
            dia_fechamento  = ?,
            dia_vencimento  = ?,
            meta_valor      = ?,
            saldo_inicial   = ?,
            cor             = ?,
            ativo           = ?,
            ordem           = ?
        WHERE id = ?
    `,
    [
      conta.nome,
      conta.tipo,
      conta.dia_fechamento ?? null,
      conta.dia_vencimento ?? null,
      conta.meta_valor ?? null,
      conta.saldo_inicial,
      conta.cor ?? null,
      conta.ativo,
      conta.ordem,
      conta.id,
    ],
  );
};

/** Desativa a conta: sai dos seletores, mas o historico continua consultavel. */
export const inativarConta = async (id: string): Promise<void> => {
  const db = await getConnection();

  await db.runAsync('UPDATE contas SET ativo = 0 WHERE id = ?', [id]);
};

export const reativarConta = async (id: string): Promise<void> => {
  const db = await getConnection();

  await db.runAsync('UPDATE contas SET ativo = 1 WHERE id = ?', [id]);
};

/** Quantas transacoes apontam para a conta em qualquer uma das pontas. */
export const contarTransacoesDaConta = async (id: string): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ total: number }>(
    `
        SELECT COUNT(*) AS total
        FROM transacoes
        WHERE conta_id = ?
           OR conta_destino_id = ?
    `,
    [id, id],
  );

  return row?.total ?? 0;
};

/** So exclui quando nenhuma transacao usa a conta; senao, inativar. */
export const deleteContaById = async (id: string): Promise<void> => {
  const db = await getConnection();

  await db.runAsync('DELETE FROM contas WHERE id = ?', [id]);
};
