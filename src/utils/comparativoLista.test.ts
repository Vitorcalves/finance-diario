import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { compararLista, type PrecoAnotado } from './comparativoLista';

const preco = (itemId: string, empresaId: string, valor: number): PrecoAnotado => ({
  itemId,
  empresaId,
  preco: valor,
});

const itens = [
  { id: 'arroz', quantidade: 2 },
  { id: 'feijao', quantidade: 1 },
  { id: 'cafe', quantidade: 1 },
];

describe('compararLista', () => {
  test('soma preco x quantidade do que tem preco em cada mercado', () => {
    const { mercados } = compararLista(
      itens,
      ['m1', 'm2'],
      [preco('arroz', 'm1', 20), preco('feijao', 'm1', 8), preco('arroz', 'm2', 22)],
    );

    assert.deepEqual(
      mercados.map((mercado) => [mercado.empresaId, mercado.total, mercado.itensComPreco]),
      [
        ['m1', 48, 2],
        ['m2', 44, 1],
      ],
    );
  });

  test('o mais barato sai dos itens com preco em todos os mercados', () => {
    // m2 parece mais barato no total (44 x 48), mas so tem o arroz anotado.
    const comparativo = compararLista(
      itens,
      ['m1', 'm2'],
      [preco('arroz', 'm1', 20), preco('feijao', 'm1', 8), preco('arroz', 'm2', 22)],
    );

    assert.equal(comparativo.itensEmComum, 1);
    assert.deepEqual(
      comparativo.mercados.map((mercado) => [mercado.empresaId, mercado.maisBarato]),
      [
        ['m1', true],
        ['m2', false],
      ],
    );
    assert.deepEqual(comparativo.vantagem, { empresaId: 'm1', sobre: 'm2', valor: 4 });
  });

  test('com um mercado so nao ha comparacao', () => {
    const comparativo = compararLista(itens, ['m1'], [preco('arroz', 'm1', 20)]);

    assert.equal(comparativo.itensEmComum, 0);
    assert.equal(comparativo.mercados[0].maisBarato, false);
    assert.equal(comparativo.vantagem, null);
  });

  test('empate de todos nao destaca ninguem', () => {
    const comparativo = compararLista(
      itens,
      ['m1', 'm2'],
      [preco('arroz', 'm1', 20), preco('arroz', 'm2', 20)],
    );

    assert.ok(comparativo.mercados.every((mercado) => !mercado.maisBarato));
    assert.equal(comparativo.vantagem, null);
  });

  test('aponta o menor preco de cada item e onde ele esta', () => {
    const { menorPorItem } = compararLista(
      itens,
      ['m1', 'm2', 'm3'],
      [preco('cafe', 'm1', 15), preco('cafe', 'm2', 12), preco('cafe', 'm3', 12)],
    );

    assert.deepEqual(menorPorItem.get('cafe'), { preco: 12, mercados: ['m2', 'm3'], cotacoes: 3 });
    assert.equal(menorPorItem.has('arroz'), false);
  });

  test('mostra quanto sai dividindo a compra quando compensa', () => {
    const comparativo = compararLista(
      itens,
      ['m1', 'm2'],
      [
        preco('arroz', 'm1', 20),
        preco('feijao', 'm1', 10),
        preco('arroz', 'm2', 22),
        preco('feijao', 'm2', 7),
      ],
    );

    // m1: 2x20 + 10 = 50; m2: 2x22 + 7 = 51; dividindo: 2x20 + 7 = 47.
    assert.equal(comparativo.mercados[0].maisBarato, true);
    assert.deepEqual(comparativo.dividindo, { total: 47, economia: 3, mercados: 2 });
  });

  test('ignora precos de mercados ou itens que sairam da lista', () => {
    const { mercados, menorPorItem } = compararLista(
      [{ id: 'arroz', quantidade: 1 }],
      ['m1'],
      [preco('arroz', 'm1', 20), preco('arroz', 'antigo', 5), preco('removido', 'm1', 3)],
    );

    assert.equal(mercados[0].total, 20);
    assert.deepEqual(menorPorItem.get('arroz')?.mercados, ['m1']);
    assert.equal(menorPorItem.has('removido'), false);
  });
});
