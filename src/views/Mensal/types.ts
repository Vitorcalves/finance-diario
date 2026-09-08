import type { Transacoes } from '../../models/transacoesModel';

export type DiaDoMes = {
  /** Data no formato YYYY-MM-DD. */
  data: string;
  dia: number;
  /** Total gasto no dia, sempre positivo (saidas). */
  gasto: number;
  /** Total recebido no dia, sempre positivo (entradas). */
  entrada: number;
  /** Gasto somado do dia 1 ate este dia. */
  acumulado: number;
  fimDeSemana: boolean;
  /** Dias ainda nao vividos no mes corrente: sem barra, so projecao. */
  futuro: boolean;
  hoje: boolean;
};

export type ResumoMes = {
  gastoTotal: number;
  entradaTotal: number;
  mediaDiaria: number;
  /** No mes corrente, a media diaria projetada ate o fim do mes. */
  projecao: number;
  diasComGasto: number;
  maiorDia: DiaDoMes | null;
};

export type ComparativoMes = {
  /** Total fechado do mes anterior. */
  totalAnterior: number;
  /** Total do mes anterior ate o mesmo dia do mes atual. */
  ateMesmoDia: number;
  /** Variacao percentual contra `ateMesmoDia`; `null` quando nao ha base. */
  variacao: number | null;
};

export type DetalheDoDia = {
  dia: DiaDoMes;
  lancamentos: Transacoes[];
};
