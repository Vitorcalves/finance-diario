/**
 * Inflacao pessoal: quanto a cesta de compras de verdade subiu mes a mes.
 *
 * A conta e a de um indice de precos encadeado, com os dados do proprio app:
 *
 * - **Item** e uma variante (mesma marca, mesma embalagem): so assim a
 *   comparacao e do mesmo produto, e nao de uma troca de marca.
 * - **Preco do mes** e a media dos registros do historico de precos no mes
 *   (pagos e cotados). Mes sem registro repete o ultimo preco conhecido; a
 *   mudanca aparece no mes em que o item volta a ter preco.
 * - **Peso** e quanto foi gasto no item nos ultimos `JANELA_PESOS` meses: item
 *   so cotado, nunca comprado, nao esta na cesta.
 * - **Variacao do mes** e a media, ponderada pelo peso, de preco do mes sobre
 *   preco do mes anterior, entre os itens que tem os dois.
 * - **Acumulado** encadeia as variacoes a partir do mes base do periodo.
 */

/** Meses de compras (o mes da conta e os anteriores) que formam o peso de um item. */
export const JANELA_PESOS = 12;

/** Um preco do historico (pago ou cotado) de um item. */
export type PrecoDoItem = {
  itemId: string;
  /** Data do registro; so o mes (`YYYY-MM`) entra na conta. */
  data: string;
  preco: number;
};

/** Uma compra de verdade do item: e ela que da o peso dele na cesta. */
export type CompraDoItem = {
  itemId: string;
  data: string;
  /** Preco unitario x quantidade. */
  total: number;
};

export type MesInflacao = {
  /** `YYYY-MM`. */
  mes: string;
  /** Variacao da cesta contra o mes anterior, em %; `null` sem item comparavel. */
  variacao: number | null;
  /** Variacao somada desde o mes base do periodo, em %. */
  acumulado: number;
  /** Itens comparados no mes: com preco no mes anterior e peso na cesta. */
  itens: number;
  /** Quantos deles tiveram preco registrado no proprio mes; o resto repete o ultimo. */
  itensComPrecoNovo: number;
};

export type ItemInflacao = {
  itemId: string;
  /** Preco do item ao entrar no periodo e no ultimo mes em que foi comparado. */
  precoInicial: number;
  precoFinal: number;
  /** Variacao do preco do item no periodo, em %. */
  variacao: number;
  /**
   * Quanto o item sozinho mexeu no acumulado da cesta, em pontos percentuais.
   * A soma dos impactos de todos os itens e o acumulado do periodo.
   */
  impacto: number;
  /** Fatia do item na cesta no ultimo mes em que foi comparado, de 0 a 1. */
  participacao: number;
};

export type InflacaoPessoal = {
  /** Mes de partida do acumulado (`YYYY-MM`); `null` sem dois meses de precos. */
  mesBase: string | null;
  /** Um por mes depois do base, do mais antigo para o mais recente. */
  meses: MesInflacao[];
  /** Acumulado do periodo, em %; `null` quando nenhum mes teve item comparavel. */
  acumulado: number | null;
  /** Itens da cesta no periodo, do maior impacto (para cima ou para baixo) ao menor. */
  itens: ItemInflacao[];
};

export type OpcoesInflacao = {
  /** Ultimo mes que pode entrar (`YYYY-MM`), em geral o mes corrente. */
  mesFinal: string;
  /** Quantos meses mostrar, contados do mais recente; `null` mostra tudo. */
  meses?: number | null;
};

type Comparacao = {
  itemId: string;
  peso: number;
  anterior: number;
  atual: number;
  novo: boolean;
};

type MesCalculado = {
  indice: number;
  variacao: number | null;
  somaPesos: number;
  comparacoes: Comparacao[];
};

const FORMATO_MES = /^\d{4}-\d{2}/;

/** Meses contados em sequencia (ano x 12 + mes), para somar e subtrair meses. */
const indiceDoMes = (data: string): number | null =>
  FORMATO_MES.test(data) ? Number(data.slice(0, 4)) * 12 + Number(data.slice(5, 7)) - 1 : null;

