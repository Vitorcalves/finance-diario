import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getConnection = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('finance_diario.db');
  }

  return dbPromise;
};

export const initializeDatabase = async () => {
  const db = await getConnection();

  // DROP TABLE IF EXISTS recorrentes;
  // DROP TABLE IF EXISTS entradas_saidas;
  // DROP TABLE IF EXISTS categorias;
  // DROP TABLE IF EXISTS expenses;
  // DROP TABLE IF EXISTS settings;

  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    PRAGMA journal_mode = WAL;



    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      contabilizado_saldo BOOLEAN NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      categoria_id TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_categoria 
        FOREIGN KEY (categoria_id) 
        REFERENCES categorias(id) 
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS recorrentes (
      id TEXT PRIMARY KEY NOT NULL,
      descricao TEXT NOT NULL,
      positivo BOOLEAN NOT NULL DEFAULT 0,
      valor REAL NOT NULL,
      inicio TEXT NOT NULL,
      frequencia TEXT NOT NULL,
      proximo_pagamento TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saldos (
      id TEXT PRIMARY KEY NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    PRAGMA foreign_keys = ON;
  `);
};
