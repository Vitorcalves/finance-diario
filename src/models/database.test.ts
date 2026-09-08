import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { clearDatabase, getConnection, initializeDatabase, recriarDatabase } from './database';
import { migrations } from './migrations';

const tabelas = async (): Promise<string[]> => {
  const db = await getConnection();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );

  return rows.map((row) => row.name);
};

beforeEach(async () => {
  await prepararBanco();
});

describe('initializeDatabase', () => {
  test('aplica todas as migrations e registra cada uma', async () => {
    const db = await getConnection();
    const aplicadas = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT id, name FROM migrations ORDER BY id',
    );

    assert.deepEqual(
      aplicadas.map((linha) => linha.id),
      migrations.map((migration) => migration.id),
    );
    assert.deepEqual(
      aplicadas.map((linha) => linha.name),
      migrations.map((migration) => migration.name),
    );
  });

  test('cria as tabelas do app', async () => {
    const esperadas = [
      'categoria_produto',
      'categorias',
      'empresas',
      'historico_preco',
      'itens_transacao',
      'marcas',
      'planos_pagamento',
      'produto_variantes',
      'produtos',
      'settings',
      'tags',
      'transacoes',
      'transacoes_tags',
      'unidades',
    ];

    const existentes = await tabelas();

    for (const tabela of esperadas) {
      assert.ok(existentes.includes(tabela), `faltou a tabela ${tabela}`);
    }
  });

  test('a migration 003 removeu recorrentes', async () => {
    assert.ok(!(await tabelas()).includes('recorrentes'));
  });

  test('deixa as foreign keys ligadas', async () => {
    const db = await getConnection();
    const pragma = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');

    assert.equal(pragma?.foreign_keys, 1);
  });

  test('rodar de novo nao reaplica nada', async () => {
    await initializeDatabase();

    const db = await getConnection();
    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM migrations',
    );

    assert.equal(total?.total, migrations.length);
  });

  test('as migrations tem ids unicos e em ordem crescente', () => {
    const ids = migrations.map((migration) => migration.id);

    assert.deepEqual(
      ids,
      [...ids].sort((a, b) => a - b),
    );
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('unidades semeadas', () => {
  test('as sete unidades usadas pelo app existem no banco', async () => {
    const db = await getConnection();
    const unidades = await db.getAllAsync<{ id: number; descricao: string }>(
      'SELECT id, descricao FROM unidades ORDER BY id',
    );

    assert.deepEqual(unidades, [
      { id: 1, descricao: 'Metros' },
      { id: 2, descricao: 'Quilogramas' },
      { id: 3, descricao: 'Litros' },
      { id: 4, descricao: 'Gramas' },
      { id: 5, descricao: 'Centímetros' },
      { id: 6, descricao: 'Mililitros' },
      { id: 7, descricao: 'Unidade' },
    ]);
  });
});

describe('indice de idempotencia das parcelas', () => {
  test('o mesmo (plano, parcela) nao entra duas vezes', async () => {
    const db = await getConnection();

    await db.runAsync(
      `INSERT INTO planos_pagamento (id, tipo, descricao, valor_parcela, frequencia, intervalo,
                                     data_inicio, ativo, created_at)
       VALUES ('pl1', 'assinatura', 'X', -10, 'mensal', 1, '2026-01-01', 1, '2026-01-01')`,
    );

    const inserir = (id: string): Promise<unknown> =>
      db.runAsync(
        `INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, contabilizado_saldo,
                                           plano_id, parcela_numero, created_at)
         VALUES (?, 'X', -10, '2026-01-01', 1, 'pl1', 1, '2026-01-01')`,
        [id],
      );

    await inserir('t1');
    await inserir('t2');

    const total = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM transacoes WHERE plano_id = 'pl1'`,
    );

    assert.equal(total?.total, 1);
  });

  test('transacoes sem plano nao sao afetadas pelo indice', async () => {
    const db = await getConnection();

    for (const id of ['a', 'b']) {
      await db.runAsync(
        `INSERT INTO transacoes (id, descricao, valor, data, contabilizado_saldo, created_at)
         VALUES (?, 'Avulsa', -5, '2026-01-01', 1, '2026-01-01')`,
        [id],
      );
    }

    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM transacoes',
    );

    assert.equal(total?.total, 2);
  });
});

describe('clearDatabase e recriarDatabase', () => {
  test('clearDatabase desfaz as migrations sem erro', async () => {
    await clearDatabase();

    const db = await getConnection();
    const restantes = await db.getAllAsync('SELECT id FROM migrations');

    assert.deepEqual(restantes, []);
  });

  test('recriarDatabase devolve um banco vazio e migrado', async () => {
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO categorias (id, nome, created_at) VALUES ('c1', 'Some', '2026-01-01')`,
    );

    await recriarDatabase();

    const depois = await getConnection();
    const categorias = await depois.getAllAsync('SELECT id FROM categorias');
    const aplicadas = await depois.getAllAsync('SELECT id FROM migrations');

    assert.deepEqual(categorias, []);
    assert.equal(aplicadas.length, migrations.length);
  });
});
