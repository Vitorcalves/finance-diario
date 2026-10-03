import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

/** Periodos rapidos do filtro de lancamentos. */
export type PeriodoBusca = 'mes' | 'mesPassado' | 'ultimos90' | 'ano' | 'tudo' | 'personalizado';

export const ROTULO_PERIODO: Record<PeriodoBusca, string> = {
  mes: 'Este mês',
  mesPassado: 'Mês passado',
  ultimos90: 'Últimos 90 dias',
  ano: 'Este ano',
  tudo: 'Todo o período',
  personalizado: 'Personalizado',
};

export type Intervalo = {
  /** YYYY-MM-DD inclusivo; `null` = sem limite. */
  inicio: string | null;
  fim: string | null;
};

const FORMATO = 'YYYY-MM-DD';

/**
 * Datas de inicio e fim de um periodo, a partir de `hoje` (YYYY-MM-DD).
 *
 * "Este mes" vai ate o ultimo dia do mes: parcelas e assinaturas ja lancadas
 * para os proximos dias tambem aparecem.
 */
export const intervaloDoPeriodo = (
  periodo: PeriodoBusca,
  hoje: string,
  personalizado: Intervalo = { inicio: null, fim: null },
): Intervalo => {
  const base = dayjs(hoje);

  switch (periodo) {
    case 'mes':
      return {
        inicio: base.startOf('month').format(FORMATO),
        fim: base.endOf('month').format(FORMATO),
      };
    case 'mesPassado': {
      const passado = base.subtract(1, 'month');
      return {
        inicio: passado.startOf('month').format(FORMATO),
        fim: passado.endOf('month').format(FORMATO),
      };
    }
    case 'ultimos90':
      return { inicio: base.subtract(89, 'day').format(FORMATO), fim: base.format(FORMATO) };
    case 'ano':
      return {
        inicio: base.startOf('year').format(FORMATO),
        fim: base.endOf('year').format(FORMATO),
      };
    case 'personalizado':
      return personalizado;
    default:
      return { inicio: null, fim: null };
  }
};

/** Data curta para caber no filtro: `01/09/26`. */
const curta = (data: string): string => dayjs(data).format('DD/MM/YY');

/**
 * Rotulo curto de um intervalo personalizado: um mes inteiro vira
 * "Setembro de 2026"; os demais, "01/09/26 a 15/09/26", "Desde..." ou "Até...".
 */
export const rotuloIntervalo = ({ inicio, fim }: Intervalo): string => {
  if (inicio && fim) {
    const mes = dayjs(inicio);
    const mesInteiro =
      mes.date() === 1 && fim === mes.endOf('month').format(FORMATO) && inicio <= fim;

    if (mesInteiro) {
      const nome = mes.locale('pt-br').format('MMMM [de] YYYY');
      return nome.charAt(0).toUpperCase() + nome.slice(1);
    }

    return `${curta(inicio)} a ${curta(fim)}`;
  }

  if (inicio) {
    return `Desde ${curta(inicio)}`;
  }

  return fim ? `Até ${curta(fim)}` : ROTULO_PERIODO.tudo;
};
