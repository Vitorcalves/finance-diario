import { emTransacao, getConnection } from './database';

export type Empresa = {
  id: string;
  nome: string;
  cnpj?: string;
  observacao?: string;
  created_at: string;
};

/** Ordena pelo nome como se le em portugues: `Água` junto do `A`, sem separar maiusculas. */
const porNome = (a: Empresa, b: Empresa): number =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

/** Todas as empresas, em ordem alfabetica. */
export const listEmpresas = async (): Promise<Empresa[]> => {
  const db = await getConnection();

  const empresas = await db.getAllAsync<Empresa>(
    `
        SELECT id, nome, cnpj, observacao, created_at
        FROM empresas
    `,
  );

  // O ORDER BY do SQLite compara bytes e jogaria `Água` depois do `Z`.
  return empresas.sort(porNome);
};

/**
 * Grava as ligacoes da empresa com as categorias de lancamento. Categoria que
 * nao existe mais (apagada no meio do caminho) e pulada, e repetida entra uma
 * vez so.
 */
const ligarCategorias = async (
  empresaId: string,
  categoriaIds: string[],
  agora: string,
): Promise<void> => {
  const db = await getConnection();

  for (const categoriaId of new Set(categoriaIds)) {
    await db.runAsync(
      `
          INSERT OR IGNORE INTO empresas_categorias_lancamento (empresa_id, categoria_id, created_at)
          SELECT ?, id, ?
          FROM categorias_lancamento
          WHERE id = ?
      `,
      [empresaId, agora, categoriaId],
    );
  }
};

/** Troca as categorias de lancamento da empresa pelas informadas (lista vazia tira todas). */
export const definirCategoriasEmpresa = async (
  empresaId: string,
  categoriaIds: string[],
  agora: string = new Date().toISOString(),
): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync('DELETE FROM empresas_categorias_lancamento WHERE empresa_id = ?', [
      empresaId,
    ]);
    await ligarCategorias(empresaId, categoriaIds, agora);
  });

/**
 * Ids das categorias de lancamento de cada empresa, na ordem em que as
 * categorias aparecem no app. Empresa sem categoria fica fora do mapa.
 */
export const listCategoriasPorEmpresa = async (): Promise<Map<string, string[]>> => {
  const db = await getConnection();
  const linhas = await db.getAllAsync<{ empresa_id: string; categoria_id: string }>(
    `
        SELECT ec.empresa_id, ec.categoria_id
        FROM empresas_categorias_lancamento ec
                 JOIN categorias_lancamento c ON c.id = ec.categoria_id
        ORDER BY c.tipo DESC, c.ordem, c.nome
    `,
  );

  const porEmpresa = new Map<string, string[]>();

  for (const linha of linhas) {
    const lista = porEmpresa.get(linha.empresa_id);

    if (lista) {
      lista.push(linha.categoria_id);
    } else {
      porEmpresa.set(linha.empresa_id, [linha.categoria_id]);
    }
  }

  return porEmpresa;
};

/** Cria a empresa ja com as categorias de lancamento dela, tudo ou nada. */
export const insertEmpresa = async (empresa: Empresa, categoriaIds: string[] = []): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync(
      `
          INSERT INTO empresas (id, nome, cnpj, observacao, created_at)
          VALUES (?, ?, ?, ?, ?)
      `,
      [
        empresa.id,
        empresa.nome,
        empresa.cnpj ?? null,
        empresa.observacao ?? null,
        empresa.created_at,
      ],
    );

    await ligarCategorias(empresa.id, categoriaIds, empresa.created_at);
  });

/** As ligacoes com as categorias de lancamento saem junto (`ON DELETE CASCADE`). */
export const deleteEmpresaById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM empresas WHERE id = ?', [id]);
};

export const getEmpresaById = async (id: string): Promise<Empresa | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Empresa>(
    `
        SELECT id, nome, cnpj, observacao, created_at
        FROM empresas
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};

/**
 * Atualiza a empresa. Com `categoriaIds`, troca tambem as categorias de
 * lancamento dela na mesma transacao; sem ele, as categorias ficam como estao.
 */
export const updateEmpresa = async (empresa: Empresa, categoriaIds?: string[]): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync(
      `
          UPDATE empresas
          SET nome       = ?,
              cnpj       = ?,
              observacao = ?
          WHERE id = ?
      `,
      [empresa.nome, empresa.cnpj ?? null, empresa.observacao ?? null, empresa.id],
    );

    if (categoriaIds) {
      await definirCategoriasEmpresa(empresa.id, categoriaIds);
    }
  });
