import * as SQLite from 'expo-sqlite';
import {migrations} from './migrations';

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

export const getConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = openConnection();
  }

  let db = await dbPromise;

  try {
    await db.getFirstAsync<{ ok: number }>('SELECT 1 AS ok');
    return db;
  } catch (error: unknown) {
    if (!isInvalidNativeConnectionError(error)) {
      throw error;
    }
    
    dbPromise = openConnection();
    db = await dbPromise;
    await db.getFirstAsync<{ ok: number }>('SELECT 1 AS ok');
    return db;
  }
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
