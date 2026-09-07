import { Migration } from './types';

export const migration002: Migration = {
  id: 2,
  name: '002_item_transacao_variante',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE itens_transacao
            ADD COLUMN variante_id TEXT REFERENCES produto_variantes (id) ON DELETE SET NULL;
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        ALTER TABLE itens_transacao
            DROP COLUMN variante_id;
    `);
  },
};
