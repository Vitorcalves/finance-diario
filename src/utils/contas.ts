import {
  type Conta,
  CONTA_CAIXA_PADRAO,
  type ContaComSaldo,
  ROTULO_TIPO_CONTA,
  type TipoConta,
} from '../models/contas';
import { CORES_CATEGORIA, type CorCategoria } from '../theme/colors';
import { toCurrency } from './format';

/**
 * Como cada conta aparece na tela: o numero principal, a linha de apoio, o
 * progresso da meta e a secao. Tudo puro, para a tela de Contas e a Home
 * mostrarem a mesma coisa.
 */

/** Cor de cada tipo quando a conta nao escolheu uma; mesma paleta das categorias. */
export const COR_PADRAO_TIPO_CONTA: Record<TipoConta, CorCategoria> = {
  caixa: 'aqua',
  reserva: 'azul',
  cartao: 'violeta',
};

/** Contas criadas quando a cor era texto livre podem guardar um hex. */
const HEX_ANTIGO = /^#[0-9a-f]{6}$/i;

/**
 * Cor da conta. `cor` guarda a chave da paleta (`azul`...), que se adapta ao
 * tema claro e escuro; um hex antigo continua valendo; sem cor (ou com valor
 * desconhecido) vale a do tipo. `corCategoria` vem do tema (`useTheme`).
 */
export const corDaConta = (
  conta: Pick<Conta, 'tipo' | 'cor'>,
  corCategoria: (chave: string | null | undefined) => string,
): string => {
  if (conta.cor && HEX_ANTIGO.test(conta.cor)) {
    return conta.cor;
  }

  const chave =
    conta.cor && (CORES_CATEGORIA as string[]).includes(conta.cor)
      ? conta.cor
      : COR_PADRAO_TIPO_CONTA[conta.tipo];

  return corCategoria(chave);
};

/** Quanto da meta a reserva ja juntou. */
export type ProgressoMeta = {
  /** De 0 a 1, para a barra. */
  fracao: number;
  /** De 0 a 100, arredondado para baixo: so mostra 100% quando a meta chega. */
  percentual: number;
  /** Quanto falta; `0` quando a meta foi atingida. */
  falta: number;
};

/** Progresso da reserva contra a meta; `null` fora da reserva ou sem meta. */
export const progressoDaMeta = (
  conta: Pick<ContaComSaldo, 'tipo' | 'meta_valor' | 'saldo'>,
): ProgressoMeta | null => {
  if (conta.tipo !== 'reserva' || !conta.meta_valor || conta.meta_valor <= 0) {
    return null;
  }

  const fracao = Math.min(Math.max(conta.saldo / conta.meta_valor, 0), 1);

  return {
    fracao,
    percentual: Math.floor(fracao * 100),
    falta: Math.max(conta.meta_valor - conta.saldo, 0),
  };
};

export type ValorDaConta = {
  /** O que o numero e: "Saldo", "Em aberto" ou "Crédito". */
  rotulo: string;
  valor: number;
  /** So caixa e reserva ficam negativos; divida de cartao e o normal dele. */
  negativo: boolean;
};

/**
 * Numero principal da conta. No caixa e na reserva e o saldo. No cartao o
 * saldo e a divida (negativa): aparece positiva, como "em aberto", e o que foi
 * pago a mais aparece como credito.
 */
export const valorDaConta = (conta: Pick<ContaComSaldo, 'tipo' | 'saldo'>): ValorDaConta => {
  // `+ 0` troca -0 por 0, que o formatador mostraria como "-R$ 0,00".
  if (conta.tipo === 'cartao') {
    return conta.saldo > 0
      ? { rotulo: 'Crédito', valor: conta.saldo, negativo: false }
      : { rotulo: 'Em aberto', valor: -conta.saldo + 0, negativo: false };
  }

  return { rotulo: 'Saldo', valor: conta.saldo + 0, negativo: conta.saldo < 0 };
};

/**
 * Linha de apoio do card: o que define a conta alem do nome. Na secao de
 * inativas os tipos se misturam, entao o tipo vem na frente.
 */
export const descreverConta = (
  conta: Pick<
    ContaComSaldo,
    'id' | 'tipo' | 'ativo' | 'meta_valor' | 'dia_fechamento' | 'dia_vencimento'
  >,
): string => {
  const detalhe =
    conta.tipo === 'cartao'
      ? `Fecha dia ${conta.dia_fechamento ?? '-'} · vence dia ${conta.dia_vencimento ?? '-'}`
      : conta.tipo === 'reserva'
        ? conta.meta_valor
          ? `Meta de ${toCurrency(conta.meta_valor)}`
          : 'Sem meta definida'
        : conta.id === CONTA_CAIXA_PADRAO
          ? 'Conta padrão'
          : '';

  if (conta.ativo) {
    return detalhe;
  }

  return detalhe ? `${ROTULO_TIPO_CONTA[conta.tipo]} · ${detalhe}` : ROTULO_TIPO_CONTA[conta.tipo];
};

export type ChaveSecaoContas = TipoConta | 'inativas';

export type SecaoContas = {
  chave: ChaveSecaoContas;
  titulo: string;
  contas: ContaComSaldo[];
};

const TITULO_SECAO: Record<ChaveSecaoContas, string> = {
  caixa: 'Caixas',
  reserva: 'Reservas',
  cartao: 'Cartões',
  inativas: 'Inativas',
};

const ORDEM_SECOES: ChaveSecaoContas[] = ['caixa', 'reserva', 'cartao', 'inativas'];

/**
 * Secoes da tela de Contas: caixas, reservas, cartoes e, por ultimo, as
 * inativas de qualquer tipo. Secao vazia some; a ordem das contas dentro de
 * cada uma e a que veio do banco.
 */
export const agruparContas = (contas: ContaComSaldo[]): SecaoContas[] =>
  ORDEM_SECOES.map((chave) => ({
    chave,
    titulo: TITULO_SECAO[chave],
    contas: contas.filter((conta) =>
      chave === 'inativas' ? !conta.ativo : Boolean(conta.ativo) && conta.tipo === chave,
    ),
  })).filter((secao) => secao.contas.length > 0);
