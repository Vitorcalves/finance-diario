import type { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './types';

/**
 * Cotacao sem variante herda a do item, que era o sentido dela ate a 015
 * ("sem a marca vista, vale a do item"). Da 016 em diante a cotacao sem
 * variante e so "marca nao informada": a variante do item muda quando o
 * usuario escolhe outra cotacao para levar, e o preco antigo nao pode mudar
 * de marca junto.
 *
 * Usado pela migracao e pelo import de backup gerado antes dela.
 */
export const herdarVarianteDoItem = async (db: SQLiteDatabase): Promise<void> => {
  await db.runAsync(`
      UPDATE lista_compras_precos
      SET variante_id = (SELECT i.variante_id
                         FROM lista_compras_itens i
                         WHERE i.id = lista_compras_precos.item_id)
      WHERE variante_id IS NULL
  `);
};

/**
 * Lista de compras com varias cotacoes por mercado: o mesmo item pode ter o
 * preco de cada marca/embalagem vista no mesmo mercado, para comparar sem
 * lancar o produto de novo.
 *
 * `lista_compras_precos` deixa a chave (item, mercado) e ganha um `id` proprio.
 * O valor padrao do `id` deixa entrar backup antigo, que nao tem a coluna.
 * Nao ha indice unico em (item, mercado, variante): com o `ON DELETE SET NULL`
 * da variante, excluir uma marca do cadastro poderia esbarrar nele. A tela
 * e que nao repete a variante no mesmo mercado.
 */
export const migration016: Migration = {
  id: 16,
  name: '016_lista_compras_cotacoes',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE lista_compras_precos_cotacoes
        (
            id          TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
            item_id     TEXT NOT NULL,
            empresa_id  TEXT NOT NULL,
            preco       REAL NOT NULL,
            variante_id TEXT,
            updated_at  TEXT NOT NULL,
            CONSTRAINT fk_lista_preco_item
                FOREIGN KEY (item_id)
                    REFERENCES lista_compras_itens (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_lista_preco_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_lista_preco_variante
                FOREIGN KEY (variante_id)
                    REFERENCES produto_variantes (id)
                    ON DELETE SET NULL
        );

        INSERT INTO lista_compras_precos_cotacoes (item_id, empresa_id, preco, variante_id, updated_at)
        SELECT p.item_id, p.empresa_id, p.preco, p.variante_id, p.updated_at
        FROM lista_compras_precos p
                 JOIN lista_compras_itens i ON i.id = p.item_id
        ORDER BY p.rowid;

        DROP TABLE lista_compras_precos;

        ALTER TABLE lista_compras_precos_cotacoes RENAME TO lista_compras_precos;

        CREATE INDEX IF NOT EXISTS idx_lista_compras_precos_item
            ON lista_compras_precos (item_id, empresa_id);
    `);

    await herdarVarianteDoItem(db);
  },
  down: async (db) => {
    // Volta a um preco por item e mercado: fica a cotacao da variante do item
    // ou, sem ela, a anotada por ultimo.
    await db.execAsync(`
        CREATE TABLE lista_compras_precos_por_mercado
        (
            item_id     TEXT NOT NULL,
            empresa_id  TEXT NOT NULL,
            preco       REAL NOT NULL,
            updated_at  TEXT NOT NULL,
            variante_id TEXT REFERENCES produto_variantes (id) ON DELETE SET NULL,
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

        INSERT OR IGNORE INTO lista_compras_precos_por_mercado (item_id, empresa_id, preco, updated_at, variante_id)
        SELECT p.item_id, p.empresa_id, p.preco, p.updated_at, p.variante_id
        FROM lista_compras_precos p
                 LEFT JOIN lista_compras_itens i ON i.id = p.item_id
        ORDER BY (p.variante_id IS i.variante_id) DESC, p.updated_at DESC;

        DROP TABLE lista_compras_precos;

        ALTER TABLE lista_compras_precos_por_mercado RENAME TO lista_compras_precos;
    `);
  },
};
