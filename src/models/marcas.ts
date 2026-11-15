import { getConnection } from './database';
import { filtroDeAtivos, type OpcoesListagem, type SemExclusao } from './exclusaoLogica';
import { exigirNomeLivre } from './nomeRepetido';

export type Marca = {
  id: number;
  nome: string;
  created_at: string;
  /** Quando foi excluida (ISO); `null` = ativa. Ver `exclusaoLogica`. */
  deleted_at: string | null;
};

/**
 * Marcas, da mais nova para a mais antiga. So as ativas; `comExcluidos` traz
 * tambem as excluidas, que continuam dando nome as variantes que as usam.
 */
export const listMarcas = async (opcoes: OpcoesListagem = {}): Promise<Marca[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Marca>(
    `
        SELECT id, nome, created_at, deleted_at
        FROM marcas
        ${filtroDeAtivos(opcoes)}
        ORDER BY created_at DESC
    `,
  );
};

/**
 * Cria a marca. Recusa, com `NomeRepetidoError`, o nome que outra marca ativa
 * ja usa: duas "Camil" dividiriam as variantes entre rotulos iguais.
 */
export const insertMarca = async (marca: Omit<Marca, 'id' | 'deleted_at'>): Promise<void> => {
  exigirNomeLivre(await listMarcas(), marca.nome, 'marca');

  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO marcas (nome, created_at)
        VALUES (?, ?)
    `,
    [marca.nome, marca.created_at],
  );
};

/**
 * Exclui a marca sem apagar a linha: ela sai do cadastro e do seletor, mas as
 * variantes que ja a usam continuam com a marca no rotulo e no historico.
 */
export const deleteMarcaById = async (
  id: number,
  agora: string = new Date().toISOString(),
): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('UPDATE marcas SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    agora,
    id,
  ]);
};

/** Busca pelo id mesmo que a marca tenha sido excluida (confira `deleted_at`). */
export const getMarcaById = async (id: number): Promise<Marca | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Marca>(
    `
        SELECT id, nome, created_at, deleted_at
        FROM marcas
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};

/** Atualiza a marca. Recusa, com `NomeRepetidoError`, o nome de outra marca ativa. */
export const updateMarca = async (marca: SemExclusao<Marca>): Promise<void> => {
  exigirNomeLivre(await listMarcas(), marca.nome, 'marca', marca.id);

  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE marcas
        SET nome       = ?,
            created_at = ?
        WHERE id = ?
    `,
    [marca.nome, marca.created_at, marca.id],
  );
};
