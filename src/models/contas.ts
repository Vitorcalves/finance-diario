import dayjs from 'dayjs';
import { getConnection } from './database';
import { type Transacoes } from './transacoesModel';

/** Colunas do extrato de movimentos (mesma ordem do type `Transacoes`). */
const COLUNAS_TRANSACOES = `
    id, descricao, valor, data, empresa_id, natureza, contabilizado_saldo, plano_id,
    parcela_numero, local, categoria_id, conta_id, conta_destino_id, fatura_id, created_at
`;

/**
 * Contas: onde o dinheiro esta.
 *
 * `caixa` entra no saldo disponivel; `reserva` e dinheiro alocado para um
 * objetivo (meta opcional) e `cartao` acumula divida ate a fatura ser paga.
 * Transferencias e pagamentos de fatura sao uma unica linha em `transacoes`
 * carregando as duas pontas (`conta_id` origem, `conta_destino_id` destino),
 * entao o saldo de cada ponta sai do mesmo valor com sinais opostos. O que
 * cada linha e vem da `natureza` (ver `naturezaTransacao.ts`).
 */

export type TipoConta = 'caixa' | 'reserva' | 'cartao';

/**
 * Conta criada pela migration 012 para o caixa unico global existente. Recebe
 * todo lancamento e plano sem conta escolhida, por isso nao pode ser
 * excluida, inativada nem mudar de tipo.
 */
export const CONTA_CAIXA_PADRAO = 'caixa-padrao';

const MENSAGEM_CAIXA_PADRAO =
  'O caixa padrão recebe os lançamentos sem conta: ele não pode ser excluído, inativado nem mudar de tipo.';

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
  /**
   * Saldo na data pedida: saldo inicial + o efeito de cada transacao na
   * conta (ver `EFEITO_NA_CONTA`). No cartao e a divida, negativa.
   */
  saldo: number;
  /** `1` quando alguma transacao usa a conta em qualquer ponta: o tipo fica travado. */
  possui_lancamentos: number;
};

const COLUNAS = `id, nome, tipo, dia_fechamento, dia_vencimento, meta_valor, saldo_inicial,
                 cor, ativo, ordem, created_at`;

/**
 * Efeito, com sinal, de uma linha de `transacoes` (`t`) no saldo da conta `c`:
 * - na origem (`conta_id`) soma `valor`: gasto ou entrada, compra no cartao
 *   (negativa, aumenta a divida), transferencia ou pagamento saindo;
 * - no destino (`conta_destino_id`, so em transferencia e pagamento de
 *   fatura) subtrai `valor`: a mesma linha, com o sinal invertido;
 * - o registro da compra parcelada nao pesa em lugar nenhum: quem pesa sao
 *   as parcelas, e conta-lo cobraria a compra em dobro.
 */
const EFEITO_NA_CONTA = `
    CASE
        WHEN t.natureza = 'registro_compra' THEN 0
        WHEN t.conta_id = c.id THEN t.valor
        WHEN t.conta_destino_id = c.id THEN -t.valor
        ELSE 0
        END
`;

/**
 * Saldo da conta `c` na data do parametro (YYYY-MM-DD), somado no banco.
 *
 * Caixa e reserva contam so o que ja aconteceu: parcela, assinatura ou
 * transferencia com data futura ainda nao mexeu no dinheiro. No cartao a
 * divida nasce na compra, entao as parcelas futuras ja contam. O corte olha
 * so o dia, porque ha lancamentos gravados com hora (`YYYY-MM-DDTHH:mm`).
 */
const EXPRESSAO_SALDO = `
    c.saldo_inicial
        + COALESCE((SELECT SUM(${EFEITO_NA_CONTA})
                    FROM transacoes t
                    WHERE (t.conta_id = c.id OR t.conta_destino_id = c.id)
                      AND (c.tipo = 'cartao' OR substr(t.data, 1, 10) <= ?)), 0)
`;

/** `1` quando alguma transacao usa a conta `c` em qualquer ponta. */
const POSSUI_LANCAMENTOS = `
    EXISTS (SELECT 1
            FROM transacoes t
            WHERE t.conta_id = c.id
               OR t.conta_destino_id = c.id)
`;

const SQL_SALDO = `
    SELECT ${EXPRESSAO_SALDO} AS saldo
    FROM contas c
    WHERE c.id = ?
`;

const hojeIso = (): string => dayjs().format('YYYY-MM-DD');

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

/**
 * Todas as contas com o saldo em `ate` (padrao: hoje). A Home e a tela de
 * Contas leem daqui, para as duas nunca mostrarem saldos diferentes.
 */
export const listContasComSaldo = async (ate: string = hojeIso()): Promise<ContaComSaldo[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ContaComSaldo>(
    `
        SELECT c.id, c.nome, c.tipo, c.dia_fechamento, c.dia_vencimento, c.meta_valor,
               c.saldo_inicial, c.cor, c.ativo, c.ordem, c.created_at,
               ${EXPRESSAO_SALDO} AS saldo,
               ${POSSUI_LANCAMENTOS} AS possui_lancamentos
        FROM contas c
        ORDER BY c.ativo DESC, c.ordem, c.created_at
    `,
    [ate],
  );
};

