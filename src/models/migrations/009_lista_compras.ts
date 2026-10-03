import { Migration } from './types';

/**
 * Lista de compras: o que levar ao mercado e, durante a compra, o que ja foi
 * para o carrinho e por quanto. Fica no banco para nao se perder se o app
 * fechar no meio da compra.
 *
 * O item pode apontar para um produto (e variante) cadastrado ou ser so um
 * texto livre ("papel toalha").
 */
export const migration009: Migration = {
  id: 9,
  name: '009_lista_compras',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS lista_compras_itens
        (
            id          TEXT PRIMARY KEY NOT NULL,
            produto_id  TEXT,
            variante_id TEXT,
            descricao   TEXT             NOT NULL,
            quantidade  REAL             NOT NULL DEFAULT 1,
            comprado    INTEGER          NOT NULL DEFAULT 0,
            preco_pago  REAL,
            ordem       INTEGER          NOT NULL DEFAULT 0,
            created_at  TEXT             NOT NULL,
            CONSTRAINT fk_lista_produto
                FOREIGN KEY (produto_id)
                    REFERENCES produtos (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_lista_variante
                FOREIGN KEY (variante_id)
                    REFERENCES produto_variantes (id)
                    ON DELETE SET NULL
        );
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP TABLE IF EXISTS lista_compras_itens;
    `);
  },
};
