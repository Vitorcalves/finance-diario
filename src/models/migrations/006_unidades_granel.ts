import { Migration } from './types';

/**
 * Unidades de venda a granel (tomate, carne, tecido...).
 *
 * Sao "Quilo (granel)", "Litro (granel)" e "Metro (granel)": mesma medida das
 * primarias, mas sinalizam que nao existe embalagem - o preco da variante e por
 * kg/L/m e o item do lancamento aceita peso fracionado. Os ids sao fixos porque
 * `utils/unidades` referencia esses ids.
 */
export const migration006: Migration = {
  id: 6,
  name: '006_unidades_granel',
  up: async (db) => {
    await db.execAsync(`
        INSERT OR IGNORE INTO unidades (id, descricao, primario)
        VALUES (8, 'Quilo (granel)', 0),
               (9, 'Litro (granel)', 0),
               (10, 'Metro (granel)', 0);
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DELETE
        FROM unidades
        WHERE id IN (8, 9, 10);
    `);
  },
};
