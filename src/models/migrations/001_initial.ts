import { Migration } from './types';

export const migration001: Migration = {
  id: 1,
  name: '001_initial',
  up: async (db) => {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      CNPJ TEXT,
      OBSERVACAO TEXT,
      created_at TEXT NOT NULL
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
      quantidade REAL,
      unidade TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_marca 
        FOREIGN KEY (marca_id) 
        REFERENCES marcas(id) 
        ON DELETE SET NULL
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
      empresa_id TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_produto_historico 
        FOREIGN KEY (produto_id) 
        REFERENCES produtos(id) 
        ON DELETE CASCADE,
      CONSTRAINT fk_empresa_historico 
        FOREIGN KEY (empresa_id) 
        REFERENCES empresas(id) 
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      contabilizado_saldo BOOLEAN NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      categoria_id TEXT,
      empresa_id TEXT,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_categoria 
        FOREIGN KEY (categoria_id) 
        REFERENCES categorias(id) 
        ON DELETE SET NULL,
      CONSTRAINT fk_empresa 
        FOREIGN KEY (empresa_id) 
        REFERENCES empresas(id) 
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transacoes_tags (
      id TEXT PRIMARY KEY NOT NULL,
      transacao_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CONSTRAINT fk_transacao_tag 
        FOREIGN KEY (transacao_id) 
        REFERENCES transacoes(id) 
        ON DELETE CASCADE,
      CONSTRAINT fk_tag 
        FOREIGN KEY (tag_id) 
        REFERENCES tags(id) 
        ON DELETE CASCADE
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
      quantidade REAL,
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
    `);
  },
  down: async (db) => {
    await db.execAsync(`
      DROP TABLE IF EXISTS itens_transacao;
      DROP TABLE IF EXISTS recorrentes;
      DROP TABLE IF EXISTS transacoes_tags;
      DROP TABLE IF EXISTS transacoes;
      DROP TABLE IF EXISTS historico_preco_produtos;
      DROP TABLE IF EXISTS categoria_produto;
      DROP TABLE IF EXISTS produtos;
      DROP TABLE IF EXISTS marcas;
      DROP TABLE IF EXISTS empresas;
      DROP TABLE IF EXISTS categorias;
      DROP TABLE IF EXISTS tags;
    `);
  },
};
