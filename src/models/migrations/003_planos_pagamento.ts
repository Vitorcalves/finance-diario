import { Migration } from './types';

/**
 * Compras parceladas e assinaturas.
 *
 * A regra vive em `planos_pagamento`; cada cobranca e materializada como uma
 * linha real em `transacoes`, para que toda tela que ja le transacoes continue
 * funcionando sem conhecer parcelamento.
 *
 * `contabilizado_saldo` passa a ter uso: a transacao da compra (parcela 0)
 * guarda o valor cheio e os itens, mas fica fora do fluxo de caixa; quem conta
 * no caixa sao as parcelas.
 */
export const migration003: Migration = {
  id: 3,
  name: '003_planos_pagamento',
  up: async (db) => {
    await db.execAsync(`
        DROP TABLE IF EXISTS recorrentes;

        CREATE TABLE IF NOT EXISTS planos_pagamento
        (
            id             TEXT PRIMARY KEY NOT NULL,
            tipo           TEXT             NOT NULL,
            descricao      TEXT             NOT NULL,
            empresa_id     TEXT,
            valor_parcela  REAL             NOT NULL,
            valor_total    REAL,
            total_parcelas INTEGER,
            frequencia     TEXT             NOT NULL DEFAULT 'mensal',
            intervalo      INTEGER          NOT NULL DEFAULT 1,
            data_inicio    TEXT             NOT NULL,
            data_fim       TEXT,
            ativo          INTEGER          NOT NULL DEFAULT 1,
            gerado_ate     TEXT,
            created_at     TEXT             NOT NULL,
            CONSTRAINT chk_plano_tipo CHECK (tipo IN ('parcelamento', 'assinatura')),
            CONSTRAINT chk_plano_frequencia CHECK (frequencia IN ('semanal', 'mensal', 'anual')),
            CONSTRAINT fk_plano_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE SET NULL
        );

        ALTER TABLE transacoes
            ADD COLUMN plano_id TEXT REFERENCES planos_pagamento (id) ON DELETE CASCADE;

        ALTER TABLE transacoes
            ADD COLUMN parcela_numero INTEGER;

        -- Idempotencia do gerador: rodar duas vezes nao duplica cobranca.
        -- Parcela 0 e a transacao da compra; 1..n sao as parcelas.
        CREATE UNIQUE INDEX IF NOT EXISTS ux_transacoes_plano_parcela
            ON transacoes (plano_id, parcela_numero)
            WHERE plano_id IS NOT NULL;

        CREATE INDEX IF NOT EXISTS ix_transacoes_data ON transacoes (data);

        -- O default da coluna era 0 e nada a preenchia: sem este backfill todos
        -- os lancamentos existentes sumiriam do saldo.
        UPDATE transacoes
        SET contabilizado_saldo = 1;
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP INDEX IF EXISTS ux_transacoes_plano_parcela;
        DROP INDEX IF EXISTS ix_transacoes_data;

        ALTER TABLE transacoes
            DROP COLUMN parcela_numero;
        ALTER TABLE transacoes
            DROP COLUMN plano_id;

        DROP TABLE IF EXISTS planos_pagamento;
    `);
  },
};
