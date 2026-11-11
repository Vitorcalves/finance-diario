import dayjs from 'dayjs';
import type { CompraDeProduto } from '../models/listaCompras';

/** Um produto comprado com frequencia, sugerido para a lista de compras. */
export type SugestaoCompra = {
  produtoId: string;
  /** Variante comprada da ultima vez. */
  varianteId: string | null;
  /** Quantidade mais comum por compra (a da ultima vez, no empate). */
  quantidade: number;
  /** Em quantos dias diferentes o produto foi comprado. */
  vezes: number;
  /** Media de dias entre uma compra e outra. */
  intervaloDias: number;
  /**
   * Quantos dias a ultima compra deve durar, pelo consumo de costume: comprar
   * 5 vezes mais que o normal empurra a proxima compra 5 vezes para frente.
   */
  duracaoDias: number;
  diasDesdeUltima: number;
  /** A ultima compra ja acabou (ou esta perto de acabar). */
  naHora: boolean;
};

/** Quanto vem em 1 unidade comprada de uma variante (ex.: 5 kg), para somar tamanhos diferentes. */
export type TamanhoDaVariante = {
  quantidade: number;
  /** Unidade em que `quantidade` esta; so da para somar compras na mesma unidade. */
  unidadeId: number;
};

/** Abaixo disso ainda nao da para falar em habito. */
export const MINIMO_COMPRAS = 2;

/** Fracao da duracao a partir da qual o produto ja e lembrado (80% = alguns dias antes). */
const ANTECEDENCIA = 0.8;

/** Sem comprar ha mais que isso (ou 3 duracoes), o produto saiu da rotina. */
const DIAS_ABANDONO = 90;

type OpcoesSugestao = {
  /** Produtos que nao devem ser sugeridos (ja na lista, compra eventual...). */
  ignorar?: Set<string>;
  limite?: number;
  /**
   * Tamanho da variante comprada (`null` se nao tem medida cadastrada). Com ele,
   * 1 pacote de 5 kg conta 5 vezes mais que 1 de 1 kg; sem ele, o consumo e
   * contado em unidades compradas.
   */
  tamanho?: (varianteId: string | null) => TamanhoDaVariante | null;
};

type CompraDoDia = {
  /** Unidades compradas, como foram lancadas. */
  quantidade: number;
  /** O mesmo, ja multiplicado pelo tamanho da variante. */
  medida: number;
};

/** Valor que mais se repete; no empate, o que aparece por ultimo (o mais recente). */
const maisComum = (valores: number[]): number => {
  const contagem = new Map<number, number>();
  let escolhido = valores[valores.length - 1] ?? 1;
  let maior = 0;

  for (const valor of valores) {
    const vezes = (contagem.get(valor) ?? 0) + 1;
    contagem.set(valor, vezes);

    if (vezes >= maior) {
      maior = vezes;
      escolhido = valor;
    }
  }

  return escolhido;
};

/**
 * Descobre o consumo de cada produto pelos lancamentos com itens e sugere os
 * que costumam ser comprados - primeiro os que ja estao "na hora".
 *
 * O ritmo e uma taxa de consumo (quanto se gasta por dia), nao so o intervalo
 * entre compras: o que foi comprado antes da ultima compra, dividido pelos dias
 * entre a primeira e a ultima. A ultima compra dura a quantidade dela dividida
 * por essa taxa.
 *
 * Varias compras do mesmo produto no mesmo dia contam como uma so, com as
 * quantidades somadas.
 */
export const sugerirCompras = (
  compras: CompraDeProduto[],
  hoje: string,
  { ignorar = new Set(), limite = 12, tamanho }: OpcoesSugestao = {},
): SugestaoCompra[] => {
  const porProduto = new Map<string, CompraDeProduto[]>();

  for (const compra of compras) {
    if (ignorar.has(compra.produto_id)) {
      continue;
    }

    const lista = porProduto.get(compra.produto_id) ?? [];
    lista.push(compra);
    porProduto.set(compra.produto_id, lista);
  }

  const dataHoje = dayjs(hoje);
  const sugestoes: (SugestaoCompra & { atraso: number })[] = [];

  for (const [produtoId, doProduto] of porProduto) {
    const ordenadas = [...doProduto].sort((a, b) => a.data.localeCompare(b.data));

    // So converte pelo tamanho se todas as compras tiverem medida, e na mesma
    // unidade; misturar kg com unidades (ou com compra sem medida) nao soma.
    const tamanhos = ordenadas.map((compra) => tamanho?.(compra.variante_id) ?? null);
    const unidadeId = tamanhos[0]?.unidadeId;
    const usarTamanho = tamanhos.every(
      (item) => item !== null && item.quantidade > 0 && item.unidadeId === unidadeId,
    );

    const porDia = new Map<string, CompraDoDia>();

    ordenadas.forEach((compra, indice) => {
      const dia = compra.data.slice(0, 10);
      const doDia = porDia.get(dia) ?? { quantidade: 0, medida: 0 };
      const fator = usarTamanho ? (tamanhos[indice]?.quantidade ?? 1) : 1;

      doDia.quantidade += compra.quantidade;
      doDia.medida += compra.quantidade * fator;
      porDia.set(dia, doDia);
    });

    const dias = [...porDia.keys()];

    if (dias.length < MINIMO_COMPRAS) {
      continue;
    }

    const comprasPorDia = [...porDia.values()];
    const primeira = dayjs(dias[0]);
    const ultima = dayjs(dias[dias.length - 1]);
    const periodo = Math.max(1, ultima.diff(primeira, 'day'));
    const intervaloDias = Math.max(1, periodo / (dias.length - 1));
    const diasDesdeUltima = Math.max(0, dataHoje.diff(ultima, 'day'));

    // O que foi comprado antes da ultima compra e o que foi gasto ate ela.
    const medidaDaUltima = comprasPorDia[comprasPorDia.length - 1].medida;
    const consumido = comprasPorDia.slice(0, -1).reduce((soma, dia) => soma + dia.medida, 0);
    const duracao =
      consumido > 0 && medidaDaUltima > 0
        ? Math.max(1, (medidaDaUltima * periodo) / consumido)
        : intervaloDias;

    if (diasDesdeUltima > Math.max(duracao * 3, DIAS_ABANDONO)) {
      continue;
    }

    sugestoes.push({
      produtoId,
      varianteId: ordenadas[ordenadas.length - 1].variante_id,
      quantidade: maisComum(comprasPorDia.map((dia) => dia.quantidade)),
      vezes: dias.length,
      intervaloDias: Math.round(intervaloDias),
      duracaoDias: Math.round(duracao),
      diasDesdeUltima,
      naHora: diasDesdeUltima >= duracao * ANTECEDENCIA,
      atraso: diasDesdeUltima / duracao,
    });
  }

  return sugestoes
    .sort((a, b) => {
      if (a.naHora !== b.naHora) {
        return a.naHora ? -1 : 1;
      }

      // Entre os da hora, o mais "atrasado" primeiro; nos demais, o mais frequente.
      return a.naHora ? b.atraso - a.atraso : b.vezes - a.vezes;
    })
    .slice(0, limite)
    .map(({ atraso: _atraso, ...sugestao }) => sugestao);
};
