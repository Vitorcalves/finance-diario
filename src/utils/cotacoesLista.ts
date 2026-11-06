import type { PrecoPorUnidade } from './variantes';

/** Diferencas abaixo de meio centavo sao arredondamento. */
const CENTAVO = 0.005;

/** O que a comparacao precisa saber de uma cotacao da lista de compras. */
export type CotacaoComparavel = {
  /** Variante que vale para a cotacao: a anotada ou a unica do produto. */
  varianteId: string | null;
  preco: number;
  /** Preco por kg/L/un; `null` sem variante ou sem medida cadastrada. */
  unitario: PrecoPorUnidade | null;
};

export type ComparacaoCotacoes<T> = {
  /**
   * A cotacao que vale para o item: a da variante que ele quer levar, se ela
   * foi cotada; senao a melhor.
   */
  vale: T | null;
  /**
   * A mais barata: por unidade quando todas reduzem a mesma unidade primaria;
   * senao pelo preco. No empate fica a anotada primeiro.
   */
  melhor: T | null;
  /** `true` quando a melhor saiu do preco por unidade. */
  porUnidade: boolean;
};

export type DiferencaParaOMenor = {
  /** Positivo: aqui sai mais caro; zero ou negativo: aqui e o menor. */
  valor: number;
  /** Sigla da unidade quando a diferenca e por unidade (R$/L); `null` = preco cheio. */
  sigla: string | null;
};

/** Todas tem preco por unidade, e na mesma unidade primaria. */
const naMesmaUnidade = (cotacoes: readonly CotacaoComparavel[]): boolean => {
  const base = cotacoes[0]?.unitario?.unidadeId;

  return (
    base !== undefined &&
    cotacoes.every((cotacao) => cotacao.unitario !== null && cotacao.unitario.unidadeId === base)
  );
};

/** Preco por unidade; so chamado quando `naMesmaUnidade` garantiu que existe. */
const porUnidadeDe = (cotacao: CotacaoComparavel): number =>
  cotacao.unitario?.valor ?? Number.POSITIVE_INFINITY;

/**
 * Compara as cotacoes de um item num mercado (varias marcas/embalagens na
 * gondola) e diz qual vale para ele: a da variante que o usuario quer levar
 * ou, com "qualquer marca" (ou sem ela cotada aqui), a mais barata.
 *
 * O preco cheio so decide quando nao da para comparar por unidade: um leite de
 * 500 ml mais barato na prateleira pode sair mais caro por litro.
 */
export const compararCotacoes = <T extends CotacaoComparavel>(
  cotacoes: readonly T[],
  varianteDoItem: string | null,
): ComparacaoCotacoes<T> => {
  if (cotacoes.length === 0) {
    return { vale: null, melhor: null, porUnidade: false };
  }

  const porUnidade = naMesmaUnidade(cotacoes);
  const valor = (cotacao: T): number => (porUnidade ? porUnidadeDe(cotacao) : cotacao.preco);
  const melhor = cotacoes.reduce((menor, atual) =>
    valor(atual) < valor(menor) - CENTAVO ? atual : menor,
  );
  const escolhida =
    varianteDoItem !== null
      ? cotacoes.find((cotacao) => cotacao.varianteId === varianteDoItem)
      : undefined;

  return { vale: escolhida ?? melhor, melhor, porUnidade };
};

/** `true` quando a cotacao empata com a melhor (meio centavo de folga). */
export const empataComAMelhor = (
  cotacao: CotacaoComparavel,
  { melhor, porUnidade }: ComparacaoCotacoes<CotacaoComparavel>,
): boolean => {
  if (!melhor) {
    return false;
  }

  return porUnidade
    ? porUnidadeDe(cotacao) - porUnidadeDe(melhor) <= CENTAVO
    : cotacao.preco - melhor.preco <= CENTAVO;
};

/** Quanto a cotacao sai a mais que a melhor por unidade, em %; `null` sem comparacao por unidade. */
export const percentualAcimaDaMelhor = (
  cotacao: CotacaoComparavel,
  { melhor, porUnidade }: ComparacaoCotacoes<CotacaoComparavel>,
): number | null => {
  if (!porUnidade || !melhor || porUnidadeDe(melhor) <= 0) {
    return null;
  }

  return ((porUnidadeDe(cotacao) - porUnidadeDe(melhor)) / porUnidadeDe(melhor)) * 100;
};

/**
 * Quanto a cotacao que vale aqui passa da menor dos outros mercados: por
 * unidade quando todas reduzem a mesma unidade (embalagens diferentes nao se
 * comparam pelo preco cheio); senao pelo preco. `null` sem outro mercado.
 */
export const diferencaParaOMenor = (
  aqui: CotacaoComparavel,
  outros: readonly CotacaoComparavel[],
): DiferencaParaOMenor | null => {
  if (outros.length === 0) {
    return null;
  }

  if (naMesmaUnidade([aqui, ...outros])) {
    return {
      valor: porUnidadeDe(aqui) - Math.min(...outros.map(porUnidadeDe)),
      sigla: aqui.unitario?.sigla ?? null,
    };
  }

  return { valor: aqui.preco - Math.min(...outros.map((outro) => outro.preco)), sigla: null };
};
