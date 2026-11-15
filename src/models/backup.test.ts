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
  type LinhaBackup,
} from './backup';
import { getConnection } from './database';
import { insertCategoria } from './categorias';
import { CONTA_CAIXA_PADRAO, saldoDaConta } from './contas';
import { insertEmpresa } from './empresas';
import { registrarLancamento } from './lancamentos';
import { insertMarca, listMarcas } from './marcas';
import { migrations } from './migrations';
import { Locais } from '../utils/local';
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

    // O `deleted_at`, que o JSON nao trazia, fica com o padrao da coluna: ativa.
    assert.deepEqual(depois.tabelas.marcas, [
      { id: 99, nome: 'Unica', created_at: '2026-01-01T00:00:00.000Z', deleted_at: null },
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

  test('backup de antes das contas recria o caixa padrao com o historico dentro', async () => {
    await importarBanco(
      analisarBackup(
        backupBase({
          schema_version: 11,
          tabelas: {
            transacoes: [
              {
                id: 't1',
                descricao: 'Salário',
                valor: 1000,
                data: '2026-01-05',
                contabilizado_saldo: 1,
                created_at: '2026-01-05T10:00:00.000Z',
              },
              {
                id: 't2',
                descricao: 'Mercado',
                valor: -200,
                data: '2026-01-06',
                contabilizado_saldo: 1,
                created_at: '2026-01-06T10:00:00.000Z',
              },
            ],
          },
        }),
      ),
    );

    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO), 800);

    // Sem a conta, a FK de `transacoes.conta_id` recusaria qualquer lancamento novo.
    await registrarLancamento(
      {
        descricao: 'Padaria',
        data: '2026-01-07',
        empresaId: null,
        categoriaId: null,
        valor: -50,
        itens: [],
      },
      Locais.padrao,
    );
    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO), 750);
  });

  test('backup de antes da natureza tem a natureza deduzida e o caixa padrao reativado', async () => {
    const conta = (id: string, tipo: string, ativo: number): LinhaBackup => ({
      id,
      nome: id,
      tipo,
      dia_fechamento: tipo === 'cartao' ? 30 : null,
      dia_vencimento: tipo === 'cartao' ? 10 : null,
      saldo_inicial: 0,
      ativo,
      ordem: 0,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    const linha = (id: string, valor: number, extra: LinhaBackup): LinhaBackup => ({
      id,
      descricao: id,
      valor,
      data: '2026-03-15',
      created_at: '2026-03-15T10:00:00.000Z',
      ...extra,
    });

    await importarBanco(
      analisarBackup(
        backupBase({
          schema_version: 14,
          tabelas: {
            // O caixa padrao chega inativo, como a tela de Contas deixava.
            contas: [
              conta(CONTA_CAIXA_PADRAO, 'caixa', 0),
              conta('visa', 'cartao', 1),
              conta('reserva', 'reserva', 1),
            ],
            faturas: [
              {
                id: 'f1',
                conta_id: 'visa',
                mes_ref: '2026-03',
                data_fechamento: '2026-03-30',
                data_vencimento: '2026-04-10',
                paga: 0,
                created_at: '2026-03-15T10:00:00.000Z',
              },
            ],
            transacoes: [
              linha('salario', 1000, { conta_id: CONTA_CAIXA_PADRAO, contabilizado_saldo: 1 }),
              linha('livraria', -80, { conta_id: 'visa', fatura_id: 'f1', contabilizado_saldo: 0 }),
              linha('aporte', -300, {
                conta_id: CONTA_CAIXA_PADRAO,
                conta_destino_id: 'reserva',
                contabilizado_saldo: 1,
              }),
            ],
          },
        }),
      ),
    );

    const db = await getConnection();
    const naturezas = await db.getAllAsync<{ id: string; natureza: string }>(
      'SELECT id, natureza FROM transacoes ORDER BY id',
    );
    assert.deepEqual(naturezas, [
      { id: 'aporte', natureza: 'transferencia' },
      { id: 'livraria', natureza: 'compra_cartao' },
      { id: 'salario', natureza: 'movimento' },
    ]);

    const caixa = await db.getFirstAsync<{ ativo: number }>(
      'SELECT ativo FROM contas WHERE id = ?',
      [CONTA_CAIXA_PADRAO],
    );
    assert.equal(caixa?.ativo, 1);
    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO), 700);
    assert.equal(await saldoDaConta('visa'), -80);
  });

  test('backup de antes das cotacoes ganha id e a marca herdada do item', async () => {
    const CRIADO = '2026-01-01T00:00:00.000Z';
    const itemDaLista = (id: string, varianteId: string | null): LinhaBackup => ({
      id,
      produto_id: 'arroz',
      variante_id: varianteId,
      descricao: 'Arroz',
      quantidade: 1,
      comprado: 0,
      ordem: 1,
      created_at: CRIADO,
    });

    await importarBanco(
      analisarBackup(
        backupBase({
          schema_version: 15,
          tabelas: {
            empresas: [{ id: 'm1', nome: 'Mercado', created_at: CRIADO }],
            produtos: [
              { id: 'arroz', nome: 'Arroz', preco: 0, unidade_id: null, created_at: CRIADO },
            ],
            produto_variantes: [
              {
                id: 'tio',
                produto_id: 'arroz',
                marca_id: null,
                unidade_id: null,
                quantidade: null,
                codigo_barras: null,
                preco: 20,
                created_at: CRIADO,
              },
            ],
            lista_compras_itens: [itemDaLista('com-marca', 'tio'), itemDaLista('qualquer', null)],
            // Formato da 015: sem `id`, um preco por item e mercado.
            lista_compras_precos: [
              { item_id: 'com-marca', empresa_id: 'm1', preco: 20, updated_at: CRIADO },
              {
                item_id: 'qualquer',
                empresa_id: 'm1',
                preco: 21,
                updated_at: CRIADO,
                variante_id: null,
              },
            ],
          },
        }),
      ),
    );

    const db = await getConnection();
    const cotacoes = await db.getAllAsync<{ id: string; item_id: string; variante_id: string }>(
      'SELECT id, item_id, variante_id FROM lista_compras_precos ORDER BY item_id',
    );
    assert.deepEqual(
      cotacoes.map((atual) => [atual.item_id, atual.variante_id]),
      [
        ['com-marca', 'tio'],
        ['qualquer', null],
      ],
    );
    assert.ok(cotacoes.every((atual) => /^[0-9a-f]{32}$/.test(atual.id)));
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
