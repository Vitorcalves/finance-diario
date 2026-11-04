import dayjs from 'dayjs';

/**
 * Calendario do ciclo de fatura do cartao de credito.
 *
 * Modulo puro (sem banco), no mesmo espirito de `utils/parcelas.ts`: a view
 * nunca calcula data na mao, so pergunta aqui qual fatura recebe uma compra
 * ou quais sao os proximos ciclos.
 */

export type CicloFatura = {
  /** 'YYYY-MM' do ciclo: identifica a fatura junto com o cartao. */
  mesRef: string;
  /** YYYY-MM-DD do fechamento. */
  dataFechamento: string;
  /** YYYY-MM-DD do vencimento. */
  dataVencimento: string;
};

/** Dia do mes ajustado ao tamanho dele: fechamento dia 31 em abril vira 30. */
const clampDia = (mes: dayjs.Dayjs, dia: number): number => Math.min(dia, mes.daysInMonth());

/**
 * Ciclo que fecha em `mes` (qualquer dia valido dele).
 *
 * Vencimento no mês do fechamento quando o dia de vencimento cai depois do
 * fechamento (ex.: fecha dia 10, vence dia 20 do mesmo mês); caso contrário
 * no mês seguinte (regra típica BR: fecha dia 30, vence dia 10 do mês
 * seguinte). A comparação usa os dias configurados, antes do clamp.
 */
const cicloDoMes = (
  mes: dayjs.Dayjs,
  diaFechamento: number,
  diaVencimento: number,
): CicloFatura => {
  const fechamento = mes.date(clampDia(mes, diaFechamento));
  const mesVencimento = diaVencimento > diaFechamento ? mes : mes.add(1, 'month');
  const vencimento = mesVencimento.date(clampDia(mesVencimento, diaVencimento));

  return {
    mesRef: mes.format('YYYY-MM'),
    dataFechamento: fechamento.format('YYYY-MM-DD'),
    dataVencimento: vencimento.format('YYYY-MM-DD'),
  };
};

/**
 * Qual fatura recebe uma compra feita em `dataCompra`?
 *
 * Compra com dia menor ou igual ao fechamento entra na fatura que fecha
 * neste mês; compra depois do fechamento já cai no ciclo seguinte.
 */
export const faturaDaCompra = (
  dataCompra: string,
  diaFechamento: number,
  diaVencimento: number,
): CicloFatura => {
  const data = dayjs(dataCompra);
  const mes = data.date() <= diaFechamento ? data : data.add(1, 'month');

  return cicloDoMes(mes, diaFechamento, diaVencimento);
};

/** Próximos `quantidade` ciclos de um cartão, a partir do ciclo de `deData` (inclusive). */
export const proximosCiclos = (
  deData: string,
  diaFechamento: number,
  diaVencimento: number,
  quantidade: number,
): CicloFatura[] => {
  const primeiro = faturaDaCompra(deData, diaFechamento, diaVencimento);
  const mesInicial = dayjs(`${primeiro.mesRef}-01`);

  return Array.from({ length: Math.max(0, quantidade) }, (_, indice) =>
    cicloDoMes(mesInicial.add(indice, 'month'), diaFechamento, diaVencimento),
  );
};
