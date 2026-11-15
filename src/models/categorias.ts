import { getConnection } from './database';
import { filtroDeAtivos, type OpcoesListagem, type SemExclusao } from './exclusaoLogica';
import { exigirNomeLivre } from './nomeRepetido';

export type Categoria = {
  id: string;
  nome: string;
  created_at: string;
  /** Quando foi excluida (ISO); `null` = ativa. Ver `exclusaoLogica`. */
  deleted_at: string | null;
};

/** Categorias de produto, da mais nova para a mais antiga. So as ativas, salvo `comExcluidos`. */
export const listCategorias = async (opcoes: OpcoesListagem = {}): Promise<Categoria[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Categoria>(
    `
        SELECT id, nome, created_at, deleted_at
        FROM categorias
        ${filtroDeAtivos(opcoes)}
        ORDER BY created_at DESC
    `,
  );
};

/**
 * Cria a categoria de produto. Recusa, com `NomeRepetidoError`, o nome que
 * outra categoria ativa ja usa.
 */
export const insertCategoria = async (categoria: SemExclusao<Categoria>): Promise<void> => {
  exigirNomeLivre(await listCategorias(), categoria.nome, 'categoria');

  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO categorias (id, nome, created_at)
        VALUES (?, ?, ?)
    `,
    [categoria.id, categoria.nome, categoria.created_at],
  );
};

/**
 * Exclui a categoria sem apagar a linha. Os vinculos com os produtos ficam no
 * banco, mas `categoriasProduto` deixa de lista-los: a categoria some dos
 * produtos sem que nada seja apagado.
 */
export const deleteCategoriaById = async (
  id: string,
  agora: string = new Date().toISOString(),
): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('UPDATE categorias SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    agora,
    id,
  ]);
};

/** Busca pelo id mesmo que a categoria tenha sido excluida (confira `deleted_at`). */
export const getCategoriaById = async (id: string): Promise<Categoria | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Categoria>(
    `
        SELECT id, nome, created_at, deleted_at
        FROM categorias
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
