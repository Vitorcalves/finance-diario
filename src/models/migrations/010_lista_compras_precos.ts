import { Migration } from './types';

/**
 * Lista de compras como pesquisa de precos: o mesmo item ganha um preco em
 * cada mercado visitado, para comparar lado a lado.
 *
 * - `lista_compras_mercados`: os mercados que entram na comparacao.
 * - `lista_compras_precos`: o preco anotado de cada item em cada mercado.
 *
 * O preco pago guardado no item (`preco_pago`, da 009) vira o preco no mercado
 * que estava escolhido, e a coluna sai: o preco agora e sempre por mercado.
 */
export const migration010: Migration = {
  id: 10,
  name: '010_lista_compras_precos',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS lista_compras_mercados
        (
            empresa_id TEXT PRIMARY KEY NOT NULL,
            ordem      INTEGER          NOT NULL DEFAULT 0,
            created_at TEXT             NOT NULL,
            CONSTRAINT fk_lista_mercado_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS lista_compras_precos
        (
            item_id    TEXT NOT NULL,
            empresa_id TEXT NOT NULL,
            preco      REAL NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (item_id, empresa_id),
            CONSTRAINT fk_lista_preco_item
                FOREIGN KEY (item_id)
                    REFERENCES lista_compras_itens (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_lista_preco_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE CASCADE
        );

        INSERT OR IGNORE INTO lista_compras_mercados (empresa_id, ordem, created_at)
        SELECT e.id, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM settings s
                 JOIN empresas e ON e.id = s.value
        WHERE s.key = 'lista_compras_mercado';

        INSERT OR IGNORE INTO lista_compras_precos (item_id, empresa_id, preco, updated_at)
        SELECT i.id, e.id, i.preco_pago, i.created_at
        FROM lista_compras_itens i
                 JOIN settings s ON s.key = 'lista_compras_mercado'
                 JOIN empresas e ON e.id = s.value
        WHERE i.preco_pago IS NOT NULL;

        ALTER TABLE lista_compras_itens DROP COLUMN preco_pago;
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        ALTER TABLE lista_compras_itens ADD COLUMN preco_pago REAL;
        DROP TABLE IF EXISTS lista_compras_precos;
        DROP TABLE IF EXISTS lista_compras_mercados;
    `);
  },
};
