import { NATUREZAS_DO_FLUXO, type NaturezaTransacao } from '../models/naturezaTransacao';

/** Minusculo, sem acentos e sem espacos nas pontas: "Açúcar " vira "acucar". */
export const normalizarTexto = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Palavras do termo de busca, ja normalizadas. */
const palavrasDaBusca = (termo: string): string[] =>
  normalizarTexto(termo).split(/\s+/).filter(Boolean);

/**
 * Busca no estilo `LIKE '%trecho%'`: cada palavra digitada precisa aparecer em
 * algum ponto do texto, em qualquer ordem, ignorando acentos e maiusculas.
 * "acucar crist" acha "Açúcar Cristal 1kg"; "int arroz" acha "Arroz Integral".
 */
export const correspondeBusca = (texto: string, termo: string): boolean => {
  const palavras = palavrasDaBusca(termo);

  if (palavras.length === 0) {
    return true;
  }

  const alvo = normalizarTexto(texto);
  return palavras.every((palavra) => alvo.includes(palavra));
};

type Pesquisavel = {
  descricao: string;
  empresa_id?: string | null;
  /** Descricoes dos itens da compra, quando houver. */
  itens_texto?: string | null;
};

/**
 * Mantem os lancamentos que contem todas as palavras do termo, procurando na
 * descricao, nos itens comprados e no nome da empresa. Ignora acentos e
 * maiusculas: "arroz bahamas" acha a compra no Bahamas que teve arroz.
 */
export const filtrarPorTexto = <T extends Pesquisavel>(
  lancamentos: T[],
  termo: string,
  nomeEmpresa: (id?: string | null) => string,
): T[] => {
  if (palavrasDaBusca(termo).length === 0) {
    return lancamentos;
  }

  return lancamentos.filter((lancamento) =>
    correspondeBusca(
      `${lancamento.descricao} ${lancamento.itens_texto ?? ''} ${nomeEmpresa(lancamento.empresa_id)}`,
      termo,
    ),
  );
};

export type TotaisBusca = {
  quantidade: number;
  /** Soma dos gastos encontrados (positivo). */
  saidas: number;
  /** Soma das receitas encontradas (positivo). */
  entradas: number;
};

/**
 * Totais do resultado da busca. Todo lancamento conta na quantidade, mas so
 * gasto e receita entram nas somas: transferencia e pagamento de fatura so
 * mudam o dinheiro de lugar, e somar o pagamento junto com as compras do
 * cartao contaria o mesmo gasto duas vezes.
 */
export const totalizarBusca = (
  lancamentos: { valor: number; natureza: NaturezaTransacao }[],
): TotaisBusca =>
  lancamentos.reduce(
    (soma, lancamento) => {
      const doFluxo = NATUREZAS_DO_FLUXO.includes(lancamento.natureza);

      return {
        quantidade: soma.quantidade + 1,
        saidas: soma.saidas + (doFluxo && lancamento.valor < 0 ? Math.abs(lancamento.valor) : 0),
        entradas: soma.entradas + (doFluxo && lancamento.valor > 0 ? lancamento.valor : 0),
      };
    },
    { quantidade: 0, saidas: 0, entradas: 0 },
  );
