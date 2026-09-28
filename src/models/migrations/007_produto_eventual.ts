import { Migration } from './types';

/**
 * Produto de compra eventual (mouse, liquidificador...): comprado a cada
 * poucos anos. Fica fora da lista padrao de produtos e so aparece no seletor
 * do lancamento quando buscado. Todo produto existente continua frequente.
 */
export const migration007: Migration = {
  id: 7,
  name: '007_produto_eventual',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE produtos
            ADD COLUMN eventual INTEGER NOT NULL DEFAULT 0;
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        ALTER TABLE produtos
            DROP COLUMN eventual;
    `);
  },
};
