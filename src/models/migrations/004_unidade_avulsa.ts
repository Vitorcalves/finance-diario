import { Migration } from './types';

/**
 * Unidade avulsa ("Unidade", id 7).
 *
 * A definicao ja existia em `utils/unidades`, mas nunca foi para a tabela
 * `unidades`: salvar um produto ou variante com ela quebrava a FK
 * `unidade_id`. O id e fixo porque `utils/unidades` referencia esses ids.
 */
export const migration004: Migration = {
  id: 4,
  name: '004_unidade_avulsa',
  up: async (db) => {
    await db.execAsync(`
        INSERT OR IGNORE INTO unidades (id, descricao, primario)
        VALUES (7, 'Unidade', 1);
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DELETE
        FROM unidades
        WHERE id = 7;
    `);
  },
};
