import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DATABASE_NAME = 'finance_diario.db';

const openConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
};

const isInvalidNativeConnectionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('nativedatabase.prepareasync') ||
    message.includes('nullpointerexception') ||
    message.includes('database is closed')
  );
};

/**
 * Abre a conexao e confere uma unica vez que ela responde.
 *
 * Depois de um reload do app o modulo nativo pode devolver uma conexao ja
 * fechada; nesse caso uma nova e aberta. A conferencia fica so na abertura:
 * repeti-la antes de toda consulta dobrava as idas ao banco.
 */
const abrirConexaoValidada = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await openConnection();

  try {
    await db.getFirstAsync<{ ok: number }>('SELECT 1 AS ok');
    return db;
  } catch (error: unknown) {
    if (!isInvalidNativeConnectionError(error)) {
      throw error;
    }

    const nova = await openConnection();
    await nova.getFirstAsync<{ ok: number }>('SELECT 1 AS ok');
    return nova;
  }
};

export const getConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    const abertura = abrirConexaoValidada();
    dbPromise = abertura;

    // Falhou ao abrir: a proxima chamada tenta de novo em vez de herdar o erro.
    abertura.catch(() => {
      if (dbPromise === abertura) {
        dbPromise = null;
      }
    });
  }

  return dbPromise;
};

let profundidadeTransacao = 0;

/**
 * Roda `operacao` dentro de uma transacao: se qualquer passo falhar, nada do
 * que ela gravou fica no banco (ex.: compra parcelada sem parcelas, produto sem
 * as variantes).
 *
 * Chamadas aninhadas reaproveitam a transacao de fora - o SQLite nao aceita um
 * BEGIN dentro de outro.
 */
export const emTransacao = async <T>(operacao: () => Promise<T>): Promise<T> => {
  if (profundidadeTransacao > 0) {
    return operacao();
  }

  const db = await getConnection();
  let resultado: T | undefined;

  profundidadeTransacao += 1;

  try {
    await db.withTransactionAsync(async () => {
      resultado = await operacao();
    });
  } finally {
    profundidadeTransacao -= 1;
  }

  return resultado as T;
};

export const initializeDatabase = async (): Promise<void> => {
  const db = await getConnection();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = OFF;

    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const lastApplied = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM migrations ORDER BY id DESC LIMIT 1',
  );

  const lastId = lastApplied?.id ?? 0;
  const pending = migrations.filter((m) => m.id > lastId);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync('INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)', [
        migration.id,
        migration.name,
        new Date().toISOString(),
      ]);
    });
  }

  await db.execAsync('PRAGMA foreign_keys = ON;');
};

export const clearDatabase = async (): Promise<void> => {
  const db = await getConnection();
  const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM migrations ORDER BY id DESC');

  for (const row of rows) {
    const migration = migrations.find((m) => m.id === row.id);
    if (migration?.down) {
      await db.withTransactionAsync(async () => {
        await migration.down!(db);
        await db.runAsync('DELETE FROM migrations WHERE id = ?', [migration.id]);
      });
    }
  }
};

export const recriarDatabase = async (): Promise<void> => {
  const db = await getConnection();
  await clearDatabase();
  await db.closeAsync();
  dbPromise = null;
  await initializeDatabase();
};
