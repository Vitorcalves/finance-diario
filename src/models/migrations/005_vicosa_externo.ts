import { Migration } from './types';

/**
 * Local onde o preco foi pago ou cotado (ex.: Muriae x Vicosa).
 *
 * Guarda o id do catalogo fixo em `utils/local` - sem tabela propria porque a
 * lista e pequena e muda raramente, igual as unidades de medida.
 */
export const migration005: Migration = {
  id: 5,
  name: '005_vicosa_externo',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE historico_preco
            ADD COLUMN local INTEGER NOT NULL DEFAULT 1;

        ALTER TABLE transacoes
            ADD COLUMN local INTEGER NOT NULL DEFAULT 1;
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        ALTER TABLE historico_preco
            DROP COLUMN local;

        ALTER TABLE transacoes
            DROP COLUMN local;
    `);
  },
};
