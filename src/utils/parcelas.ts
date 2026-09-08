import dayjs from 'dayjs';

/**
 * Calendario e rateio de parcelas.
 *
 * Modulo puro (sem banco), justamente porque e a unica parte do parcelamento
 * com risco real de erro: arredondamento de centavos e datas de fim de mes.
 */

export type FrequenciaPlano = 'semanal' | 'mensal' | 'anual';

const UNIDADE_POR_FREQUENCIA: Record<FrequenciaPlano, dayjs.ManipulateType> = {
  semanal: 'week',
  mensal: 'month',
  anual: 'year',
};

export const ROTULO_FREQUENCIA: Record<FrequenciaPlano, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual',
};

/** Trava de seguranca do gerador: nenhum plano produz mais que isso de uma vez. */
const MAXIMO_OCORRENCIAS = 600;

/**
 * Divide o total entre as parcelas sem perder centavo: `100,00` em 3x vira
 * `33,34 + 33,33 + 33,33`. O resto vai para as primeiras parcelas, como no
 * parcelamento de cartao.
 */
export const dividirEmParcelas = (total: number, parcelas: number): number[] => {
  if (parcelas <= 0) {
    return [];
  }

  const sinal = total < 0 ? -1 : 1;
  const centavos = Math.round(Math.abs(total) * 100);
  const base = Math.floor(centavos / parcelas);
  const resto = centavos - base * parcelas;

  return Array.from(
    { length: parcelas },
    (_, indice) => (sinal * (base + (indice < resto ? 1 : 0))) / 100,
  );
};

/**
 * Data da ocorrencia `numero` (1-based) contada **sempre a partir do inicio**.
 *
 * Nunca some sobre a data anterior: uma compra do dia 31/01 cairia em 28/02 e
 * ficaria presa no dia 28 para sempre. Calculando da origem, o dia 31 volta em
 * marco.
 */
export const dataDaOcorrencia = (
  dataInicio: string,
  frequencia: FrequenciaPlano,
  intervalo: number,
  numero: number,
): string =>
  dayjs(dataInicio)
    .add((numero - 1) * Math.max(1, intervalo), UNIDADE_POR_FREQUENCIA[frequencia])
    .format('YYYY-MM-DD');

export type OcorrenciaPlano = {
  /** 1-based: a parcela 1 cai na propria data de inicio. */
  numero: number;
  data: string;
};

export type ParametrosOcorrencias = {
  dataInicio: string;
  frequencia: FrequenciaPlano;
  intervalo: number;
  /** Ultima data a materializar (inclusive). */
  ateData: string;
  /** Primeira ocorrencia a gerar; use o watermark do plano para nao repetir. */
  primeiroNumero?: number;
  /** Parcelamento: total de parcelas. `null` = assinatura sem fim. */
  totalOcorrencias?: number | null;
  /** Encerramento do plano: nada e gerado depois desta data. */
  dataFim?: string | null;
};

/** Ocorrencias do plano que ja deveriam existir ate `ateData`. */
export const ocorrenciasAte = ({
  dataInicio,
  frequencia,
  intervalo,
  ateData,
  primeiroNumero = 1,
  totalOcorrencias = null,
  dataFim = null,
}: ParametrosOcorrencias): OcorrenciaPlano[] => {
  const limite = dataFim && dataFim < ateData ? dataFim : ateData;
  const ocorrencias: OcorrenciaPlano[] = [];

  for (let numero = Math.max(1, primeiroNumero); ; numero += 1) {
    if (totalOcorrencias !== null && numero > totalOcorrencias) {
      break;
    }

    if (ocorrencias.length >= MAXIMO_OCORRENCIAS) {
      break;
    }

    const data = dataDaOcorrencia(dataInicio, frequencia, intervalo, numero);

    if (data > limite) {
      break;
    }

    ocorrencias.push({ numero, data });
  }

  return ocorrencias;
};

/** Todas as parcelas de uma compra: usado para gerar o parcelamento de uma vez. */
export const parcelasDaCompra = (
  total: number,
  parcelas: number,
  primeiraParcela: string,
  frequencia: FrequenciaPlano = 'mensal',
  intervalo = 1,
): { numero: number; data: string; valor: number }[] => {
  const valores = dividirEmParcelas(total, parcelas);

  return valores.map((valor, indice) => ({
    numero: indice + 1,
    data: dataDaOcorrencia(primeiraParcela, frequencia, intervalo, indice + 1),
    valor,
  }));
};

/** Primeira ocorrencia que cai em `aPartirDe` ou depois; `null` se o plano acabou. */
export const proximaOcorrencia = (
  params: Omit<ParametrosOcorrencias, 'ateData'> & { aPartirDe: string },
): OcorrenciaPlano | null => {
  const { dataInicio, frequencia, intervalo, aPartirDe } = params;
  const totalOcorrencias = params.totalOcorrencias ?? null;
  const dataFim = params.dataFim ?? null;

  for (
    let numero = Math.max(1, params.primeiroNumero ?? 1);
    numero <= (totalOcorrencias ?? MAXIMO_OCORRENCIAS);
    numero += 1
  ) {
    const data = dataDaOcorrencia(dataInicio, frequencia, intervalo, numero);

    if (dataFim && data > dataFim) {
      return null;
    }

    if (data >= aPartirDe) {
      return { numero, data };
    }
  }

  return null;
};

/**
 * Quanto o plano pesa por mes, para somar assinaturas de frequencias
 * diferentes na mesma conta.
 */
export const custoMensalEquivalente = (
  valor: number,
  frequencia: FrequenciaPlano,
  intervalo: number,
): number => {
  const periodos = Math.max(1, intervalo);

  if (frequencia === 'semanal') {
    return (valor * (52 / 12)) / periodos;
  }

  if (frequencia === 'anual') {
    return valor / (12 * periodos);
  }

  return valor / periodos;
};

/** Ex.: `3/12`. Vai no fim da descricao para aparecer em qualquer listagem. */
export const rotuloParcela = (numero: number, total: number | null): string =>
  total === null ? `${numero}a cobranca` : `${numero}/${total}`;
