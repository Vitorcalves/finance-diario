import type { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './types';

/**
 * Deduz a natureza de cada transacao pelos campos que ela substitui como
 * fonte da verdade e alinha o `contabilizado_saldo` (legado) com ela. Roda
 * nesta migration e no import de um backup anterior a ela.
 *
 * A ordem dos casos importa: a parcela 0 e registro mesmo no cartao, e o
 * pagamento de fatura e a unica transferencia presa a uma fatura.
 */
export const derivarNaturezaTransacoes = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
      UPDATE transacoes
      SET natureza = CASE
          WHEN parcela_numero = 0 THEN 'registro_compra'
          WHEN conta_destino_id IS NOT NULL AND fatura_id IS NOT NULL THEN 'pagamento_fatura'
          WHEN conta_destino_id IS NOT NULL THEN 'transferencia'
          WHEN fatura_id IS NOT NULL THEN 'compra_cartao'
          ELSE 'movimento'
          END;

      UPDATE transacoes
      SET contabilizado_saldo = CASE
          WHEN natureza IN ('compra_cartao', 'registro_compra') THEN 0
          ELSE 1
          END;
  `);
};

/**
 * O caixa padrao recebe todo lancamento e plano sem conta escolhida, entao
 * precisa existir e estar ativo. Antes desta migration a tela de Contas
 * deixava exclui-lo (a FK passava a recusar esses lancamentos) ou inativa-lo
 * (o saldo dele sumia da Home). Tambem pendura nele as transacoes sem conta,
 * como a 012 fez, para cobrir o import de um backup anterior as contas.
 *
 * O SQL fica aqui, e nao importado da 012: migration ja aplicada nao muda, e
 * esta tambem passa a ser congelada depois de publicada.
 */
export const garantirCaixaPadrao = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync(`
      INSERT OR IGNORE INTO contas (id, nome, tipo, saldo_inicial, cor, ativo, ordem, created_at)
      VALUES ('caixa-padrao', 'Caixa', 'caixa', 0, NULL, 1, 0, '2026-11-03T00:00:00.000Z');

      UPDATE contas
      SET ativo = 1
      WHERE id = 'caixa-padrao';

      UPDATE transacoes
      SET conta_id = 'caixa-padrao'
      WHERE conta_id IS NULL;
  `);
};

/**
 * Natureza da transacao (ver `naturezaTransacao.ts`): o tipo de cada linha
 * passa a ser gravado, em vez de deduzido de quatro colunas por cada consulta.
 */
export const migration015: Migration = {
  id: 15,
  name: '015_natureza_transacao',
  up: async (db) => {
    await db.execAsync(`
        ALTER TABLE transacoes
            ADD COLUMN natureza TEXT NOT NULL DEFAULT 'movimento'
                CHECK (natureza IN ('movimento', 'compra_cartao', 'registro_compra',
                                    'transferencia', 'pagamento_fatura'));
    `);

    await derivarNaturezaTransacoes(db);
    await garantirCaixaPadrao(db);
  },
  down: async (db) => {
    await db.execAsync(`
        ALTER TABLE transacoes
            DROP COLUMN natureza;
    `);
  },
};
