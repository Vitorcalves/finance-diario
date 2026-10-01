import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import {
  analisarBackup,
  BACKUP_FORMATO,
  BACKUP_VERSAO,
  BackupInvalidoError,
  exportarBanco,
  importarBanco,
  resumirBackup,
  type BackupJson,
} from './backup';
import { getConnection } from './database';
import { insertCategoria } from './categorias';
import { insertEmpresa } from './empresas';
import { insertMarca, listMarcas } from './marcas';
import { migrations } from './migrations';
import { Unidades } from '../utils/unidades';

/** Versao do schema = id da ultima migration, para o teste nao quebrar a cada migration nova. */
const SCHEMA_VERSION = migrations[migrations.length - 1].id;

/** Dados variados de proposito: REAL, NULL, texto com acento e FK. */
const semear = async (): Promise<void> => {
  const db = await getConnection();

  await insertMarca({ nome: 'Marca A', created_at: '2026-01-01T00:00:00.000Z' });
  await insertMarca({ nome: 'Marca B', created_at: '2026-01-02T00:00:00.000Z' });
  await insertCategoria({ id: 'c1', nome: 'Mercado', created_at: '2026-01-01T00:00:00.000Z' });
  // `cnpj` omitido de proposito: o insert grava NULL e o backup precisa manter.
  await insertEmpresa({
    id: 'e1',
    nome: 'Loja',
    observacao: 'observação com acento e "aspas"',
    created_at: '2026-01-01T00:00:00.000Z',
  });

  await db.runAsync(
    `INSERT INTO produtos (id, nome, preco, unidade_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    ['p1', 'Arroz', 24.995, 2, '2026-01-01T00:00:00.000Z'],
  );
  await db.runAsync(
    `INSERT INTO transacoes (id, descricao, valor, contabilizado_saldo, data, empresa_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['t1', 'Compra', -123.45, 1, '2026-01-05', 'e1', '2026-01-05T10:00:00.000Z'],
  );
};

const backupBase = (over: Partial<BackupJson> = {}): string =>
  JSON.stringify({
    formato: BACKUP_FORMATO,
    versao: BACKUP_VERSAO,
    schema_version: SCHEMA_VERSION,
    exportado_em: '2026-01-01T00:00:00.000Z',
    tabelas: {},
    ...over,
  });

beforeEach(async () => {
  await prepararBanco();
});

describe('exportarBanco', () => {
  test('exporta o schema recem-migrado com as unidades semeadas', async () => {
    const backup = await exportarBanco();

    assert.equal(backup.formato, BACKUP_FORMATO);
    assert.equal(backup.versao, BACKUP_VERSAO);
    assert.equal(backup.schema_version, SCHEMA_VERSION);
    assert.equal(backup.tabelas.unidades.length, Unidades.listar().length);
    assert.equal(backup.tabelas.transacoes.length, 0);
  });

  test('nao inclui tabelas internas', async () => {
    const backup = await exportarBanco();

    assert.ok(!('migrations' in backup.tabelas));
    assert.ok(!('sqlite_sequence' in backup.tabelas));
    assert.ok(!Object.keys(backup.tabelas).some((nome) => nome.startsWith('sqlite_')));
  });

  test('descobre as tabelas pelo schema, sem lista fixa em codigo', async () => {
    const db = await getConnection();
    await db.execAsync('CREATE TABLE tabela_nova (id TEXT PRIMARY KEY NOT NULL)');
    await db.runAsync('INSERT INTO tabela_nova (id) VALUES (?)', ['a']);

    const backup = await exportarBanco();
    assert.equal(backup.tabelas.tabela_nova.length, 1);
  });

  test('resumirBackup conta os registros por tabela, em ordem alfabetica', async () => {
    await semear();
    const resumo = resumirBackup(await exportarBanco());
    const nomes = resumo.map((item) => item.tabela);

    assert.deepEqual(nomes, [...nomes].sort());
    assert.equal(resumo.find((item) => item.tabela === 'marcas')?.registros, 2);
  });
});

describe('round-trip', () => {
  test('reimportar o proprio export nao muda nada', async () => {
    await semear();
    const original = await exportarBanco();

    await importarBanco(analisarBackup(JSON.stringify(original)));
    const depois = await exportarBanco();

    assert.deepEqual(depois.tabelas, original.tabelas);
  });

  test('preserva REAL, NULL e acentos', async () => {
    await semear();
    const original = await exportarBanco();
    await importarBanco(analisarBackup(JSON.stringify(original)));
    const depois = await exportarBanco();

    assert.equal(depois.tabelas.produtos[0].preco, 24.995);
    assert.equal(depois.tabelas.transacoes[0].valor, -123.45);
    assert.equal(depois.tabelas.empresas[0].cnpj, null);
    assert.equal(depois.tabelas.empresas[0].observacao, 'observação com acento e "aspas"');
  });

  test('AUTOINCREMENT nao reaproveita id ja usado', async () => {
    await semear();
    const original = await exportarBanco();
    await importarBanco(analisarBackup(JSON.stringify(original)));

    await insertMarca({ nome: 'Marca C', created_at: '2026-01-03T00:00:00.000Z' });
    const marcas = await listMarcas();

    assert.deepEqual(
      marcas.map((marca) => marca.id).sort((a, b) => a - b),
      [1, 2, 3],
    );
  });

  test('as foreign keys voltam ligadas depois do import', async () => {
    await semear();
    await importarBanco(analisarBackup(JSON.stringify(await exportarBanco())));

    const db = await getConnection();
    const pragma = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    const violacoes = await db.getAllAsync('PRAGMA foreign_key_check');

    assert.equal(pragma?.foreign_keys, 1);
    assert.deepEqual(violacoes, []);
  });
});

describe('importarBanco sobrescreve', () => {
  test('apaga o que nao esta no JSON', async () => {
    await semear();

    const backup = analisarBackup(
      backupBase({
        tabelas: {
          marcas: [{ id: 99, nome: 'Unica', created_at: '2026-01-01T00:00:00.000Z' }],
        },
      }),
    );
    await importarBanco(backup);
    const depois = await exportarBanco();

    assert.deepEqual(depois.tabelas.marcas, [
      { id: 99, nome: 'Unica', created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    assert.equal(depois.tabelas.transacoes.length, 0);
    assert.equal(depois.tabelas.empresas.length, 0);
    // Ate as unidades semeadas pela migration somem: o JSON e a fonte da verdade.
    assert.equal(depois.tabelas.unidades.length, 0);
  });

  test('devolve o resumo do que foi gravado', async () => {
    const resumo = await importarBanco(
      analisarBackup(
        backupBase({
          tabelas: {
            marcas: [{ id: 1, nome: 'A', created_at: 'x' }],
            categorias: [],
          },
        }),
      ),
    );

    assert.deepEqual(resumo, [
      { tabela: 'categorias', registros: 0 },
      { tabela: 'marcas', registros: 1 },
    ]);
  });

  test('aceita linhas com conjuntos de colunas diferentes', async () => {
    await importarBanco(
      analisarBackup(
        backupBase({
          tabelas: {
            empresas: [
              { id: 'a', nome: 'Com cnpj', cnpj: '123', observacao: null, created_at: 'x' },
              { id: 'b', nome: 'Sem cnpj', created_at: 'x' },
            ],
          },
        }),
      ),
    );

    const depois = await exportarBanco();
    assert.equal(depois.tabelas.empresas.length, 2);
    assert.equal(depois.tabelas.empresas.find((linha) => linha.id === 'b')?.cnpj, null);
  });

  test('nao mexe no schema nem nas migrations aplicadas', async () => {
    await importarBanco(analisarBackup(backupBase({ tabelas: {} })));

    const db = await getConnection();
    const migracoes = await db.getAllAsync<{ id: number }>('SELECT id FROM migrations');
    assert.equal(migracoes.length, migrations.length);
    assert.equal((await exportarBanco()).schema_version, SCHEMA_VERSION);
  });
});

describe('analisarBackup recusa JSON invalido', () => {
  const recusa = (nome: string, texto: string, trecho: RegExp): void => {
    test(nome, () => {
      assert.throws(
        () => analisarBackup(texto),
        (error: unknown) => {
          assert.ok(error instanceof BackupInvalidoError, 'esperava BackupInvalidoError');
          assert.match(error.message, trecho);
          return true;
        },
      );
    });
  };

  recusa('texto vazio', '   ', /Cole o JSON/);
  recusa('JSON quebrado', '{ "formato": ', /JSON invalido/);
  recusa('lista no lugar de objeto', '[]', /objeto/);
  recusa('formato de outro app', backupBase({ formato: 'outro' }), /não é um backup/);
  recusa('versao nao suportada', backupBase({ versao: 99 }), /Versão de backup/);
  recusa(
    'schema_version ausente',
    JSON.stringify({ formato: BACKUP_FORMATO, versao: BACKUP_VERSAO, tabelas: {} }),
    /schema_version/,
  );
  recusa(
    'tabelas ausente',
    JSON.stringify({ formato: BACKUP_FORMATO, versao: BACKUP_VERSAO, schema_version: 1 }),
    /tabelas/,
  );
  recusa(
    'tabela que nao e lista',
    backupBase({ tabelas: { marcas: {} } as never }),
    /precisa ser uma lista/,
  );
  recusa(
    'registro que nao e objeto',
    backupBase({ tabelas: { marcas: ['texto'] } as never }),
    /Registro 1 da tabela "marcas"/,
  );
});

describe('importarBanco recusa antes de escrever', () => {
  test('backup de app mais novo', async () => {
    await assert.rejects(
      importarBanco(analisarBackup(backupBase({ schema_version: 99 }))),
      /versao mais nova do app/,
    );
  });

  test('tabela que nao existe neste banco', async () => {
    await assert.rejects(
      importarBanco(analisarBackup(backupBase({ tabelas: { nao_existe: [] } }))),
      /Tabelas que não existem/,
    );
  });

  test('coluna que nao existe na tabela', async () => {
    await assert.rejects(
      importarBanco(analisarBackup(backupBase({ tabelas: { marcas: [{ id: 1, cor: 'azul' }] } }))),
      /Colunas inexistentes em "marcas": cor/,
    );
  });

  test('valor de tipo nao suportado', async () => {
    await assert.rejects(
      importarBanco(
        analisarBackup(backupBase({ tabelas: { marcas: [{ id: 1, nome: { a: 1 } }] } as never })),
      ),
      /Valor não suportado/,
    );
  });

  test('o banco continua intacto quando o backup e recusado', async () => {
    await semear();
    const antes = await exportarBanco();

    await assert.rejects(importarBanco(analisarBackup(backupBase({ schema_version: 99 }))));

    assert.deepEqual((await exportarBanco()).tabelas, antes.tabelas);
  });
});

describe('falha no meio da carga', () => {
  test('a transacao volta atras e nada e perdido', async () => {
    await semear();
    const antes = await exportarBanco();

    // Duas linhas com a mesma PK: a segunda estoura depois do DELETE ja ter rodado.
    const comViolacao = analisarBackup(
      backupBase({
        tabelas: {
          marcas: [
            { id: 1, nome: 'A', created_at: 'x' },
            { id: 1, nome: 'Duplicada', created_at: 'x' },
          ],
        },
      }),
    );

    await assert.rejects(importarBanco(comViolacao), /UNIQUE constraint failed/);
    assert.deepEqual((await exportarBanco()).tabelas, antes.tabelas);
  });
});
