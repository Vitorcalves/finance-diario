import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { desfazerUltimaMigration, prepararBanco } from '../../tests/setup/banco';
import { __novoBanco } from '../../tests/setup/expo-sqlite';
import {
  type AtualizacaoDoBanco,
  clearDatabase,
  getConnection,
  initializeDatabase,
  recriarDatabase,
} from './database';
import { migrations } from './migrations';

const ULTIMA = migrations[migrations.length - 1].id;
const PENULTIMA = migrations[migrations.length - 2].id;

const versaoDoBanco = async (): Promise<number | undefined> => {
  const db = await getConnection();
  const linha = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM migrations ORDER BY id DESC LIMIT 1',
  );

  return linha?.id;
};

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
      'categorias_lancamento',
      'empresas',
      'historico_preco',
      'itens_transacao',
      'lista_compras_itens',
      'lista_compras_mercados',
      'lista_compras_precos',
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

describe('antesDeMigrar', () => {
  type Chamada = { atualizacao: AtualizacaoDoBanco; versaoNoMomento: number | undefined };

  /** Registra cada chamada e a versao em que o banco estava naquele momento. */
  const espiao = (): {
    chamadas: Chamada[];
    antesDeMigrar: (atualizacao: AtualizacaoDoBanco) => Promise<void>;
  } => {
    const chamadas: Chamada[] = [];

    return {
      chamadas,
      antesDeMigrar: async (atualizacao): Promise<void> => {
        chamadas.push({ atualizacao, versaoNoMomento: await versaoDoBanco() });
      },
    };
  };

  test('roda antes da migration pendente, com a versao de agora e a de depois', async () => {
    await desfazerUltimaMigration();
    const { chamadas, antesDeMigrar } = espiao();

    await initializeDatabase({ antesDeMigrar });

    assert.deepEqual(chamadas, [
      { atualizacao: { versaoAtual: PENULTIMA, versaoNova: ULTIMA }, versaoNoMomento: PENULTIMA },
    ]);
    assert.equal(await versaoDoBanco(), ULTIMA);
  });

  test('banco em dia nao chama', async () => {
    const { chamadas, antesDeMigrar } = espiao();

    await initializeDatabase({ antesDeMigrar });

    assert.deepEqual(chamadas, []);
  });

  test('banco novo nao chama: nao ha dados para guardar', async () => {
    __novoBanco();
    const { chamadas, antesDeMigrar } = espiao();

    await initializeDatabase({ antesDeMigrar });

    assert.deepEqual(chamadas, []);
    assert.equal(await versaoDoBanco(), ULTIMA);
  });

  test('se falhar, nenhuma migration e aplicada', async () => {
    await desfazerUltimaMigration();

    await assert.rejects(
      initializeDatabase({
        antesDeMigrar: async () => {
          throw new Error('sem espaco');
        },
      }),
      /sem espaco/,
    );

    assert.equal(await versaoDoBanco(), PENULTIMA);
  });
});

describe('unidades semeadas', () => {
  test('as unidades usadas pelo app existem no banco', async () => {
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
      { id: 8, descricao: 'Quilo (granel)' },
      { id: 9, descricao: 'Litro (granel)' },
      { id: 10, descricao: 'Metro (granel)' },
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

  test('o apagar tudo funciona mesmo com referencia orfa no banco', async () => {
    // O import de backup roda com as FKs desligadas e pode deixar uma
    // referencia orfa. Os down que recriam tabela nao repoem FKs justamente
    // para a copia das linhas nao falhar aqui.
    const db = await getConnection();
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.runAsync(
      `INSERT INTO transacoes (id, descricao, valor, data, categoria_id, created_at)
       VALUES ('t1', 'Mercado', -10, '2026-01-10', 'categoria-que-sumiu', 'x')`,
    );
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await recriarDatabase();

    const depois = await getConnection();
    const transacoes = await depois.getAllAsync('SELECT id FROM transacoes');
    const aplicadas = await depois.getAllAsync('SELECT id FROM migrations');

    assert.deepEqual(transacoes, []);
    assert.equal(aplicadas.length, migrations.length);
  });
});
