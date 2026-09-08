import type { Transacoes } from '../../models/transacoesModel';

export type DiaDoMes = {
  /** Data no formato YYYY-MM-DD. */
  data: string;
  dia: number;
  /** Total gasto no dia, sempre positivo (saidas ja realizadas). */
  gasto: number;
  /** Saidas ja lancadas para um dia futuro: parcelas e assinaturas a vencer. */
  comprometido: number;
  /** Total recebido no dia, sempre positivo (entradas). */
  entrada: number;
  /** Gasto realizado somado do dia 1 ate este dia. */
  acumulado: number;
  fimDeSemana: boolean;
  /** Dias ainda nao vividos no mes corrente: sem barra cheia, so projecao. */
  futuro: boolean;
  hoje: boolean;
};

export type ResumoMes = {
  gastoTotal: number;
  entradaTotal: number;
  mediaDiaria: number;
  /**
   * Media diaria dos gastos avulsos (sem plano). E ela que projeta o resto do
   * mes: parcelas e assinaturas ja entram pelo valor exato.
   */
  mediaDiariaVariavel: number;
  /** Saidas do mes ja lancadas com vencimento futuro. */
  comprometido: number;
  /** Realizado + comprometido a vencer + media dos gastos avulsos restantes. */
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
