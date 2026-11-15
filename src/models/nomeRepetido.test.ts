import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { deleteCategoriaById, insertCategoria, listCategorias } from './categorias';
import { getConnection } from './database';
import {
  deleteEmpresaById,
  insertEmpresa,
  listCategoriasPorEmpresa,
  listEmpresas,
  updateEmpresa,
} from './empresas';
import { deleteMarcaById, insertMarca, listMarcas, type Marca, updateMarca } from './marcas';
import { chaveDoNome, exigirNomeLivre, NomeRepetidoError } from './nomeRepetido';

const criarMarca = (nome: string): Promise<void> => insertMarca({ nome, created_at: AGORA });

const criarEmpresa = (id: string, nome: string, categoriaIds?: string[]): Promise<void> =>
  insertEmpresa({ id, nome, created_at: AGORA }, categoriaIds);

const criarCategoria = (id: string, nome: string): Promise<void> =>
  insertCategoria({ id, nome, created_at: AGORA });

const marcaDeNome = async (nome: string): Promise<Marca> => {
  const marca = (await listMarcas()).find((atual) => atual.nome === nome);

  assert.ok(marca, `marca "${nome}" nao encontrada`);
  return marca;
};

const nomes = (registros: { nome: string }[]): string[] =>
  registros.map((registro) => registro.nome).sort();

beforeEach(async () => {
  await prepararBanco();
});

describe('chaveDoNome', () => {
  test('ignora maiusculas, acentos e espacos sobrando', () => {
    assert.equal(chaveDoNome('  TIO   João '), 'tio joao');
    assert.equal(chaveDoNome('Tio Joao'), chaveDoNome('tio  joão'));
    assert.notEqual(chaveDoNome('Camil'), chaveDoNome('Camila'));
  });
});

describe('exigirNomeLivre', () => {
  const ativos = [
    { id: 1, nome: 'Camil' },
    { id: 2, nome: 'Tio João' },
  ];

  test('aceita nome novo e recusa o que ja existe, citando o cadastrado', () => {
    assert.doesNotThrow(() => exigirNomeLivre(ativos, 'Prato Fino', 'marca'));
    assert.throws(
      () => exigirNomeLivre(ativos, 'tio joao', 'marca'),
      (error: unknown) =>
        error instanceof NomeRepetidoError && error.message === 'Já existe a marca "Tio João".',
    );
  });

  test('quem esta em edicao nao e repetido de si mesmo', () => {
    assert.doesNotThrow(() => exigirNomeLivre(ativos, 'CAMIL', 'marca', 1));
    assert.throws(() => exigirNomeLivre(ativos, 'Camil', 'marca', 2), NomeRepetidoError);
  });

  test('editar sem trocar o nome passa mesmo com um repetido antigo', () => {
    const comRepetido = [...ativos, { id: 3, nome: 'camil' }];

    assert.doesNotThrow(() => exigirNomeLivre(comRepetido, 'Camil', 'marca', 1));
    assert.throws(() => exigirNomeLivre(comRepetido, 'Camil', 'marca'), NomeRepetidoError);
    assert.throws(() => exigirNomeLivre(comRepetido, 'Camil', 'marca', 2), NomeRepetidoError);
  });
});

describe('marcas', () => {
  test('recusa nome repetido, sem diferenciar maiusculas, acentos nem espacos', async () => {
    await criarMarca('Tio João');

    await assert.rejects(criarMarca('Tio João'), NomeRepetidoError);
    await assert.rejects(criarMarca('TIO JOAO'), /Já existe a marca "Tio João"\./);
    await assert.rejects(criarMarca(' tio   joão '), NomeRepetidoError);

    assert.deepEqual(nomes(await listMarcas()), ['Tio João']);
  });

  test('o nome de uma marca excluida pode ser usado de novo', async () => {
    await criarMarca('Camil');
    await deleteMarcaById((await marcaDeNome('Camil')).id);

    await criarMarca('camil');

    assert.deepEqual(nomes(await listMarcas()), ['camil']);
    assert.deepEqual(nomes(await listMarcas({ comExcluidos: true })), ['Camil', 'camil']);
  });

  test('editar aceita o proprio nome e recusa o de outra marca', async () => {
    await criarMarca('Camil');
    await criarMarca('Tio João');
    const camil = await marcaDeNome('Camil');

    await updateMarca({ ...camil, nome: 'CAMIL' });
    await assert.rejects(updateMarca({ ...camil, nome: 'tio joao' }), NomeRepetidoError);

    assert.deepEqual(nomes(await listMarcas()), ['CAMIL', 'Tio João']);
  });
});

