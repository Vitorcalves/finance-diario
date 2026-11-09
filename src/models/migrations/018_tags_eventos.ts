import { Migration } from './types';

/**
 * Tags de eventos ("Viagem julho", "Reforma"). As tabelas `tags` e
 * `transacoes_tags` existem desde a 001, mas nenhuma tela as usava. Agora que
 * os lancamentos ganham tags, a mesma tag nao pode entrar duas vezes no mesmo
 * lancamento (contaria o gasto em dobro no total do evento), e o total de
 * cada tag precisa achar os lancamentos dela sem varrer a tabela inteira.
 */
export const migration018: Migration = {
  id: 18,
  name: '018_tags_eventos',
  up: async (db) => {
    await db.execAsync(`
        DELETE
        FROM transacoes_tags
        WHERE rowid NOT IN (SELECT MIN(rowid)
                            FROM transacoes_tags
                            GROUP BY transacao_id, tag_id);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_transacoes_tags_unica
            ON transacoes_tags (transacao_id, tag_id);

        CREATE INDEX IF NOT EXISTS idx_transacoes_tags_tag
            ON transacoes_tags (tag_id);
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP INDEX IF EXISTS idx_transacoes_tags_tag;
        DROP INDEX IF EXISTS idx_transacoes_tags_unica;
    `);
  },
};
