import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getConnection = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('finance_diario.db');
  }

  return dbPromise;
};

export const initializeDatabase = async (): Promise<void> => {
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
      descricao TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS itens_transacao (
      id TEXT PRIMARY KEY NOT NULL,
      transacao_id TEXT NOT NULL,
      produto_id TEXT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_transacao 
        FOREIGN KEY (transacao_id) 
        REFERENCES transacoes(id) 
        ON DELETE CASCADE,
      CONSTRAINT fk_produto 
        FOREIGN KEY (produto_id) 
        REFERENCES produtos(id) 
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS marcas (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      codigo_barras TEXT,
      marca_id TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_marca 
      FOREIGN KEY (marca_id) 
      REFERENCES marcas(id) 
      ON DELETE SET NULL,
      CONSTRAINT fk_categoria_produto 
      );
      
    CREATE TABLE IF NOT EXISTS categoria_produto (
      id TEXT PRIMARY KEY NOT NULL,
      categoria_id TEXT NOT NULL,
      produto_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_categoria 
        FOREIGN KEY (categoria_id) 
        REFERENCES categorias(id) 
        ON DELETE CASCADE,
      CONSTRAINT fk_produto 
        FOREIGN KEY (produto_id) 
        REFERENCES produtos(id) 
        ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS historico_preco_produtos (
      id TEXT PRIMARY KEY NOT NULL,
      produto_id TEXT NOT NULL,
      preco REAL NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_produto_historico 
        FOREIGN KEY (produto_id) 
        REFERENCES produtos(id) 
        ON DELETE CASCADE
    );
    


    PRAGMA foreign_keys = ON;
  `);
};

export const clearDatabase = async (): Promise<void> => {
  const db = await getConnection();
  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS itens_transacao;
    DROP TABLE IF EXISTS transacoes;
    DROP TABLE IF EXISTS recorrentes;
    DROP TABLE IF EXISTS categorias;
    DROP TABLE IF EXISTS produtos;
    DROP TABLE IF EXISTS marcas;
    DROP TABLE IF EXISTS categoria_produto;
    DROP TABLE IF EXISTS historico_preco_produtos;
    DROP TABLE IF EXISTS settings;
    PRAGMA foreign_keys = ON;
  `);
};

export const recriarDatabase = async (): Promise<void> => {
  await clearDatabase();
  await initializeDatabase();
};
