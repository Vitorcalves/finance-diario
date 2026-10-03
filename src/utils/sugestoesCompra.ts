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
  diasDesdeUltima: number;
  /** Ja passou (ou esta perto) do tempo em que costuma ser comprado de novo. */
  naHora: boolean;
};

/** Abaixo disso ainda nao da para falar em habito. */
export const MINIMO_COMPRAS = 2;

/** Fracao do intervalo a partir da qual o produto ja e lembrado (80% = alguns dias antes). */
const ANTECEDENCIA = 0.8;

/** Sem comprar ha mais que isso (ou 3 intervalos), o produto saiu da rotina. */
const DIAS_ABANDONO = 90;

type OpcoesSugestao = {
  /** Produtos que nao devem ser sugeridos (ja na lista, compra eventual...). */
  ignorar?: Set<string>;
  limite?: number;
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
 * Descobre o ritmo de compra de cada produto pelos lancamentos com itens e
 * sugere os que costumam ser comprados - primeiro os que ja estao "na hora".
 *
 * Varias compras do mesmo produto no mesmo dia contam como uma so, com as
 * quantidades somadas.
 */
export const sugerirCompras = (
  compras: CompraDeProduto[],
  hoje: string,
  { ignorar = new Set(), limite = 12 }: OpcoesSugestao = {},
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
  const sugestoes: SugestaoCompra[] = [];

  for (const [produtoId, doProduto] of porProduto) {
    const ordenadas = [...doProduto].sort((a, b) => a.data.localeCompare(b.data));
    const quantidadePorDia = new Map<string, number>();

    for (const compra of ordenadas) {
      const dia = compra.data.slice(0, 10);
      quantidadePorDia.set(dia, (quantidadePorDia.get(dia) ?? 0) + compra.quantidade);
    }

    const dias = [...quantidadePorDia.keys()];

    if (dias.length < MINIMO_COMPRAS) {
      continue;
    }

    const primeira = dayjs(dias[0]);
    const ultima = dayjs(dias[dias.length - 1]);
    const intervaloDias = Math.max(1, ultima.diff(primeira, 'day') / (dias.length - 1));
    const diasDesdeUltima = Math.max(0, dataHoje.diff(ultima, 'day'));

    if (diasDesdeUltima > Math.max(intervaloDias * 3, DIAS_ABANDONO)) {
      continue;
    }

    sugestoes.push({
      produtoId,
      varianteId: ordenadas[ordenadas.length - 1].variante_id,
      quantidade: maisComum([...quantidadePorDia.values()]),
      vezes: dias.length,
      intervaloDias: Math.round(intervaloDias),
      diasDesdeUltima,
      naHora: diasDesdeUltima >= intervaloDias * ANTECEDENCIA,
    });
  }

  return sugestoes
    .sort((a, b) => {
      if (a.naHora !== b.naHora) {
        return a.naHora ? -1 : 1;
      }

      // Entre os da hora, o mais "atrasado" primeiro; nos demais, o mais frequente.
      if (a.naHora) {
        return b.diasDesdeUltima / b.intervaloDias - a.diasDesdeUltima / a.intervaloDias;
      }

      return b.vezes - a.vezes;
    })
    .slice(0, limite);
};
