import { Migration } from './types';

/**
 * Bloco de notas de lancamentos: o que ainda falta lancar, anotado as pressas
 * por texto ou voz ("almoco 35 ontem no cartao"). A nota sai daqui quando vira
 * lancamento; ate la, e so texto livre, sem ligacao com outras tabelas.
 */
export const migration017: Migration = {
  id: 17,
  name: '017_notas_lancamento',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notas_lancamento
        (
            id         TEXT PRIMARY KEY NOT NULL,
            texto      TEXT             NOT NULL,
            created_at TEXT             NOT NULL,
            updated_at TEXT             NOT NULL
        );
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP TABLE IF EXISTS notas_lancamento;
    `);
  },
};
