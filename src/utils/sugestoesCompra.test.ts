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

  test('compra maior que a de costume dura proporcionalmente mais', () => {
    // 3 unidades a cada 15 dias = 0,2 por dia; 15 unidades duram 75 dias.
    const [sabonete] = sugerirCompras(
      [
        compra('sabonete', '2026-01-01', 3),
        compra('sabonete', '2026-01-16', 3),
        compra('sabonete', '2026-01-31', 15),
      ],
      hoje,
    );

    assert.equal(sabonete.intervaloDias, 15);
    assert.equal(sabonete.duracaoDias, 75);
    assert.equal(sabonete.diasDesdeUltima, 59);
    assert.equal(sabonete.naHora, false);
    // A quantidade sugerida continua sendo a de costume, nao a da compra grande.
    assert.equal(sabonete.quantidade, 3);
  });

  test('compra grande fica na hora perto do fim da duracao esperada', () => {
    const compras = [
      compra('sabonete', '2026-01-01', 3),
      compra('sabonete', '2026-01-16', 3),
      compra('sabonete', '2026-01-31', 15),
    ];

    // 80% de 75 dias = 60 dias depois de 31/01.
    assert.equal(sugerirCompras(compras, '2026-03-31')[0].naHora, false);
    assert.equal(sugerirCompras(compras, '2026-04-01')[0].naHora, true);
  });

  test('compra menor que a de costume volta mais cedo', () => {
    const [sabonete] = sugerirCompras(
      [
        compra('sabonete', '2026-02-20', 3),
        compra('sabonete', '2026-03-07', 3),
        compra('sabonete', '2026-03-22', 1),
      ],
      hoje,
    );

    assert.equal(sabonete.duracaoDias, 5);
    assert.equal(sabonete.naHora, true);
  });

  test('compra grande nao sai da rotina antes de 3 vezes a duracao dela', () => {
    const compras = [
      compra('sabao', '2025-06-01', 1),
      compra('sabao', '2025-06-11', 1),
      compra('sabao', '2025-06-21', 20),
    ];

    // 0,1 por dia: 20 unidades duram 200 dias; ha 283 dias ainda e sugerido.
    const [sabao] = sugerirCompras(compras, hoje);

    assert.equal(sabao.duracaoDias, 200);
    assert.equal(sabao.naHora, true);
  });

  describe('tamanho da variante', () => {
    const KG = 2;
    const UN = 7;
    const tamanhos: Record<string, { quantidade: number; unidadeId: number }> = {
      '1kg': { quantidade: 1, unidadeId: KG },
      '5kg': { quantidade: 5, unidadeId: KG },
      duzia: { quantidade: 12, unidadeId: UN },
    };
    const tamanho = (varianteId: string | null): { quantidade: number; unidadeId: number } | null =>
      (varianteId && tamanhos[varianteId]) || null;

    test('1 pacote de 5 kg dura 5 vezes mais que 1 de 1 kg', () => {
      const compras = [
        compra('arroz', '2026-01-01', 1, '1kg'),
        compra('arroz', '2026-01-11', 1, '1kg'),
        compra('arroz', '2026-01-21', 1, '5kg'),
      ];

      assert.equal(sugerirCompras(compras, hoje, { tamanho })[0].duracaoDias, 50);
      // Sem a medida, as tres compras valem o mesmo.
      assert.equal(sugerirCompras(compras, hoje)[0].duracaoDias, 10);
    });

    test('pacote grande no historico aumenta o consumo de costume', () => {
      // 5 kg em 20 dias = 0,25 kg por dia; 1 kg dura 4 dias.
      const [arroz] = sugerirCompras(
        [compra('arroz', '2026-03-01', 1, '5kg'), compra('arroz', '2026-03-21', 1, '1kg')],
        hoje,
        { tamanho },
      );

      assert.equal(arroz.duracaoDias, 4);
      assert.equal(arroz.naHora, true);
    });

    test('compra sem medida faz o produto voltar a contar em unidades', () => {
      const [arroz] = sugerirCompras(
        [
          compra('arroz', '2026-01-01', 1, '1kg'),
          compra('arroz', '2026-01-11', 1, null),
          compra('arroz', '2026-01-21', 1, '5kg'),
        ],
        hoje,
        { tamanho },
      );

      assert.equal(arroz.duracaoDias, 10);
    });

    test('unidades de grupos diferentes nao se somam', () => {
      const [ovo] = sugerirCompras(
        [
          compra('ovo', '2026-01-01', 1, 'duzia'),
          compra('ovo', '2026-01-11', 1, '1kg'),
          compra('ovo', '2026-01-21', 1, 'duzia'),
        ],
        hoje,
        { tamanho },
      );

      assert.equal(ovo.duracaoDias, 10);
    });
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
