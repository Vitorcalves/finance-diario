import { Migration } from './types';

/**
 * Exclusao logica dos cadastros: excluir um produto, uma variante, uma marca,
 * uma categoria de produto ou uma empresa deixa de apagar a linha e passa a
 * gravar a data em `deleted_at` (`NULL` = ativo).
 *
 * Antes, o `DELETE` levava junto o que dependia do cadastro: o produto e a
 * variante apagavam em cascata o historico de precos e desligavam os itens dos
 * lancamentos; a empresa tirava o mercado do historico e dos lancamentos; a
 * marca saia das variantes. Com a linha no lugar, nenhuma chave estrangeira
 * dispara e o historico continua com nome.
 *
 * As listagens dos models filtram `deleted_at IS NULL`; ver `exclusaoLogica`.
 */
export const migration020: Migration = {
  id: 20,
  name: '020_exclusao_logica',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE produtos
            ADD COLUMN deleted_at TEXT;

        ALTER TABLE produto_variantes
            ADD COLUMN deleted_at TEXT;

        ALTER TABLE marcas
            ADD COLUMN deleted_at TEXT;

        ALTER TABLE categorias
            ADD COLUMN deleted_at TEXT;

        ALTER TABLE empresas
            ADD COLUMN deleted_at TEXT;
    `);
  },
  down: async (db) => {
    // Sem a coluna nao ha como guardar um excluido: ele volta a aparecer.
    await db.execAsync(`
        ALTER TABLE empresas
            DROP COLUMN deleted_at;

        ALTER TABLE categorias
            DROP COLUMN deleted_at;

        ALTER TABLE marcas
            DROP COLUMN deleted_at;

        ALTER TABLE produto_variantes
            DROP COLUMN deleted_at;

        ALTER TABLE produtos
            DROP COLUMN deleted_at;
    `);
  },
};
