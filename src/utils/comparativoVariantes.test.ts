import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparVariantesPorProduto, type ComUnitario } from './comparativoVariantes';

type Item = { id: string; produtoId: string };

const LITRO = 10;
const QUILO = 20;

const entrada = (
  id: string,
  produtoId: string,
  unitario: { valor: number; unidadeId: number } | null,
): ComUnitario<Item> => ({
  item: { id, produtoId },
  unitario: unitario ? { ...unitario, sigla: unitario.unidadeId === LITRO ? 'L' : 'kg' } : null,
});

const agrupar = (
  entradas: ComUnitario<Item>[],
): ReturnType<typeof agruparVariantesPorProduto<Item>> =>
  agruparVariantesPorProduto(entradas, (item) => item.produtoId);

describe('agruparVariantesPorProduto', () => {
  test('aponta a embalagem mais barata por unidade, mesmo custando mais na prateleira', () => {
    // Leite de 500 ml a R$ 5,00 (R$ 10/L) x leite de 1 L a R$ 12,00 (R$ 12/L).
    const [leite] = agrupar([
      entrada('500ml', 'leite', { valor: 10, unidadeId: LITRO }),
      entrada('1l', 'leite', { valor: 12, unidadeId: LITRO }),
    ]);

    assert.equal(leite.comparavel, true);
    assert.deepEqual(
      leite.itens.map((atual) => [atual.item.id, atual.maisBarato]),
      [
        ['500ml', true],
        ['1l', false],
      ],
    );
  });

  test('produto com uma embalagem so nao entra na comparacao', () => {
    assert.deepEqual(
      agrupar([
        entrada('leite', 'leite', { valor: 10, unidadeId: LITRO }),
        entrada('arroz', 'arroz', { valor: 5, unidadeId: QUILO }),
      ]),
      [],
    );
  });

  test('sem medida em alguma embalagem, o grupo aparece mas nao elege a mais barata', () => {
    const [grupo] = agrupar([
      entrada('a', 'leite', { valor: 10, unidadeId: LITRO }),
      entrada('b', 'leite', null),
    ]);

    assert.equal(grupo.comparavel, false);
    assert.ok(grupo.itens.every((atual) => !atual.maisBarato));
  });

  test('unidades de grupos diferentes nao se comparam', () => {
    const [grupo] = agrupar([
      entrada('a', 'cafe', { valor: 30, unidadeId: QUILO }),
      entrada('b', 'cafe', { valor: 2, unidadeId: LITRO }),
    ]);

    assert.equal(grupo.comparavel, false);
  });
});