describe('categorias de produto', () => {
  test('recusa nome repetido', async () => {
    await criarCategoria('limpeza', 'Limpeza');

    await assert.rejects(criarCategoria('outra', 'LIMPEZA'), /Já existe a categoria "Limpeza"\./);

    assert.deepEqual(nomes(await listCategorias()), ['Limpeza']);
  });

  test('o nome de uma categoria excluida pode ser usado de novo', async () => {
    await criarCategoria('limpeza', 'Limpeza');
    await deleteCategoriaById('limpeza');

    await criarCategoria('nova', 'Limpeza');

    assert.deepEqual(
      (await listCategorias()).map((categoria) => categoria.id),
      ['nova'],
    );
  });
});

describe('empresas', () => {
  test('recusa nome repetido e nao grava nada da empresa recusada', async () => {
    await criarEmpresa('bahamas', 'Bahamas', ['mercado']);

    await assert.rejects(
      criarEmpresa('outra', 'bahámas', ['compras']),
      /Já existe a empresa "Bahamas"\./,
    );

    assert.deepEqual(
      (await listEmpresas()).map((empresa) => empresa.id),
      ['bahamas'],
    );
    assert.equal((await listCategoriasPorEmpresa()).get('outra'), undefined);
  });

  test('o nome de uma empresa excluida pode ser usado de novo', async () => {
    await criarEmpresa('bahamas', 'Bahamas');
    await deleteEmpresaById('bahamas');

    await criarEmpresa('nova', 'Bahamas');

    assert.deepEqual(
      (await listEmpresas()).map((empresa) => empresa.id),
      ['nova'],
    );
  });

  test('editar recusa o nome de outra empresa e nao troca as categorias', async () => {
    await criarEmpresa('bahamas', 'Bahamas', ['mercado']);
    await criarEmpresa('bh', 'BH');

    await assert.rejects(
      updateEmpresa({ id: 'bahamas', nome: 'bh', created_at: AGORA }, ['compras']),
      NomeRepetidoError,
    );

    assert.deepEqual(nomes(await listEmpresas()), ['BH', 'Bahamas']);
    assert.deepEqual((await listCategoriasPorEmpresa()).get('bahamas'), ['mercado']);
  });

  test('editar sem trocar o nome continua valendo', async () => {
    await criarEmpresa('bahamas', 'Bahamas');

    await updateEmpresa({ id: 'bahamas', nome: 'Bahamas', cnpj: '123', created_at: AGORA }, [
      'mercado',
    ]);

    const [empresa] = await listEmpresas();
    assert.equal(empresa.cnpj, '123');
    assert.deepEqual((await listCategoriasPorEmpresa()).get('bahamas'), ['mercado']);
  });

  test('repetidas de antes da regra ainda podem ser editadas, mas nao ganham uma terceira', async () => {
    const db = await getConnection();

    // Direto no banco, como ficou em quem cadastrou duas iguais antes da regra.
    for (const id of ['a', 'b']) {
      await db.runAsync('INSERT INTO empresas (id, nome, created_at) VALUES (?, ?, ?)', [
        id,
        'Bahamas',
        AGORA,
      ]);
    }

    await updateEmpresa({ id: 'a', nome: 'Bahamas', cnpj: '123', created_at: AGORA });
    await assert.rejects(criarEmpresa('c', 'Bahamas'), NomeRepetidoError);

    // Renomear uma delas desfaz a repeticao.
    await updateEmpresa({ id: 'b', nome: 'Bahamas Centro', created_at: AGORA });

    assert.deepEqual(nomes(await listEmpresas()), ['Bahamas', 'Bahamas Centro']);
  });
});
