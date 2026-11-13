import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { deleteCategoriaLancamento } from './categoriasLancamento';
import { getConnection } from './database';
import {
  definirCategoriasEmpresa,
  deleteEmpresaById,
  insertEmpresa,
  listCategoriasPorEmpresa,
  listEmpresas,
  updateEmpresa,
} from './empresas';

const criar = (id: string, nome: string, categoriaIds?: string[]): Promise<void> =>
  insertEmpresa({ id, nome, created_at: AGORA }, categoriaIds);

const categoriasDe = async (empresaId: string): Promise<string[] | undefined> =>
  (await listCategoriasPorEmpresa()).get(empresaId);

const totalDeLigacoes = async (): Promise<number> => {
  const db = await getConnection();
  const linha = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM empresas_categorias_lancamento',
  );

  return linha?.total ?? 0;
};

beforeEach(async () => {
  await prepararBanco();
});

describe('listEmpresas', () => {
  test('vem em ordem alfabetica, sem separar acento nem maiuscula', async () => {
    await insertEmpresa({ id: 'z', nome: 'Zaffari', created_at: '2026-01-04T10:00:00.000Z' });
    await insertEmpresa({ id: 'b', nome: 'bahamas', created_at: '2026-01-03T10:00:00.000Z' });
    await insertEmpresa({ id: 'a', nome: 'Água Viva', created_at: '2026-01-02T10:00:00.000Z' });
    await insertEmpresa({ id: 'e', nome: 'Épa', created_at: '2026-01-01T10:00:00.000Z' });

    assert.deepEqual(
      (await listEmpresas()).map((empresa) => empresa.nome),
      ['Água Viva', 'bahamas', 'Épa', 'Zaffari'],
    );
  });
});

describe('categorias de lancamento da empresa', () => {
  test('a empresa nasce com as categorias informadas', async () => {
    await criar('bahamas', 'Bahamas', ['compras', 'mercado']);
    await criar('posto', 'Posto');

    // Na ordem das categorias do app (Mercado vem antes de Compras).
    assert.deepEqual(await categoriasDe('bahamas'), ['mercado', 'compras']);
    assert.equal(await categoriasDe('posto'), undefined);
  });

  test('categoria repetida ou que nao existe nao entra', async () => {
    await criar('bahamas', 'Bahamas', ['mercado', 'mercado', 'nao-existe']);

    assert.deepEqual(await categoriasDe('bahamas'), ['mercado']);
  });

  test('editar com categorias troca a lista inteira', async () => {
    await criar('bahamas', 'Bahamas', ['mercado', 'compras']);

    await updateEmpresa({ id: 'bahamas', nome: 'Bahamas Mix', created_at: AGORA }, ['saude']);

    assert.deepEqual(await categoriasDe('bahamas'), ['saude']);
    assert.equal((await listEmpresas())[0].nome, 'Bahamas Mix');
  });

  test('editar sem informar categorias nao mexe nelas', async () => {
    await criar('bahamas', 'Bahamas', ['mercado']);

    await updateEmpresa({ id: 'bahamas', nome: 'Bahamas Mix', created_at: AGORA });

    assert.deepEqual(await categoriasDe('bahamas'), ['mercado']);
  });

  test('lista vazia tira todas as categorias', async () => {
    await criar('bahamas', 'Bahamas', ['mercado', 'compras']);

    await definirCategoriasEmpresa('bahamas', []);

    assert.equal(await categoriasDe('bahamas'), undefined);
  });

  test('a mesma categoria pode ficar em varias empresas', async () => {
    await criar('bahamas', 'Bahamas', ['mercado']);
    await criar('bh', 'BH', ['mercado']);

    assert.deepEqual(await categoriasDe('bahamas'), ['mercado']);
    assert.deepEqual(await categoriasDe('bh'), ['mercado']);
  });

  test('excluir a empresa leva as ligacoes dela', async () => {
    await criar('bahamas', 'Bahamas', ['mercado', 'compras']);
    await criar('bh', 'BH', ['mercado']);

    await deleteEmpresaById('bahamas');

    assert.equal(await totalDeLigacoes(), 1);
    assert.deepEqual(await categoriasDe('bh'), ['mercado']);
  });

  test('excluir a categoria a tira das empresas, que continuam', async () => {
    await criar('bahamas', 'Bahamas', ['mercado', 'compras']);

    await deleteCategoriaLancamento('compras');

    assert.deepEqual(await categoriasDe('bahamas'), ['mercado']);
    assert.equal((await listEmpresas()).length, 1);
  });
});
