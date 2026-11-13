import dayjs from 'dayjs';

type TransacaoDoMesAnterior = {
  /** Saida e negativa; entrada (positiva) nao e gasto e fica de fora. */
  valor: number;
  data: string;
};

/**
 * Gasto acumulado do mes anterior, dia a dia, encaixado nos dias do mes
 * exibido - e o que deixa as duas curvas no mesmo eixo.
 *
 * A posicao `i` e o gasto do dia 1 ate o dia `i + 1`. Os meses nao tem o mesmo
 * tamanho: o dia que nao existe no mes exibido (31 num mes de 30) entra no
 * ultimo dia, e o mes anterior mais curto (28 contra 31) segue plano ate o
 * fim. Assim a curva termina sempre no total do mes anterior.
 */
export const acumuladoMesAnterior = (
  transacoes: TransacaoDoMesAnterior[],
  diasNoMes: number,
): number[] => {
  if (diasNoMes <= 0) {
    return [];
  }

  const porDia = new Array<number>(diasNoMes).fill(0);

  for (const transacao of transacoes) {
    if (transacao.valor >= 0) {
      continue;
    }

    const indice = Math.min(dayjs(transacao.data).date(), diasNoMes) - 1;
    porDia[indice] += Math.abs(transacao.valor);
  }

  let acumulado = 0;

  return porDia.map((gasto) => {
    acumulado += gasto;
    return acumulado;
  });
};
