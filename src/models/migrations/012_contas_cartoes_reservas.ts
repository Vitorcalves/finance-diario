import { Migration } from './types';

/**
 * Contas: caixa, reserva de investimento e cartao de credito.
 *
 * O caixa unico global vira a conta 'caixa-padrao' e o historico de
 * transacoes passa a apontar para ela. Compras no cartao apontam para a
 * conta do cartao e para a fatura do ciclo; pagamentos de fatura e
 * aportes/resgates entre contas gravam as duas pontas na mesma linha.
 */
export const migration012: Migration = {
  id: 12,
  name: '012_contas_cartoes_reservas',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE contas
        (
            id             TEXT PRIMARY KEY NOT NULL,
            nome           TEXT             NOT NULL,
            tipo           TEXT             NOT NULL
                CHECK (tipo IN ('caixa', 'reserva', 'cartao')),
            dia_fechamento INTEGER          CHECK (dia_fechamento BETWEEN 1 AND 31),
            dia_vencimento INTEGER          CHECK (dia_vencimento BETWEEN 1 AND 31),
            meta_valor     REAL,
            saldo_inicial  REAL             NOT NULL DEFAULT 0,
            cor            TEXT,
            ativo          BOOLEAN          NOT NULL DEFAULT 1,
            ordem          INTEGER          NOT NULL DEFAULT 0,
            created_at     TEXT             NOT NULL
        );

        CREATE TABLE faturas
        (
            id              TEXT PRIMARY KEY NOT NULL,
            conta_id        TEXT             NOT NULL,
            mes_ref         TEXT             NOT NULL,
            data_fechamento TEXT             NOT NULL,
            data_vencimento TEXT             NOT NULL,
            paga            BOOLEAN          NOT NULL DEFAULT 0,
            created_at      TEXT             NOT NULL,
            UNIQUE (conta_id, mes_ref)
        );

        ALTER TABLE transacoes
            ADD COLUMN conta_id TEXT REFERENCES contas (id) ON DELETE SET NULL;

        ALTER TABLE transacoes
            ADD COLUMN conta_destino_id TEXT REFERENCES contas (id) ON DELETE SET NULL;

        ALTER TABLE transacoes
            ADD COLUMN fatura_id TEXT REFERENCES faturas (id) ON DELETE SET NULL;

        INSERT INTO contas (id, nome, tipo, saldo_inicial, cor, ativo, ordem, created_at)
        VALUES ('caixa-padrao', 'Caixa', 'caixa', 0, NULL, 1, 0, '2026-11-03T00:00:00.000Z');

        UPDATE transacoes
        SET conta_id = 'caixa-padrao'
        WHERE conta_id IS NULL;
    `);
  },
  down: async (db) => {
    // O SQLite nao remove coluna com chave estrangeira: recria transacoes.
    await db.execAsync(`
        CREATE TABLE transacoes_sem_contas
        (
            id                  TEXT PRIMARY KEY NOT NULL,
            descricao           TEXT             NOT NULL,
            valor               REAL             NOT NULL,
            data                TEXT             NOT NULL,
            empresa_id          TEXT,
            contabilizado_saldo BOOLEAN          NOT NULL DEFAULT 1,
            plano_id            TEXT,
            parcela_numero      INTEGER,
            local               INTEGER,
            categoria_id        TEXT,
            created_at          TEXT             NOT NULL
        );

        INSERT INTO transacoes_sem_contas (id, descricao, valor, data, empresa_id,
                                           contabilizado_saldo, plano_id, parcela_numero,
                                           local, categoria_id, created_at)
        SELECT id, descricao, valor, data, empresa_id, contabilizado_saldo, plano_id,
               parcela_numero, local, categoria_id, created_at
        FROM transacoes;

        DROP TABLE transacoes;

        ALTER TABLE transacoes_sem_contas RENAME TO transacoes;

        DROP TABLE faturas;
        DROP TABLE contas;
    `);
  },
};
