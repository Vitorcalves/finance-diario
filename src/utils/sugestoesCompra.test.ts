import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompraDeProduto } from '../models/listaCompras';
import { sugerirCompras } from './sugestoesCompra';

const compra = (
  produto: string,
  data: string,
  quantidade = 1,
  variante: string | null = null,
): CompraDeProduto => ({ produto_id: produto, variante_id: variante, quantidade, data });

describe('sugerirCompras', () => {
  const hoje = '2026-03-31';

  test('produto comprado uma vez so ainda nao vira sugestao', () => {
    assert.deepEqual(sugerirCompras([compra('arroz', '2026-03-01')], hoje), []);
  });

  test('calcula o intervalo medio e marca como na hora quando ja passou do ritmo', () => {
    const [arroz] = sugerirCompras(
      [compra('arroz', '2026-02-01'), compra('arroz', '2026-02-15'), compra('arroz', '2026-03-01')],
      hoje,
    );

    assert.equal(arroz.produtoId, 'arroz');
    assert.equal(arroz.vezes, 3);
    assert.equal(arroz.intervaloDias, 14);
    assert.equal(arroz.diasDesdeUltima, 30);
    assert.equal(arroz.naHora, true);
  });

  test('comprado ha pouco tempo aparece, mas nao esta na hora', () => {
    const [leite] = sugerirCompras(
      [compra('leite', '2026-03-01'), compra('leite', '2026-03-29')],
      hoje,
    );

    assert.equal(leite.intervaloDias, 28);
    assert.equal(leite.naHora, false);
  });

  test('compras no mesmo dia contam uma vez e somam a quantidade', () => {
    const [cafe] = sugerirCompras(
      [
        compra('cafe', '2026-03-01', 1),
        compra('cafe', '2026-03-01', 1),
        compra('cafe', '2026-03-15', 2),
      ],
      hoje,
    );

    assert.equal(cafe.vezes, 2);
    assert.equal(cafe.quantidade, 2);
  });

  test('sugere a variante da ultima compra e a quantidade mais comum', () => {
    const [feijao] = sugerirCompras(
      [
        compra('feijao', '2026-01-10', 2, 'v1'),
        compra('feijao', '2026-02-10', 2, 'v1'),
        compra('feijao', '2026-03-10', 1, 'v2'),
      ],
      hoje,
    );

    assert.equal(feijao.varianteId, 'v2');
    assert.equal(feijao.quantidade, 2);
  });

  test('produto que saiu da rotina deixa de ser sugerido', () => {
    const sugestoes = sugerirCompras(
      [compra('panetone', '2025-11-01'), compra('panetone', '2025-12-01')],
      hoje,
    );

    assert.deepEqual(sugestoes, []);
  });

  test('ignora os produtos pedidos e respeita o limite', () => {
    const compras = ['a', 'b', 'c'].flatMap((produto) => [
      compra(produto, '2026-03-01'),
      compra(produto, '2026-03-10'),
    ]);

    const sugestoes = sugerirCompras(compras, hoje, { ignorar: new Set(['b']), limite: 1 });

    assert.equal(sugestoes.length, 1);
    assert.notEqual(sugestoes[0].produtoId, 'b');
  });

  test('os que estao na hora vem primeiro, do mais atrasado para o menos', () => {
    const sugestoes = sugerirCompras(
      [
        // Recente: nao esta na hora.
        compra('leite', '2026-03-20'),
        compra('leite', '2026-03-30'),
        // Compra a cada 18 dias e esta ha 20 sem comprar: o mais atrasado.
        compra('arroz', '2026-02-21'),
        compra('arroz', '2026-03-11'),
        // Compra a cada 10 dias e esta ha 10: bem na hora.
        compra('cafe', '2026-03-11'),
        compra('cafe', '2026-03-21'),
      ],
      hoje,
    );

    assert.deepEqual(
      sugestoes.map((sugestao) => sugestao.produtoId),
      ['arroz', 'cafe', 'leite'],
    );
  });
});
