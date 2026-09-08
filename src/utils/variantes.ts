import type { Marca } from '../models/marcas';
import type { ProdutoVariantes } from '../models/produtoVariantes';
import { Unidades } from './unidades';

/**
 * Rotulo curto de uma variante, no formato `Marca • 500 g`.
 * Usado no lancamento, no orcamento e no historico de precos.
 */
export const rotuloVariante = (variante: ProdutoVariantes, marcas: Marca[]): string => {
  const marca = marcas.find((item) => item.id === variante.marca_id)?.nome ?? 'Sem marca';
  const unidade = Unidades.descricaoPorId(variante.unidade_id);
  const medida =
    variante.quantidade !== null ? `${variante.quantidade}${unidade ? ` ${unidade}` : ''}` : '';

  return [marca, medida].filter(Boolean).join(' • ');
};

/** Preco de uma variante reduzido a unidade primaria do seu grupo (ex.: R$/kg). */
export type PrecoPorUnidade = {
  valor: number;
  /** Id da unidade primaria em que `valor` esta expresso. */
  unidadeId: number;
  sigla: string;
};

/**
 * Converte o preco pago em uma variante para o preco de uma unidade primaria,
 * o unico jeito de comparar embalagens de tamanhos diferentes (500 g x 1 kg).
 *
 * Devolve `null` quando a variante nao tem quantidade e unidade cadastradas:
 * sem a medida nao da para dizer quanto custa 1 kg / 1 L / 1 un.
 */
export const precoPorUnidadePrimaria = (
  preco: number,
  variante: ProdutoVariantes | undefined,
): PrecoPorUnidade | null => {
  if (!variante || variante.unidade_id === null || variante.quantidade === null) {
    return null;
  }

  if (variante.quantidade <= 0) {
    return null;
  }

  const primaria = Unidades.primariaDe(variante.unidade_id);

  if (!primaria) {
    return null;
  }

  const quantidade = Unidades.converter(variante.quantidade, variante.unidade_id, primaria.id);

  if (quantidade <= 0) {
    return null;
  }

  return { valor: preco / quantidade, unidadeId: primaria.id, sigla: primaria.sigla };
};

/** Mesma coisa, mas partindo do id - devolve um texto neutro se a variante sumiu. */
export const rotuloVariantePorId = (
  varianteId: string,
  variantes: ProdutoVariantes[],
  marcas: Marca[],
): string => {
  const variante = variantes.find((item) => item.id === varianteId);

  return variante ? rotuloVariante(variante, marcas) : 'Variante removida';
};
