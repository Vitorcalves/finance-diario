/**
 * Helpers dos testes que tocam o banco.
 *
 * Cada teste comeca com um banco em memoria vazio e com todas as migrations
 * aplicadas, entao o que roda aqui e o schema real do app.
 */
import { getConnection, initializeDatabase } from '../../src/models/database';
import { migrations } from '../../src/models/migrations';
import { __novoBanco } from './expo-sqlite';

/** Banco limpo com o schema atual. Chame no inicio de cada teste. */
export const prepararBanco = async (): Promise<void> => {
  __novoBanco();
  await initializeDatabase();
};

/**
 * Volta o banco para antes da ultima migration, como o de quem ainda nao
 * atualizou o app: a proxima `initializeDatabase` a encontra pendente.
 */
export const desfazerUltimaMigration = async (): Promise<void> => {
  const ultima = migrations[migrations.length - 1];
  const down = ultima.down;

  if (!down) {
    throw new Error(`A migration ${ultima.id} nao tem down para desfazer.`);
  }

  const db = await getConnection();

  await db.withTransactionAsync(async () => {
    await down(db);
    await db.runAsync('DELETE FROM migrations WHERE id = ?', [ultima.id]);
  });
};

/** ISO fixo, para os testes nao dependerem do relogio. */
export const AGORA = '2026-01-15T12:00:00.000Z';
