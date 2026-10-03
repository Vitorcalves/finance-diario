import { Migration } from './types';

/**
 * Marca/variante vista em cada preco anotado na lista de compras. Opcional:
 * com ela, o preco de um item "qualquer marca" tambem vai para o historico de
 * precos, que e sempre por variante.
 */
export const migration011: Migration = {
  id: 11,
  name: '011_lista_compras_preco_variante',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE lista_compras_precos
            ADD COLUMN variante_id TEXT REFERENCES produto_variantes (id) ON DELETE SET NULL;
    `);
  },
  down: async (db) => {
    // O SQLite nao remove coluna que participa de chave estrangeira: recria a tabela.
    await db.execAsync(`
        CREATE TABLE lista_compras_precos_sem_variante
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

        INSERT INTO lista_compras_precos_sem_variante (item_id, empresa_id, preco, updated_at)
        SELECT item_id, empresa_id, preco, updated_at
        FROM lista_compras_precos;

        DROP TABLE lista_compras_precos;

        ALTER TABLE lista_compras_precos_sem_variante RENAME TO lista_compras_precos;
    `);
  },
};
