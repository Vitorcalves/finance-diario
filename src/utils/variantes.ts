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

/** Mesma coisa, mas partindo do id - devolve um texto neutro se a variante sumiu. */
export const rotuloVariantePorId = (
  varianteId: string,
  variantes: ProdutoVariantes[],
  marcas: Marca[],
): string => {
  const variante = variantes.find((item) => item.id === varianteId);

  return variante ? rotuloVariante(variante, marcas) : 'Variante removida';
};