export const saldoDaConta = async (contaId: string, ate: string = hojeIso()): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ saldo: number | null }>(SQL_SALDO, [ate, contaId]);

  return row?.saldo ?? 0;
};

/**
 * Movimentos que tocaram a conta em qualquer das pontas (origem ou destino),
 * mais recentes primeiro: aportes, resgates e transferencias com ela.
 */
export const listMovimentosDaConta = async (
  contaId: string,
  limite = 100,
): Promise<Transacoes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Transacoes>(
    `
        SELECT ${COLUNAS_TRANSACOES}
        FROM transacoes
        WHERE conta_id = ?
           OR conta_destino_id = ?
        ORDER BY data DESC, created_at DESC
        LIMIT ?
    `,
    [contaId, contaId, limite],
  );
};

/** Total aportado na conta (transferencias que chegaram nela) no mes. */
export const totalAportadoNoMes = async (contaId: string, mesRef: string): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ total: number | null }>(
    `
        SELECT SUM(-valor) AS total
        FROM transacoes
        WHERE natureza = 'transferencia'
          AND conta_destino_id = ?
          AND strftime('%Y-%m', data) = ?
    `,
    [contaId, mesRef],
  );

  return row?.total ?? 0;
};

export type TotaisPorTipo = {
  /** Soma dos saldos das contas caixa ativas. */
  caixaDisponivel: number;
  /** Soma dos saldos das reservas ativas. */
  totalReservas: number;
  /** Divida total dos cartoes ativos (valor positivo). */
  totalFaturasAbertas: number;
};

/** Soma os saldos ja carregados por tipo; conta inativa fica de fora. */
export const somarPorTipo = (contas: ContaComSaldo[]): TotaisPorTipo => {
  const totais: TotaisPorTipo = { caixaDisponivel: 0, totalReservas: 0, totalFaturasAbertas: 0 };

  for (const conta of contas) {
    if (!conta.ativo) {
      continue;
    }

    if (conta.tipo === 'caixa') {
      totais.caixaDisponivel += conta.saldo;
    } else if (conta.tipo === 'reserva') {
      totais.totalReservas += conta.saldo;
    } else {
      totais.totalFaturasAbertas += -conta.saldo;
    }
  }

  return totais;
};

/** Caixa disponivel, total em reservas e divida aberta nos cartoes, em `ate` (padrao: hoje). */
export const totaisPorTipo = async (ate: string = hojeIso()): Promise<TotaisPorTipo> =>
  somarPorTipo(await listContasComSaldo(ate));

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

/**
 * O tipo define como cada lancamento da conta foi gravado (compra no cartao
 * tem fatura; no caixa, nao). Por isso ele so muda numa conta sem
 * lancamentos, e o caixa padrao e sempre caixa.
 */
export const podeMudarTipo = (conta: ContaComSaldo): boolean =>
  conta.id !== CONTA_CAIXA_PADRAO && !conta.possui_lancamentos;

/** Toda conta pode sair da lista, menos o caixa padrao. */
export const podeRemoverConta = (conta: Conta): boolean => conta.id !== CONTA_CAIXA_PADRAO;

/**
 * Atualiza a conta. Recusa (com `ValidacaoContaError`) mudar o tipo de uma
 * conta com lancamentos e mexer no tipo ou no `ativo` do caixa padrao.
 */
export const updateConta = async (conta: Conta): Promise<void> => {
  const db = await getConnection();
  const atual = await getContaById(conta.id);

  if (atual && conta.id === CONTA_CAIXA_PADRAO && (conta.tipo !== atual.tipo || !conta.ativo)) {
    throw new ValidacaoContaError(MENSAGEM_CAIXA_PADRAO);
  }

  if (atual && conta.tipo !== atual.tipo && (await contarTransacoesDaConta(conta.id)) > 0) {
    throw new ValidacaoContaError(
      'Esta conta já tem lançamentos, então o tipo dela não pode mudar.',
    );
  }

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
  if (id === CONTA_CAIXA_PADRAO) {
    throw new ValidacaoContaError(MENSAGEM_CAIXA_PADRAO);
  }

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

/**
 * So exclui quando nenhuma transacao usa a conta (senao, inativar): a FK
 * deixaria o historico sem conta. O caixa padrao nunca sai.
 */
export const deleteContaById = async (id: string): Promise<void> => {
  if (id === CONTA_CAIXA_PADRAO) {
    throw new ValidacaoContaError(MENSAGEM_CAIXA_PADRAO);
  }

  if ((await contarTransacoesDaConta(id)) > 0) {
    throw new ValidacaoContaError(
      'Esta conta tem lançamentos e não pode ser excluída. Inative a conta para tirá-la dos seletores.',
    );
  }

  const db = await getConnection();

  // Faturas vazias de um cartao sem compras saem junto: `faturas` nao tem FK.
  await db.runAsync('DELETE FROM faturas WHERE conta_id = ?', [id]);
  await db.runAsync('DELETE FROM contas WHERE id = ?', [id]);
};
