import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { acumuladoMesAnterior } from './comparativo';

const gasto = (data: string, valor: number): { data: string; valor: number } => ({
  data,
  valor: -valor,
});

describe('acumuladoMesAnterior', () => {
  test('soma o gasto dia a dia, um valor por dia do mes exibido', () => {
    const curva = acumuladoMesAnterior(
      [gasto('2026-09-01', 10), gasto('2026-09-03', 5), gasto('2026-09-03', 15)],
      30,
    );

    assert.equal(curva.length, 30);
    assert.deepEqual(curva.slice(0, 4), [10, 10, 30, 30]);
    assert.equal(curva[29], 30);
  });

  test('entrada nao e gasto', () => {
    const curva = acumuladoMesAnterior(
      [gasto('2026-09-02', 40), { data: '2026-09-02', valor: 500 }],
      30,
    );

    assert.equal(curva[29], 40);
  });

  test('mes anterior mais longo: o dia 31 entra no ultimo dia do mes exibido', () => {
    // Outubro (31 dias) desenhado sobre novembro (30).
    const curva = acumuladoMesAnterior([gasto('2026-10-30', 10), gasto('2026-10-31', 25)], 30);

    assert.equal(curva[28], 0);
    assert.equal(curva[29], 35);
  });

  test('mes anterior mais curto: a curva segue plana ate o fim', () => {
    // Fevereiro (28 dias) desenhado sobre marco (31).
    const curva = acumuladoMesAnterior([gasto('2026-02-28', 80)], 31);

    assert.equal(curva.length, 31);
    assert.deepEqual(curva.slice(26), [0, 80, 80, 80, 80]);
  });

  test('termina sempre no total do mes anterior', () => {
    const transacoes = [
      gasto('2026-10-05', 12.5),
      gasto('2026-10-20', 7.5),
      gasto('2026-10-31', 30),
    ];

    assert.equal(acumuladoMesAnterior(transacoes, 30).at(-1), 50);
  });

  test('sem lancamentos a curva fica no zero', () => {
    assert.deepEqual(acumuladoMesAnterior([], 3), [0, 0, 0]);
  });
});
