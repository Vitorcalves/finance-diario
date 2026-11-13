import { Migration } from './types';

/**
 * Categorias de lancamento de cada empresa: o mercado fica em "Mercado", a
 * farmacia em "Saude" e uma loja de departamento pode ficar em varias. Com a
 * categoria escolhida no lancamento, a lista de empresas mostra so as dela.
 *
 * A ligacao some junto com a empresa ou com a categoria.
 */
export const migration019: Migration = {
  id: 19,
  name: '019_empresas_categorias',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS empresas_categorias_lancamento
        (
            empresa_id   TEXT NOT NULL,
            categoria_id TEXT NOT NULL,
            created_at   TEXT NOT NULL,
            PRIMARY KEY (empresa_id, categoria_id),
            CONSTRAINT fk_empresa_categoria_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_empresa_categoria_categoria
                FOREIGN KEY (categoria_id)
                    REFERENCES categorias_lancamento (id)
                    ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_empresas_categorias_lancamento_categoria
            ON empresas_categorias_lancamento (categoria_id);
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP INDEX IF EXISTS idx_empresas_categorias_lancamento_categoria;
        DROP TABLE IF EXISTS empresas_categorias_lancamento;
    `);
  },
};
