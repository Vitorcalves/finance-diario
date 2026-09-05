import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrations } from '../src/models/migrations';

const DATABASE_NAME = 'finance_diario.db';

function createAdapter(raw: DatabaseSync): SQLiteDatabase {
  // expo-sqlite accepts bind params either as a single array or spread as
  // varargs; this normalizes both calling conventions to a flat array.
  const normalizeParams = (args: unknown[]): never[] => {
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0] as never[];
    }
    return args as never[];
  };

  return {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...args: unknown[]) => {
      const stmt = raw.prepare(sql);
      const result = stmt.run(...normalizeParams(args));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getFirstAsync: async <T>(sql: string, ...args: unknown[]) => {
      const stmt = raw.prepare(sql);
      return (stmt.get(...normalizeParams(args)) as T) ?? null;
    },
    getAllAsync: async <T>(sql: string, ...args: unknown[]) => {
      const stmt = raw.prepare(sql);
      return stmt.all(...normalizeParams(args)) as T[];
    },
    withTransactionAsync: async (fn: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
    closeAsync: async () => {
      raw.close();
    },
  } as unknown as SQLiteDatabase;
}

async function main(): Promise<void> {
  const dbPath = path.resolve(__dirname, '..', DATABASE_NAME);
  const raw = new DatabaseSync(dbPath);
  const db = createAdapter(raw);

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

  if (pending.length === 0) {
    console.log('Nenhuma migration pendente. Banco ja esta atualizado.');
  }

  for (const migration of pending) {
    console.log(`Aplicando migration ${migration.id} - ${migration.name}`);
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
  await db.closeAsync();

  console.log(`Banco de dados atualizado em: ${dbPath}`);
}

main().catch((error: unknown) => {
  console.error('Falha ao rodar as migrations:', error);
  process.exit(1);
});
