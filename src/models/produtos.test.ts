import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { getProdutoById, insertProduto, listProdutos, updateProduto } from './produtos';

const criarProduto = async (id: string, nome: string, eventual?: number): Promise<void> => {
  await insertProduto({ id, nome, preco: 1, unidade_id: null, eventual, created_at: AGORA });
};

beforeEach(async () => {
  await prepararBanco();
});

describe('listProdutos', () => {
  test('ordena pelo nome ignorando acento e maiusculas', async () => {
    await criarProduto('p1', 'feijao');
    await criarProduto('p2', 'Zebu');
    await criarProduto('p3', 'Água');
    await criarProduto('p4', 'Arroz');

    const produtos = await listProdutos();

    assert.deepEqual(
      produtos.map((produto) => produto.nome),
      ['Água', 'Arroz', 'feijao', 'Zebu'],
    );
  });
});

describe('eventual', () => {
  test('produto novo nasce frequente quando nada e informado', async () => {
    await criarProduto('p1', 'Arroz');

    assert.equal((await getProdutoById('p1'))?.eventual, 0);
  });

  test('grava e atualiza a marcacao de compra eventual', async () => {
    await criarProduto('p1', 'Mouse', 1);
    assert.equal((await getProdutoById('p1'))?.eventual, 1);

    const produto = await getProdutoById('p1');
    assert.ok(produto);
    await updateProduto({ ...produto, eventual: 0 });

    assert.equal((await getProdutoById('p1'))?.eventual, 0);
  });
});
