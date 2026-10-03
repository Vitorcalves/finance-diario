import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { HistoricoPreco } from '../models/historicoPreco';
import {
  compararMercados,
  type ItemComparavel,
  menorTotalCompleto,
  precoDoItem,
} from './comparativoMercados';

let sequencia = 0;

const registro = (
  empresa: string | null,
  produto: string,
  variante: string,
  preco: number,
  data: string,
): HistoricoPreco => {
  sequencia += 1;

  return {
    id: `h${sequencia}`,
    produto_id: produto,
    variante_id: variante,
    empresa_id: empresa,
    preco,
    data,
    local: 1,
    created_at: `2026-01-01T00:00:${String(sequencia).padStart(2, '0')}`,
  };
};

const item = (
  id: string,
  produtoId: string | null,
  varianteId: string | null,
  quantidade = 1,
): ItemComparavel => ({ id, produtoId, varianteId, quantidade });

describe('precoDoItem', () => {
  test('com variante usa o ultimo preco dela', () => {
    const preco = precoDoItem(item('1', 'arroz', 'tio'), [
      registro('m1', 'arroz', 'tio', 20, '2026-01-01'),
      registro('m1', 'arroz', 'tio', 25, '2026-02-01'),
      registro('m1', 'arroz', 'camil', 10, '2026-02-01'),
    ]);

    assert.deepEqual(preco, { preco: 25, varianteId: 'tio', data: '2026-02-01' });
  });

  test('sem variante usa o menor entre os ultimos precos de cada variante', () => {
    const preco = precoDoItem(item('1', 'arroz', null), [
      registro('m1', 'arroz', 'tio', 25, '2026-02-01'),
      // Ja foi mais barato, mas o preco atual da camil e 22.
      registro('m1', 'arroz', 'camil', 15, '2026-01-01'),
      registro('m1', 'arroz', 'camil', 22, '2026-02-10'),
    ]);

    assert.deepEqual(preco, { preco: 22, varianteId: 'camil', data: '2026-02-10' });
  });

  test('sem registro do produto devolve null', () => {
    assert.equal(precoDoItem(item('1', 'arroz', null), []), null);
  });
});

describe('compararMercados', () => {
  const historico = [
    registro('m1', 'arroz', 'tio', 25, '2026-02-01'),
    registro('m1', 'feijao', 'kicaldo', 8, '2026-02-01'),
    registro('m2', 'arroz', 'tio', 23, '2026-02-01'),
    registro('m2', 'feijao', 'kicaldo', 9, '2026-02-01'),
    registro('m3', 'arroz', 'tio', 20, '2026-02-01'),
    registro('m4', 'cafe', 'pilao', 15, '2026-02-01'),
    registro(null, 'arroz', 'tio', 1, '2026-02-01'),
  ];

  test('soma preco x quantidade e poe os completos primeiro, do mais barato', () => {
    const mercados = compararMercados(
      [item('a', 'arroz', 'tio', 2), item('f', 'feijao', null), item('livre', null, null)],
      historico,
    );

    assert.deepEqual(
      mercados.map((mercado) => [mercado.empresaId, mercado.total, mercado.completo]),
      [
        ['m2', 55, true],
        ['m1', 58, true],
        // Mais barato, mas sem o feijao: fica depois dos completos.
        ['m3', 40, false],
      ],
    );
  });

  test('ignora mercados sem preco de nenhum item e registros sem mercado', () => {
    const mercados = compararMercados([item('a', 'arroz', 'tio')], historico);

    assert.deepEqual(
      mercados.map((mercado) => mercado.empresaId),
      ['m3', 'm2', 'm1'],
    );
  });

  test('o mercado pedido entra mesmo sem historico', () => {
    const mercados = compararMercados([item('a', 'arroz', 'tio')], historico, {
      incluir: ['novo'],
    });

    const novo = mercados.find((mercado) => mercado.empresaId === 'novo');
    assert.equal(novo?.itensComPreco, 0);
    assert.equal(novo?.completo, false);
  });

  test('o preco fixo vale mais que o historico naquele mercado', () => {
    const mercados = compararMercados([item('a', 'arroz', 'tio', 2)], historico, {
      precoFixo: (_item, empresaId) => (empresaId === 'm1' ? 10 : undefined),
    });

    const m1 = mercados.find((mercado) => mercado.empresaId === 'm1');
    assert.equal(m1?.total, 20);
    assert.deepEqual(m1?.precos.get('a'), { preco: 10, varianteId: 'tio', data: null });
  });

  test('sem item comparavel nao ha comparacao', () => {
    assert.deepEqual(compararMercados([item('livre', null, null)], historico), []);
  });
});

describe('menorTotalCompleto', () => {
  test('so elege o mais barato com ao menos dois mercados completos', () => {
    const mercados = compararMercados(
      [item('a', 'arroz', 'tio'), item('f', 'feijao', 'kicaldo')],
      [
        registro('m1', 'arroz', 'tio', 25, '2026-02-01'),
        registro('m1', 'feijao', 'kicaldo', 8, '2026-02-01'),
        registro('m2', 'arroz', 'tio', 23, '2026-02-01'),
      ],
    );

    assert.equal(menorTotalCompleto(mercados), null);
  });
});
