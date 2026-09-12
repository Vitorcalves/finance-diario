import type { Marca } from '../models/marcas';
import type { ProdutoVariantes } from '../models/produtoVariantes';
import { formatarQuantidade } from './format';
import { Unidades } from './unidades';

/**
 * `true` quando a variante usa uma unidade de venda a granel (Quilo (granel),
 * Litro (granel)...): preco por peso/volume, sem embalagem.
 */
export const ehGranel = (variante: ProdutoVariantes | undefined): boolean =>
  Boolean(variante && Unidades.ehGranel(variante.unidade_id));

/**
 * Medida em que o preco de uma variante a granel e cobrado: `kg`, `2 kg`, `L`.
 * Quantidade vazia vale 1 (o caso comum: preco por kg).
 */
export const medidaGranel = (variante: ProdutoVariantes): string => {
  const sigla = Unidades.porId(variante.unidade_id)?.sigla ?? 'un';
  const quantidade = variante.quantidade ?? 1;

  return quantidade === 1 ? sigla : `${formatarQuantidade(quantidade)} ${sigla}`;
};

/**
 * Rotulo curto de uma variante, no formato `Marca • 500 g` (ou `Marca • por kg`
 * quando e a granel). Usado no lancamento, no orcamento e no historico de precos.
 */
export const rotuloVariante = (variante: ProdutoVariantes, marcas: Marca[]): string => {
  const marca = marcas.find((item) => item.id === variante.marca_id)?.nome ?? 'Sem marca';

  if (ehGranel(variante)) {
    return `${marca} • por ${medidaGranel(variante)}`;
  }

  const unidade = Unidades.descricaoPorId(variante.unidade_id);
  const medida =
    variante.quantidade !== null ? `${variante.quantidade}${unidade ? ` ${unidade}` : ''}` : '';

  return [marca, medida].filter(Boolean).join(' • ');
};

/**
 * Quantidade de um item pronta para exibir: `2` nos pacotes, `0,75 kg` quando a
 * variante e a granel (`2,5 x 100 g` se o preco for por uma medida diferente
 * de 1). Sem variante (item avulso) mostra so o numero.
 */
export const rotuloQuantidade = (
  quantidade: number,
  variante: ProdutoVariantes | undefined,
): string => {
  const numero = formatarQuantidade(quantidade);

  if (!variante || !ehGranel(variante)) {
    return numero;
  }

  const separador = (variante.quantidade ?? 1) === 1 ? ' ' : ' x ';

  return `${numero}${separador}${medidaGranel(variante)}`;
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
  if (!variante || variante.unidade_id === null) {
    return null;
  }

  // A granel sem quantidade = preco por 1 kg / 1 L / 1 m.
  const quantidadeDaVariante =
    variante.quantidade ?? (Unidades.ehGranel(variante.unidade_id) ? 1 : null);

  if (quantidadeDaVariante === null || quantidadeDaVariante <= 0) {
    return null;
  }

  const primaria = Unidades.primariaDe(variante.unidade_id);

  if (!primaria) {
    return null;
  }

  const quantidade = Unidades.converter(quantidadeDaVariante, variante.unidade_id, primaria.id);

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
