import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { faturaDaCompra, proximosCiclos } from './cartao';

describe('faturaDaCompra', () => {
  test('compra ate o dia de fechamento cai na fatura do mes', () => {
    // Fecha dia 30, vence dia 10 do mes seguinte (regra tipica BR).
    assert.deepEqual(faturaDaCompra('2026-03-30', 30, 10), {
      mesRef: '2026-03',
      dataFechamento: '2026-03-30',
      dataVencimento: '2026-04-10',
    });
  });

  test('compra depois do fechamento cai na fatura do mes seguinte', () => {
    assert.deepEqual(faturaDaCompra('2026-03-31', 30, 10), {
      mesRef: '2026-04',
      dataFechamento: '2026-04-30',
      dataVencimento: '2026-05-10',
    });
  });

  test('compra no proprio dia de fechamento fecha neste mes', () => {
    assert.equal(faturaDaCompra('2026-03-30', 30, 10).mesRef, '2026-03');
    // Um dia depois ja e ciclo novo.
    assert.equal(faturaDaCompra('2026-03-31', 30, 10).mesRef, '2026-04');
  });

  test('vencimento depois do fechamento fica no mesmo mes', () => {
    // Fecha dia 10, vence dia 20: o vencimento e posterior ao fechamento.
    assert.deepEqual(faturaDaCompra('2026-03-10', 10, 20), {
      mesRef: '2026-03',
      dataFechamento: '2026-03-10',
      dataVencimento: '2026-03-20',
    });
  });

  test('virada de ano: compra de dezembro depois do fechamento vai para janeiro', () => {
    assert.deepEqual(faturaDaCompra('2026-12-15', 5, 12), {
      mesRef: '2027-01',
      dataFechamento: '2027-01-05',
      dataVencimento: '2027-01-12',
    });
  });

  test('clamp: fechamento dia 31 em abril vira dia 30', () => {
    const ciclo = faturaDaCompra('2026-04-30', 31, 15);
    assert.equal(ciclo.dataFechamento, '2026-04-30');
    assert.equal(ciclo.dataVencimento, '2026-05-15');
  });

  test('clamp: vencimento dia 31 em mes de 30 dias', () => {
    // Fecha dia 31, vence dia 31 (vencimento no mes seguinte): setembro tem
    // 30 dias, entao o vencimento de agosto cai em 30/09.
    const ciclo = faturaDaCompra('2026-08-15', 31, 31);
    assert.equal(ciclo.dataFechamento, '2026-08-31');
    assert.equal(ciclo.dataVencimento, '2026-09-30');

    // Mesma regra com vencimento no proprio mes (31 > 30): novembro tem 30.
    const cicloNovembro = faturaDaCompra('2026-11-30', 30, 31);
    assert.equal(cicloNovembro.dataVencimento, '2026-11-30');
  });

  test('fevereiro: fechamento dia 30 vira dia 28 em ano nao bissexto', () => {
    const ciclo = faturaDaCompra('2026-02-28', 30, 10);
    assert.equal(ciclo.dataFechamento, '2026-02-28');
    assert.equal(ciclo.dataVencimento, '2026-03-10');
  });
});

describe('proximosCiclos', () => {
  test('lista os N ciclos a partir do ciclo da data', () => {
    assert.deepEqual(proximosCiclos('2026-03-15', 30, 10, 3), [
      {
        mesRef: '2026-03',
        dataFechamento: '2026-03-30',
        dataVencimento: '2026-04-10',
      },
      {
        mesRef: '2026-04',
        dataFechamento: '2026-04-30',
        dataVencimento: '2026-05-10',
      },
      {
        mesRef: '2026-05',
        dataFechamento: '2026-05-30',
        dataVencimento: '2026-06-10',
      },
    ]);
  });

  test('quantidade zero devolve lista vazia', () => {
    assert.deepEqual(proximosCiclos('2026-03-15', 30, 10, 0), []);
  });

  test('ciclos consecutivos nao se repetem nem pulam mes', () => {
    const ciclos = proximosCiclos('2026-10-30', 30, 10, 15);
    assert.equal(ciclos.length, 15);
    assert.equal(new Set(ciclos.map((ciclo) => ciclo.mesRef)).size, 15);

    const meses = ciclos.map((ciclo) => ciclo.mesRef);
    assert.deepEqual(meses, [
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
      '2027-10',
      '2027-11',
      '2027-12',
    ]);
  });
});
