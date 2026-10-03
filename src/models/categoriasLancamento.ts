import { emTransacao, getConnection } from './database';

export type TipoCategoriaLancamento = 'saida' | 'entrada';

/**
 * Classificacao do lancamento (Mercado, Transporte...). Nao confundir com a
 * categoria de produto (`categorias`), que classifica o que foi comprado.
 */
export type CategoriaLancamento = {
  id: string;
  nome: string;
  /** Nome de um icone do Ionicons. */
  icone: string;
  /** Chave da paleta de categorias do tema (`azul`, `verde`...). */
  cor: string;
  tipo: TipoCategoriaLancamento;
  ordem: number;
  created_at: string;
};

const COLUNAS = 'id, nome, icone, cor, tipo, ordem, created_at';

export const listCategoriasLancamento = async (): Promise<CategoriaLancamento[]> => {
  const db = await getConnection();

  return await db.getAllAsync<CategoriaLancamento>(
    `
        SELECT ${COLUNAS}
        FROM categorias_lancamento
        ORDER BY tipo DESC, ordem, nome
    `,
  );
};

/** Nova categoria entra no fim da lista do seu tipo. */
export const insertCategoriaLancamento = async (
  categoria: Omit<CategoriaLancamento, 'ordem'>,
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO categorias_lancamento (id, nome, icone, cor, tipo, ordem, created_at)
        VALUES (?, ?, ?, ?, ?,
                (SELECT COALESCE(MAX(ordem), -1) + 1 FROM categorias_lancamento WHERE tipo = ?),
                ?)
    `,
    [
      categoria.id,
      categoria.nome,
      categoria.icone,
      categoria.cor,
      categoria.tipo,
      categoria.tipo,
      categoria.created_at,
    ],
  );
};

export const updateCategoriaLancamento = async (
  categoria: Pick<CategoriaLancamento, 'id' | 'nome' | 'icone' | 'cor' | 'tipo'>,
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE categorias_lancamento
        SET nome  = ?,
            icone = ?,
            cor   = ?,
            tipo  = ?
        WHERE id = ?
    `,
    [categoria.nome, categoria.icone, categoria.cor, categoria.tipo, categoria.id],
  );
};

/** Os lancamentos da categoria ficam "Sem categoria" (`ON DELETE SET NULL`). */
export const deleteCategoriaLancamento = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM categorias_lancamento WHERE id = ?', [id]);
};

/**
 * Muda a categoria de um lancamento ja gravado.
 *
 * Parcela e assinatura sao o mesmo gasto repetido: a categoria vai para o
 * plano e para todas as cobrancas dele, inclusive as que ainda vao ser geradas.
 */
export const definirCategoriaTransacao = async (
  transacaoId: string,
  categoriaId: string | null,
): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();
    const transacao = await db.getFirstAsync<{ plano_id: string | null }>(
      'SELECT plano_id FROM transacoes WHERE id = ?',
      [transacaoId],
    );

    if (!transacao) {
      return;
    }

    if (transacao.plano_id) {
      await db.runAsync('UPDATE planos_pagamento SET categoria_id = ? WHERE id = ?', [
        categoriaId,
        transacao.plano_id,
      ]);
      await db.runAsync('UPDATE transacoes SET categoria_id = ? WHERE plano_id = ?', [
        categoriaId,
        transacao.plano_id,
      ]);
      return;
    }

    await db.runAsync('UPDATE transacoes SET categoria_id = ? WHERE id = ?', [
      categoriaId,
      transacaoId,
    ]);
  });

/**
 * Categoria usada no lancamento mais recente de cada empresa: ao escolher a
 * empresa no formulario, a categoria ja vem sugerida.
 */
export const ultimaCategoriaPorEmpresa = async (): Promise<Map<string, string>> => {
  const db = await getConnection();

  const linhas = await db.getAllAsync<{ empresa_id: string; categoria_id: string }>(
    `
        SELECT t.empresa_id, t.categoria_id
        FROM transacoes t
        WHERE t.empresa_id IS NOT NULL
          AND t.categoria_id IS NOT NULL
          AND t.created_at = (SELECT MAX(u.created_at)
                              FROM transacoes u
                              WHERE u.empresa_id = t.empresa_id
                                AND u.categoria_id IS NOT NULL)
    `,
  );

  return new Map(linhas.map((linha) => [linha.empresa_id, linha.categoria_id]));
};
