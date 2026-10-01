/**
 * Numeros do mes a partir das transacoes do caixa: gasto realizado, o que
 * ainda vai vencer, medias e a projecao de fechamento.
 *
 * A Home e a tela do mes usam a mesma conta, para as duas nunca mostrarem
 * projecoes diferentes para o mesmo mes.
 */

export type TransacaoDoMes = {
  valor: number;
  data: string;
  plano_id?: string | null;
};

/** Onde o mes esta em relacao a hoje. */
export type SituacaoMes = 'passado' | 'corrente' | 'futuro';

export type ProjecaoMes = {
  /** Saidas que ja aconteceram, sempre positivo. */
  gastoRealizado: number;
  /** Entradas que ja aconteceram, sempre positivo. */
  entradaRealizada: number;
  /** Saidas lancadas com vencimento depois de hoje, sempre positivo. */
  comprometido: number;
  mediaDiaria: number;
  /**
   * Media diaria dos gastos avulsos (sem plano). E ela que projeta o resto do
   * mes: parcelas e assinaturas ja entram pelo valor exato.
   */
  mediaDiariaVariavel: number;
  /** Realizado + comprometido + media dos gastos avulsos nos dias restantes. */
  projecao: number;
};

type ParametrosProjecao = {
  /** Data de hoje, YYYY-MM-DD: separa o realizado do que vai vencer. */
  hoje: string;
  situacao: SituacaoMes;
  /** Dias do mes ja vividos: 0 no mes futuro, todos no mes passado. */
  diasDecorridos: number;
  diasNoMes: number;
};

const gastoDe = (transacao: TransacaoDoMes): number =>
  transacao.valor < 0 ? Math.abs(transacao.valor) : 0;

const entradaDe = (transacao: TransacaoDoMes): number =>
  transacao.valor > 0 ? transacao.valor : 0;

export const projetarMes = (
  transacoes: TransacaoDoMes[],
  { hoje, situacao, diasDecorridos, diasNoMes }: ParametrosProjecao,
): ProjecaoMes => {
  let gastoRealizado = 0;
  let entradaRealizada = 0;
  let comprometido = 0;
  let gastoVariavel = 0;

  for (const transacao of transacoes) {
    if (transacao.data <= hoje) {
      gastoRealizado += gastoDe(transacao);
      entradaRealizada += entradaDe(transacao);

      // Parcelas e assinaturas voltam na projecao pelo valor exato: conta-las
      // tambem na media inflaria o mes.
      if (!transacao.plano_id) {
        gastoVariavel += gastoDe(transacao);
      }
    } else {
      comprometido += gastoDe(transacao);
    }
  }

  const mediaDiaria = diasDecorridos > 0 ? gastoRealizado / diasDecorridos : 0;
  const mediaDiariaVariavel = diasDecorridos > 0 ? gastoVariavel / diasDecorridos : 0;
  const diasRestantes = Math.max(0, diasNoMes - diasDecorridos);

  /** Mes fechado ja tem o total final; no mes corrente somamos o que falta. */
  const projecao =
    situacao === 'futuro'
      ? comprometido
      : situacao === 'corrente'
        ? gastoRealizado + comprometido + mediaDiariaVariavel * diasRestantes
        : gastoRealizado;

  return {
    gastoRealizado,
    entradaRealizada,
    comprometido,
    mediaDiaria,
    mediaDiariaVariavel,
    projecao,
  };
};
