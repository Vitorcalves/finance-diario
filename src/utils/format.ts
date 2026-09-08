import dayjs from 'dayjs';

/**
 * Formatadores compartilhados por todas as telas.
 *
 * As instancias de `Intl.NumberFormat` ficam no escopo do modulo para nao
 * recriar o formatador a cada render de lista.
 */

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatadorMoedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const formatadorPercentual = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

/** Precos por unidade primaria podem ser centavos (ex.: R$ 0,0125/un). */
const formatadorMoedaFina = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Ex.: `R$ 1.234,56`. */
export const toCurrency = (valor: number): string => formatadorMoeda.format(valor);

/** Ex.: `R$ 1.235` - usado nas escalas dos graficos. */
export const toCurrencyCurto = (valor: number): string => formatadorMoedaCurta.format(valor);

/**
 * Ex.: `R$ 9,99/kg`. Abaixo de R$ 1,00 mostra ate 4 casas para nao virar
 * `R$ 0,00` em produtos vendidos em unidades pequenas.
 */
export const toCurrencyPorUnidade = (valor: number, sigla: string): string => {
  const formatador = Math.abs(valor) < 1 ? formatadorMoedaFina : formatadorMoeda;
  return `${formatador.format(valor)}/${sigla}`;
};

/** Ex.: `+12,5%`. */
export const toPercent = (valor: number): string =>
  `${valor > 0 ? '+' : ''}${formatadorPercentual.format(valor)}%`;

/** Ex.: `08/09/2026`. */
export const formatarData = (data: string): string => dayjs(data).format('DD/MM/YYYY');

/** Ex.: `08/09/2026 14:30`. */
export const formatarDataHora = (data: string): string => dayjs(data).format('DD/MM/YYYY HH:mm');
