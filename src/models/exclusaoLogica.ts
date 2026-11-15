/**
 * Exclusao logica dos cadastros (migration 020).
 *
 * Produtos, variantes, marcas, categorias de produto e empresas nao saem do
 * banco quando o usuario exclui: a linha fica, com a data em `deleted_at`.
 * Assim o que ja foi registrado com eles (historico de precos, itens e empresa
 * dos lancamentos, marca das variantes) continua inteiro e com nome.
 *
 * Regra das telas:
 * - seletor e cadastro listam so os ativos (o padrao das funcoes `list...`);
 * - quem da nome ao que ja aconteceu pede `{ comExcluidos: true }`.
 */

/** Registro de uma tabela com exclusao logica. */
export type Excluivel = {
  /** Quando foi excluido (ISO); `null` = ativo. */
  deleted_at: string | null;
};

/** O que insert e update gravam: a exclusao tem funcao propria (`delete...ById`). */
export type SemExclusao<T> = Omit<T, 'deleted_at'>;

export type OpcoesListagem = {
  /**
   * Traz tambem os excluidos. Para dar nome ao historico; um seletor nunca
   * deve oferecer um excluido para uso novo.
   */
  comExcluidos?: boolean;
};

export const estaAtivo = (registro: Excluivel): boolean => registro.deleted_at === null;

export const somenteAtivos = <T extends Excluivel>(registros: T[]): T[] =>
  registros.filter(estaAtivo);

/**
 * Nome para a lista que mostra ativos e excluidos lado a lado (os filtros da
 * busca e das analises de preco): `Arroz (excluído)`. No historico em si o
 * nome vai puro. `marca` acerta o genero: `'excluída'` para empresa e marca.
 */
export const nomeComExclusao = (
  registro: Excluivel & { nome: string },
  marca: 'excluído' | 'excluída' = 'excluído',
): string => (estaAtivo(registro) ? registro.nome : `${registro.nome} (${marca})`);

/** Ativos antes dos excluidos, sem mexer na ordem de cada grupo. */
export const ativosPrimeiro = <T extends Excluivel>(registros: T[]): T[] => [
  ...registros.filter(estaAtivo),
  ...registros.filter((registro) => !estaAtivo(registro)),
];

/**
 * Clausula das listagens: nada quando `comExcluidos`, senao o filtro dos
 * ativos. `prefixo` e `AND` quando a consulta ja tem um `WHERE`.
 */
export const filtroDeAtivos = (
  opcoes: OpcoesListagem,
  prefixo: 'WHERE' | 'AND' = 'WHERE',
): string => (opcoes.comExcluidos ? '' : `${prefixo} deleted_at IS NULL`);