const mesDoIndice = (indice: number): string =>
  `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;

const valido = (valor: number): boolean => Number.isFinite(valor) && valor > 0;

const VAZIA: InflacaoPessoal = { mesBase: null, meses: [], acumulado: null, itens: [] };

/** Preco medio de cada item em cada mes: `mes -> item -> preco`. */
const precosPorMes = (precos: PrecoDoItem[], limite: number): Map<number, Map<string, number>> => {
  const somas = new Map<number, Map<string, { soma: number; registros: number }>>();

  for (const registro of precos) {
    const mes = indiceDoMes(registro.data);

    if (mes === null || mes > limite || !valido(registro.preco)) {
      continue;
    }

    const doMes = somas.get(mes) ?? new Map<string, { soma: number; registros: number }>();
    const atual = doMes.get(registro.itemId) ?? { soma: 0, registros: 0 };
    atual.soma += registro.preco;
    atual.registros += 1;
    doMes.set(registro.itemId, atual);
    somas.set(mes, doMes);
  }

  const medias = new Map<number, Map<string, number>>();

  for (const [mes, doMes] of somas) {
    medias.set(
      mes,
      new Map([...doMes].map(([itemId, { soma, registros }]) => [itemId, soma / registros])),
    );
  }

  return medias;
};

/** Gasto de cada item em cada mes: `item -> mes -> total`. */
const gastosPorItem = (compras: CompraDoItem[]): Map<string, Map<number, number>> => {
  const gastos = new Map<string, Map<number, number>>();

  for (const compra of compras) {
    const mes = indiceDoMes(compra.data);

    if (mes === null || !valido(compra.total)) {
      continue;
    }

    const doItem = gastos.get(compra.itemId) ?? new Map<number, number>();
    doItem.set(mes, (doItem.get(mes) ?? 0) + compra.total);
    gastos.set(compra.itemId, doItem);
  }

  return gastos;
};

/** Variacao de cada mes, do segundo mes com preco ate o ultimo. */
const calcularMeses = (
  porMes: Map<number, Map<string, number>>,
  gastos: Map<string, Map<number, number>>,
  primeiro: number,
  ultimo: number,
): MesCalculado[] => {
  const pesoNoMes = (itemId: string, mes: number): number => {
    const doItem = gastos.get(itemId);

    if (!doItem) {
      return 0;
    }

    let soma = 0;

    for (let indice = mes - JANELA_PESOS + 1; indice <= mes; indice += 1) {
      soma += doItem.get(indice) ?? 0;
    }

    return soma;
  };

  /** Ultimo preco conhecido de cada item ate o mes anterior ao da conta. */
  const conhecidos = new Map(porMes.get(primeiro));
  const meses: MesCalculado[] = [];

  for (let indice = primeiro + 1; indice <= ultimo; indice += 1) {
    const registrados = porMes.get(indice) ?? new Map<string, number>();
    const comparacoes: Comparacao[] = [];
    let somaPesos = 0;
    let somaPonderada = 0;

    for (const [itemId, anterior] of conhecidos) {
      const peso = pesoNoMes(itemId, indice);

      if (peso <= 0) {
        continue;
      }

      const atual = registrados.get(itemId) ?? anterior;
      comparacoes.push({ itemId, peso, anterior, atual, novo: registrados.has(itemId) });
      somaPesos += peso;
      somaPonderada += peso * (atual / anterior);
    }

    meses.push({
      indice,
      variacao: somaPesos > 0 ? (somaPonderada / somaPesos - 1) * 100 : null,
      somaPesos,
      comparacoes,
    });

    // Item que aparece agora entra na comparacao a partir do mes seguinte.
    for (const [itemId, preco] of registrados) {
      conhecidos.set(itemId, preco);
    }
  }

  return meses;
};

/**
 * Calcula a inflacao da cesta a partir do historico de precos (`precos`) e
 * das compras de verdade (`compras`), recortada nos ultimos `meses` meses.
 *
 * A variacao de um mes nao depende do recorte: o periodo so escolhe de onde o
 * acumulado parte.
 */
export const calcularInflacao = (
  precos: PrecoDoItem[],
  compras: CompraDoItem[],
  { mesFinal, meses = null }: OpcoesInflacao,
): InflacaoPessoal => {
  const limite = indiceDoMes(mesFinal);

  if (limite === null) {
    return VAZIA;
  }

  const porMes = precosPorMes(precos, limite);

  if (porMes.size === 0) {
    return VAZIA;
  }

  const comPreco = [...porMes.keys()];
  const primeiro = Math.min(...comPreco);
  const ultimo = Math.max(...comPreco);

  if (ultimo === primeiro) {
    // Um mes so: ainda nao ha com o que comparar.
    return { ...VAZIA, mesBase: mesDoIndice(primeiro) };
  }

  const todos = calcularMeses(porMes, gastosPorItem(compras), primeiro, ultimo);
  const periodo = meses && meses > 0 ? todos.slice(-meses) : todos;

  const itens = new Map<string, ItemInflacao>();
  const resultado: MesInflacao[] = [];
  /** Indice da cesta, 1 no mes base. */
  let fator = 1;

  for (const mes of periodo) {
    for (const { itemId, peso, anterior, atual } of mes.comparacoes) {
      const fatia = peso / mes.somaPesos;
      const item = itens.get(itemId) ?? {
        itemId,
        precoInicial: anterior,
        precoFinal: atual,
        variacao: 0,
        impacto: 0,
        participacao: fatia,
      };

      item.precoFinal = atual;
      item.participacao = fatia;
      item.impacto += fator * fatia * (atual / anterior - 1) * 100;
      itens.set(itemId, item);
    }

    if (mes.variacao !== null) {
      fator *= 1 + mes.variacao / 100;
    }

    resultado.push({
      mes: mesDoIndice(mes.indice),
      variacao: mes.variacao,
      acumulado: (fator - 1) * 100,
      itens: mes.comparacoes.length,
      itensComPrecoNovo: mes.comparacoes.filter((comparacao) => comparacao.novo).length,
    });
  }

  for (const item of itens.values()) {
    item.variacao = (item.precoFinal / item.precoInicial - 1) * 100;
  }

  return {
    mesBase: mesDoIndice(periodo[0].indice - 1),
    meses: resultado,
    acumulado: resultado.some((mes) => mes.variacao !== null) ? (fator - 1) * 100 : null,
    itens: [...itens.values()].sort(
      (a, b) => Math.abs(b.impacto) - Math.abs(a.impacto) || a.itemId.localeCompare(b.itemId),
    ),
  };
};
