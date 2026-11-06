import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import type { HistoricoPreco } from '../models/historicoPreco';
import {
  type ItemDaPesquisa,
  type PrecoDaPesquisa,
  selecionarPrecosParaHistorico,
  varianteDaCotacao,
} from './precosParaHistorico';

/** Meio-dia local: o dia nao muda com o fuso de quem roda o teste. */
const ANOTADO = dayjs('2026-10-03T12:00:00').toISOString();

const item = (id: string, produto: string | null): ItemDaPesquisa => ({
  id,
  produto_id: produto,
});

const cotacao = (
  id: string,
  itemId: string,
  empresaId: string,
  valor: number,
  variante: string | null = null,
): PrecoDaPesquisa => ({
  id,
  item_id: itemId,
  empresa_id: empresaId,
  preco: valor,
  variante_id: variante,
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

describe('varianteDaCotacao', () => {
  test('usa a variante anotada na cotacao', () => {
    assert.equal(
      varianteDaCotacao({ variante_id: 'camil' }, item('1', 'arroz'), variantes),
      'camil',
    );
  });

  test('sem marca anotada, usa a unica variante do produto', () => {
    assert.equal(
      varianteDaCotacao({ variante_id: null }, item('1', 'feijao'), variantes),
      'kicaldo',
    );
  });

  test('com mais de uma variante possivel, nao adivinha', () => {
    assert.equal(varianteDaCotacao({ variante_id: null }, item('1', 'arroz'), variantes), null);
  });
});

describe('selecionarPrecosParaHistorico', () => {
  test('leva cada cotacao, de cada mercado, com a data em que foi anotada', () => {
    const { registros, semMarca } = selecionarPrecosParaHistorico(
      [item('a', 'arroz')],
      [
        cotacao('c1', 'a', 'm1', 20, 'tio'),
        cotacao('c2', 'a', 'm1', 23, 'camil'),
        cotacao('c3', 'a', 'm2', 22, 'tio'),
      ],
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
        varianteId: 'camil',
        empresaId: 'm1',
        preco: 23,
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
      [item('a', 'arroz')],
      [cotacao('c1', 'a', 'm1', 20, 'tio'), cotacao('c2', 'a', 'm2', 22, 'tio')],
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
      [item('a', 'arroz'), item('f', 'feijao'), item('papel', null)],
      [
        cotacao('c1', 'a', 'm1', 20),
        cotacao('c2', 'a', 'm2', 21),
        cotacao('c3', 'f', 'm1', 8),
        cotacao('c4', 'papel', 'm1', 6),
      ],
      [],
      variantes,
    );

    assert.deepEqual(
      registros.map((atual) => atual.varianteId),
      ['kicaldo'],
    );
    assert.equal(semMarca, 2);
  });

  test('pula so a cotacao pedida (a comprada, que vai com o lancamento)', () => {
    const { registros } = selecionarPrecosParaHistorico(
      [item('a', 'arroz')],
      [
        cotacao('c1', 'a', 'm1', 20, 'tio'),
        cotacao('c2', 'a', 'm1', 23, 'camil'),
        cotacao('c3', 'a', 'm2', 22, 'tio'),
      ],
      [],
      variantes,
      (atual) => atual.id === 'c1',
    );

    // A outra marca cotada no mercado da compra continua indo para o historico.
    assert.deepEqual(
      registros.map((atual) => [atual.empresaId, atual.varianteId]),
      [
        ['m1', 'camil'],
        ['m2', 'tio'],
      ],
    );
  });
});
