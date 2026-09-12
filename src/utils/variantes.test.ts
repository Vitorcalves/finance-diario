import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Marca } from '../models/marcas';
import type { ProdutoVariantes } from '../models/produtoVariantes';
import {
  ehGranel,
  precoPorUnidadePrimaria,
  rotuloQuantidade,
  rotuloVariante,
  rotuloVariantePorId,
} from './variantes';

const MARCAS: Marca[] = [
  { id: 1, nome: 'Marca A', created_at: '2026-01-01' },
  { id: 2, nome: 'Marca B', created_at: '2026-01-01' },
];

const variante = (over: Partial<ProdutoVariantes> = {}): ProdutoVariantes => ({
  id: 'v1',
  produto_id: 'p1',
  marca_id: 1,
  unidade_id: 2,
  quantidade: 1,
  codigo_barras: null,
  preco: 10,
  created_at: '2026-01-01',
  ...over,
});

describe('rotuloVariante', () => {
  test('junta marca e medida', () => {
    assert.equal(
      rotuloVariante(variante({ unidade_id: 4, quantidade: 500 }), MARCAS),
      'Marca A • 500 Gramas',
    );
  });

  test('sem marca cadastrada', () => {
    assert.equal(rotuloVariante(variante({ marca_id: null }), MARCAS), 'Sem marca • 1 Quilogramas');
  });

  test('marca que nao existe mais cai no texto neutro', () => {
    assert.equal(rotuloVariante(variante({ marca_id: 99 }), MARCAS), 'Sem marca • 1 Quilogramas');
  });

  test('sem quantidade mostra so a marca', () => {
    assert.equal(rotuloVariante(variante({ quantidade: null }), MARCAS), 'Marca A');
  });

  test('quantidade sem unidade valida mostra so o numero', () => {
    assert.equal(rotuloVariante(variante({ unidade_id: 999 }), MARCAS), 'Marca A • 1');
  });

  test('unidade a granel mostra a medida em que o preco e cobrado', () => {
    assert.equal(rotuloVariante(variante({ unidade_id: 8 }), MARCAS), 'Marca A • por kg');
    assert.equal(
      rotuloVariante(variante({ unidade_id: 8, quantidade: null }), MARCAS),
      'Marca A • por kg',
    );
    assert.equal(
      rotuloVariante(variante({ unidade_id: 9, quantidade: 2 }), MARCAS),
      'Marca A • por 2 L',
    );
  });
});

describe('ehGranel', () => {
  test('depende da unidade da variante', () => {
    assert.equal(ehGranel(variante()), false);
    assert.equal(ehGranel(variante({ unidade_id: 8 })), true);
    assert.equal(ehGranel(variante({ unidade_id: 10, quantidade: null })), true);
    assert.equal(ehGranel(undefined), false);
  });
});

describe('rotuloQuantidade', () => {
  test('pacote mostra so o numero', () => {
    assert.equal(rotuloQuantidade(2, variante()), '2');
    assert.equal(rotuloQuantidade(2, undefined), '2');
  });

  test('a granel mostra o peso com a medida', () => {
    assert.equal(rotuloQuantidade(0.75, variante({ unidade_id: 8 })), '0,75 kg');
    assert.equal(rotuloQuantidade(0.75, variante({ unidade_id: 8, quantidade: null })), '0,75 kg');
  });

  test('a granel com preco por medida diferente de 1 mostra o multiplicador', () => {
    assert.equal(rotuloQuantidade(2.5, variante({ unidade_id: 9, quantidade: 2 })), '2,5 x 2 L');
  });
});

describe('rotuloVariantePorId', () => {
  test('acha pelo id', () => {
    assert.equal(rotuloVariantePorId('v1', [variante()], MARCAS), 'Marca A • 1 Quilogramas');
  });

  test('variante removida devolve texto neutro', () => {
    assert.equal(rotuloVariantePorId('sumiu', [variante()], MARCAS), 'Variante removida');
  });
});

describe('precoPorUnidadePrimaria', () => {
  test('500 g por R$ 5,00 custa R$ 10,00 por kg', () => {
    assert.deepEqual(precoPorUnidadePrimaria(5, variante({ unidade_id: 4, quantidade: 500 })), {
      valor: 10,
      unidadeId: 2,
      sigla: 'kg',
    });
  });

  test('embalagem grande sai mais barata por kg', () => {
    const cincoKg = precoPorUnidadePrimaria(24.99, variante({ unidade_id: 2, quantidade: 5 }));
    const meioKg = precoPorUnidadePrimaria(5, variante({ unidade_id: 4, quantidade: 500 }));

    assert.ok(cincoKg && meioKg);
    // O pacote caro no total e o barato por unidade: e o caso que a tela precisa acertar.
    assert.ok(cincoKg.valor < meioKg.valor);
    assert.equal(Number(cincoKg.valor.toFixed(4)), 4.998);
  });

  test('mililitros viram litros', () => {
    const preco = precoPorUnidadePrimaria(3.5, variante({ unidade_id: 6, quantidade: 350 }));
    assert.equal(preco?.sigla, 'L');
    assert.equal(Number(preco?.valor.toFixed(6)), 10);
  });

  test('unidade avulsa divide pelo numero de itens', () => {
    const preco = precoPorUnidadePrimaria(10, variante({ unidade_id: 7, quantidade: 12 }));
    assert.equal(preco?.sigla, 'un');
    assert.equal(Number(preco?.valor.toFixed(4)), 0.8333);
  });

  test('unidade ja primaria passa direto', () => {
    assert.deepEqual(precoPorUnidadePrimaria(9, variante({ unidade_id: 3, quantidade: 2 })), {
      valor: 4.5,
      unidadeId: 3,
      sigla: 'L',
    });
  });

  test('sem medida nao da para calcular', () => {
    assert.equal(precoPorUnidadePrimaria(5, variante({ quantidade: null })), null);
    assert.equal(precoPorUnidadePrimaria(5, variante({ unidade_id: null })), null);
    assert.equal(precoPorUnidadePrimaria(5, undefined), null);
  });

  test('a granel sem quantidade vale 1 da medida: R$ 8,90 por kg', () => {
    assert.deepEqual(precoPorUnidadePrimaria(8.9, variante({ unidade_id: 8, quantidade: null })), {
      valor: 8.9,
      unidadeId: 2,
      sigla: 'kg',
    });
    assert.deepEqual(precoPorUnidadePrimaria(10, variante({ unidade_id: 9, quantidade: 2 })), {
      valor: 5,
      unidadeId: 3,
      sigla: 'L',
    });
  });

  test('quantidade zero ou negativa nao divide', () => {
    assert.equal(precoPorUnidadePrimaria(5, variante({ quantidade: 0 })), null);
    assert.equal(precoPorUnidadePrimaria(5, variante({ quantidade: -2 })), null);
  });

  test('unidade fora da tabela nao quebra', () => {
    assert.equal(precoPorUnidadePrimaria(5, variante({ unidade_id: 999 })), null);
  });

  test('preco zero e valido', () => {
    assert.equal(precoPorUnidadePrimaria(0, variante({ quantidade: 2 }))?.valor, 0);
  });
});
