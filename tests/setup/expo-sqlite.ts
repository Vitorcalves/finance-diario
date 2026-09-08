/**
 * Substituto de `expo-sqlite` para os testes.
 *
 * `tsconfig.test.json` aponta o modulo `expo-sqlite` para este arquivo, entao
 * `src/models/database.ts` roda sem alteracao nenhuma e os testes exercitam o
 * SQL de verdade, em um banco em memoria, via `node:sqlite`.
 *
 * O adapter mantem a mesma identidade de objeto durante todo o processo porque
 * `database.ts` guarda a conexao em cache: trocar o banco por baixo dele e o
 * que permite comecar cada teste do zero.
 */
import { DatabaseSync } from 'node:sqlite';

type ValorBind = string | number | bigint | null | Uint8Array;

// expo-sqlite abre com as FKs desligadas; quem as liga e o `initializeDatabase`.
const abrir = (): DatabaseSync =>
  new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });

let raw = abrir();
let fechado = false;

/** Descarta o banco atual e devolve um vazio. Use no `beforeEach` dos testes. */
export const __novoBanco = (): void => {
  if (!fechado) {
    raw.close();
  }

  raw = abrir();
  fechado = false;
};

/** `runAsync(sql, [a, b])` e `runAsync(sql, a, b)` sao as duas formas aceitas. */
const parametros = (args: unknown[]): ValorBind[] => {
  const lista = args.length === 1 && Array.isArray(args[0]) ? (args[0] as unknown[]) : args;

  return lista.map((valor) => {
    if (valor === undefined || valor === null) {
      return null;
    }

    // node:sqlite recusa booleanos; expo-sqlite os converte silenciosamente.
    if (typeof valor === 'boolean') {
      return valor ? 1 : 0;
    }

    return valor as ValorBind;
  });
};

/**
 * `node:sqlite` devolve linhas sem prototipo; `expo-sqlite` devolve objetos
 * comuns. Sem isso, comparar resultados com `assert.deepEqual` falharia por um
 * detalhe do mock, e nao do codigo em teste.
 */
const comum = (linha: unknown): Record<string, unknown> => ({
  ...(linha as Record<string, unknown>),
});

type StatementPreparado = {
  executeAsync: (...args: unknown[]) => Promise<{ changes: number }>;
  finalizeAsync: () => Promise<void>;
};

const adapter = {
  execAsync: async (sql: string): Promise<void> => {
    raw.exec(sql);
  },

  runAsync: async (
    sql: string,
    ...args: unknown[]
  ): Promise<{ lastInsertRowId: number; changes: number }> => {
    const resultado = raw.prepare(sql).run(...parametros(args));

    return {
      lastInsertRowId: Number(resultado.lastInsertRowid),
      changes: Number(resultado.changes),
    };
  },

  getFirstAsync: async <T>(sql: string, ...args: unknown[]): Promise<T | null> => {
    const linha = raw.prepare(sql).get(...parametros(args));
    return linha === undefined ? null : (comum(linha) as T);
  },

  getAllAsync: async <T>(sql: string, ...args: unknown[]): Promise<T[]> => {
    return raw
      .prepare(sql)
      .all(...parametros(args))
      .map(comum) as T[];
  },

  prepareAsync: async (sql: string): Promise<StatementPreparado> => {
    const statement = raw.prepare(sql);

    return {
      executeAsync: async (...args: unknown[]): Promise<{ changes: number }> => {
        const resultado = statement.run(...parametros(args));
        return { changes: Number(resultado.changes) };
      },
      finalizeAsync: async (): Promise<void> => {
        // node:sqlite finaliza o statement junto com o banco.
      },
    };
  },

  withTransactionAsync: async (fn: () => Promise<void>): Promise<void> => {
    raw.exec('BEGIN');

    try {
      await fn();
      raw.exec('COMMIT');
    } catch (error: unknown) {
      raw.exec('ROLLBACK');
      throw error;
    }
  },

  closeAsync: async (): Promise<void> => {
    raw.close();
    fechado = true;
  },
};

export type SQLiteDatabase = typeof adapter;

/** O nome e ignorado: em teste o banco e sempre `:memory:`. */
export const openDatabaseAsync = async (_nome?: string): Promise<SQLiteDatabase> => {
  // `recriarDatabase()` fecha a conexao e pede outra.
  if (fechado) {
    raw = abrir();
    fechado = false;
  }

  return adapter;
};
