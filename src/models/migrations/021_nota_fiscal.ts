import { Migration } from './types';

/**
 * Leitura da nota fiscal pelo QR Code (NFC-e):
 *
 * - `transacoes.chave_nfce`: chave de acesso da nota que gerou o lancamento,
 *   para avisar quando o mesmo cupom e lido de novo. Fica na transacao dos
 *   itens (na compra parcelada, no registro da compra).
 * - `nfce_itens_variantes`: de-para dos itens da nota para os produtos do app,
 *   por empresa. A `chave_item` e o codigo do item na nota (o do cadastro da
 *   loja) ou, sem codigo, a descricao normalizada. Uma linha por empresa e
 *   item; aprender de novo atualiza a linha.
 *
 * Os cadastros tem exclusao logica (migration 020): o de-para que aponta para
 * um produto ou variante excluido continua no banco e e ignorado na leitura.
 */
export const migration021: Migration = {
  id: 21,
  name: '021_nota_fiscal',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE transacoes
            ADD COLUMN chave_nfce TEXT;

        CREATE INDEX IF NOT EXISTS idx_transacoes_chave_nfce
            ON transacoes (chave_nfce);

        CREATE TABLE IF NOT EXISTS nfce_itens_variantes
        (
            empresa_id  TEXT NOT NULL,
            chave_item  TEXT NOT NULL,
            produto_id  TEXT NOT NULL,
            variante_id TEXT,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            PRIMARY KEY (empresa_id, chave_item),
            CONSTRAINT fk_nfce_item_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_nfce_item_produto
                FOREIGN KEY (produto_id)
                    REFERENCES produtos (id)
                    ON DELETE CASCADE,
            CONSTRAINT fk_nfce_item_variante
                FOREIGN KEY (variante_id)
                    REFERENCES produto_variantes (id)
                    ON DELETE SET NULL
        );
    `);
  },
  down: async (db) => {
    // O SQLite nao apaga coluna com indice: o indice sai antes.
    await db.execAsync(`
        DROP TABLE IF EXISTS nfce_itens_variantes;
        DROP INDEX IF EXISTS idx_transacoes_chave_nfce;

        ALTER TABLE transacoes
            DROP COLUMN chave_nfce;
    `);
  },
};
