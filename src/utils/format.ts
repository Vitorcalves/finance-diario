import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

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

/** Quantidades de item: inteiras nos pacotes, ate 3 casas nos itens a granel (0,750 kg). */
const formatadorQuantidade = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});

/** Ex.: `2` ou `0,75`. */
export const formatarQuantidade = (valor: number): string => formatadorQuantidade.format(valor);

/** Ex.: `R$ 1.234,56`. */
export const toCurrency = (valor: number): string => formatadorMoeda.format(valor);

const formatadorValor = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Ex.: `1.234,56` - valor sem o `R$`, para listas de precos apertadas. */
export const formatarMoeda = (valor: number): string => formatadorValor.format(valor);

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

/** Ex.: `Hoje`, `Ontem`, `Amanhã` ou `Qui, 24 set` (com o ano quando nao e o atual). */
export const formatarDiaRelativo = (
  data: string,
  hoje: string = dayjs().format('YYYY-MM-DD'),
): string => {
  const dia = dayjs(data).startOf('day');
  const base = dayjs(hoje).startOf('day');
  const diferenca = dia.diff(base, 'day');

  if (diferenca === 0) {
    return 'Hoje';
  }

  if (diferenca === -1) {
    return 'Ontem';
  }

  if (diferenca === 1) {
    return 'Amanhã';
  }

  const texto = dia
    .locale('pt-br')
    .format(dia.year() === base.year() ? 'ddd, DD MMM' : 'ddd, DD MMM YYYY');

  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
