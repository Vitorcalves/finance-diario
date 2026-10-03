type ComData = { data: string; valor: number };

/** Um dia de uma lista de lancamentos. */
export type GrupoDia<T extends ComData> = {
  /** YYYY-MM-DD (ou a data com hora, como gravada). */
  dia: string;
  /** Soma com sinal dos lancamentos do dia. */
  total: number;
  /** Lancamentos do dia (o nome `data` e o que a SectionList espera). */
  data: T[];
};

/** Agrupa por dia, do mais recente para o mais antigo, mantendo a ordem dentro do dia. */
export const agruparPorDia = <T extends ComData>(transacoes: T[]): GrupoDia<T>[] => {
  const porDia = new Map<string, T[]>();

  for (const transacao of transacoes) {
    const doDia = porDia.get(transacao.data) ?? [];
    doDia.push(transacao);
    porDia.set(transacao.data, doDia);
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([dia, doDia]) => ({
      dia,
      total: doDia.reduce((soma, transacao) => soma + transacao.valor, 0),
      data: doDia,
    }));
};
