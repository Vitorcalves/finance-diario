import { Migration } from './types';

/**
 * Entrada programada (salário): plano de pagamento com conta de destino
 * opcional. Quando `conta_destino_id` esta preenchido, cada cobranca e
 * gravada como entrada direta na conta (renda que entra no caixa todo mes),
 * sem origem. `NULL` mantem o comportamento antigo: cobranca comum na conta
 * do plano.
 */
export const migration014: Migration = {
  id: 14,
  name: '014_entrada_programada',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE planos_pagamento
            ADD COLUMN conta_destino_id TEXT REFERENCES contas (id) ON DELETE SET NULL;
    `);
  },
  down: async (db) => {
    // O SQLite nao remove coluna com chave estrangeira: recria a tabela.
    await db.execAsync(`
        CREATE TABLE planos_sem_destino
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
            categoria_id   TEXT,
            conta_id       TEXT,
            created_at     TEXT             NOT NULL,
            CONSTRAINT chk_plano_tipo CHECK (tipo IN ('parcelamento', 'assinatura')),
            CONSTRAINT chk_plano_frequencia CHECK (frequencia IN ('semanal', 'mensal', 'anual')),
            CONSTRAINT fk_plano_empresa
                FOREIGN KEY (empresa_id)
                    REFERENCES empresas (id)
                    ON DELETE SET NULL
        );

        INSERT INTO planos_sem_destino (id, tipo, descricao, empresa_id, valor_parcela,
                                        valor_total, total_parcelas, frequencia, intervalo,
                                        data_inicio, data_fim, ativo, gerado_ate,
                                        categoria_id, conta_id, created_at)
        SELECT id, tipo, descricao, empresa_id, valor_parcela, valor_total, total_parcelas,
               frequencia, intervalo, data_inicio, data_fim, ativo, gerado_ate, categoria_id,
               conta_id, created_at
        FROM planos_pagamento;

        DROP TABLE planos_pagamento;

        ALTER TABLE planos_sem_destino RENAME TO planos_pagamento;
    `);
  },
};
