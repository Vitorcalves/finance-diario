import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import type { HistoricoPreco } from '../models/historicoPreco';
import {
  type ItemDaPesquisa,
  type PrecoDaPesquisa,
  selecionarPrecosParaHistorico,
  varianteParaHistorico,
} from './precosParaHistorico';

/** Meio-dia local: o dia nao muda com o fuso de quem roda o teste. */
const ANOTADO = dayjs('2026-10-03T12:00:00').toISOString();

const item = (id: string, produto: string | null, variante: string | null): ItemDaPesquisa => ({
  id,
  produto_id: produto,
  variante_id: variante,
});

const preco = (itemId: string, empresaId: string, valor: number): PrecoDaPesquisa => ({
  item_id: itemId,
  empresa_id: empresaId,
  preco: valor,
  updated_at: ANOTADO,
});

const registro = (
  variante: string,
  empresa: string,
  valor: number,
  data: string,
): HistoricoPreco => ({
  id: `${variante}-${empresa}-${data}`,
  produto_id: 'p',
  variante_id: variante,
  empresa_id: empresa,
  preco: valor,
  data,
  local: 1,
  created_at: data,
});

const variantes = new Map([
  ['arroz', ['tio', 'camil']],
  ['feijao', ['kicaldo']],
]);

describe('varianteParaHistorico', () => {
  test('usa a variante escolhida no item', () => {
    assert.equal(varianteParaHistorico(item('1', 'arroz', 'camil'), variantes), 'camil');
  });

  test('sem marca escolhida, usa a unica variante do produto', () => {
    assert.equal(varianteParaHistorico(item('1', 'feijao', null), variantes), 'kicaldo');
  });

  test('com mais de uma variante possivel, nao adivinha', () => {
    assert.equal(varianteParaHistorico(item('1', 'arroz', null), variantes), null);
  });
});

describe('selecionarPrecosParaHistorico', () => {
  test('leva o preco de cada mercado, com a data em que foi anotado', () => {
    const { registros, semMarca } = selecionarPrecosParaHistorico(
      [item('a', 'arroz', 'tio')],
      [preco('a', 'm1', 20), preco('a', 'm2', 22)],
      [],
      variantes,
    );

    assert.equal(semMarca, 0);
    assert.deepEqual(registros, [
      {
        produtoId: 'arroz',
        varianteId: 'tio',
        empresaId: 'm1',
        preco: 20,
        data: '2026-10-03T12:00:00',
      },
      {
        produtoId: 'arroz',
        varianteId: 'tio',
        empresaId: 'm2',
        preco: 22,
        data: '2026-10-03T12:00:00',
      },
    ]);
  });

  test('o mesmo preco no mesmo dia ja registrado nao entra de novo', () => {
    const { registros } = selecionarPrecosParaHistorico(
      [item('a', 'arroz', 'tio')],
      [preco('a', 'm1', 20), preco('a', 'm2', 22)],
      [
        registro('tio', 'm1', 20, '2026-10-03T09:30:00'),
        registro('tio', 'm2', 21, '2026-10-03T09:30:00'),
      ],
      variantes,
    );

    // m2 mudou de preco no mesmo dia: o novo preco entra.
    assert.deepEqual(
      registros.map((atual) => [atual.empresaId, atual.preco]),
      [['m2', 22]],
    );
  });

  test('conta os itens sem marca definida e ignora os textos livres', () => {
    const { registros, semMarca } = selecionarPrecosParaHistorico(
      [item('a', 'arroz', null), item('f', 'feijao', null), item('papel', null, null)],
      [preco('a', 'm1', 20), preco('a', 'm2', 21), preco('f', 'm1', 8), preco('papel', 'm1', 6)],
      [],
      variantes,
    );

    assert.deepEqual(
      registros.map((atual) => atual.varianteId),
      ['kicaldo'],
    );
    assert.equal(semMarca, 2);
  });

  test('a variante anotada no preco vale mais que a do item', () => {
    const { registros, semMarca } = selecionarPrecosParaHistorico(
      [item('a', 'arroz', null), item('b', 'arroz', 'tio')],
      [
        { ...preco('a', 'm1', 20), variante_id: 'camil' },
        { ...preco('a', 'm2', 21), variante_id: null },
        { ...preco('b', 'm1', 25), variante_id: 'camil' },
      ],
      [],
      variantes,
    );

    // 'a' em m2 nao tem marca no preco nem no item (arroz tem duas variantes).
    assert.deepEqual(
      registros.map((atual) => [atual.empresaId, atual.varianteId, atual.preco]),
      [
        ['m1', 'camil', 20],
        ['m1', 'camil', 25],
      ],
    );
    assert.equal(semMarca, 1);
  });

  test('pula o que foi pedido para ignorar (o carrinho, gravado pelo lancamento)', () => {
    const { registros } = selecionarPrecosParaHistorico(
      [item('a', 'arroz', 'tio')],
      [preco('a', 'm1', 20), preco('a', 'm2', 22)],
      [],
      variantes,
      (_itemId, empresaId) => empresaId === 'm1',
    );

    assert.deepEqual(
      registros.map((atual) => atual.empresaId),
      ['m2'],
    );
  });
});
