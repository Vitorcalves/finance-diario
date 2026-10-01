import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { projetarMes, type TransacaoDoMes } from './projecaoMes';

const corrente = {
  hoje: '2026-01-10',
  situacao: 'corrente' as const,
  diasDecorridos: 10,
  diasNoMes: 31,
};

describe('projetarMes', () => {
  test('separa o realizado do que ainda vai vencer', () => {
    const transacoes: TransacaoDoMes[] = [
      { valor: -100, data: '2026-01-05' },
      { valor: 500, data: '2026-01-06' },
      { valor: -40, data: '2026-01-20', plano_id: 'plano' },
    ];

    const resultado = projetarMes(transacoes, corrente);

    assert.equal(resultado.gastoRealizado, 100);
    assert.equal(resultado.entradaRealizada, 500);
    assert.equal(resultado.comprometido, 40);
  });

  test('no mes corrente projeta realizado + comprometido + media avulsa dos dias restantes', () => {
    const transacoes: TransacaoDoMes[] = [
      { valor: -100, data: '2026-01-05' },
      { valor: -40, data: '2026-01-20', plano_id: 'plano' },
    ];

    const resultado = projetarMes(transacoes, corrente);

    assert.equal(resultado.mediaDiariaVariavel, 10);
    assert.equal(resultado.projecao, 100 + 40 + 10 * 21);
  });

  test('parcela ja paga fica fora da media, para nao entrar duas vezes na projecao', () => {
    const transacoes: TransacaoDoMes[] = [
      { valor: -100, data: '2026-01-05' },
      { valor: -50, data: '2026-01-02', plano_id: 'plano' },
    ];

    const resultado = projetarMes(transacoes, corrente);

    assert.equal(resultado.mediaDiaria, 15);
    assert.equal(resultado.mediaDiariaVariavel, 10);
  });

  test('mes passado projeta exatamente o que foi gasto', () => {
    const resultado = projetarMes([{ valor: -300, data: '2025-12-10' }], {
      hoje: '2026-01-10',
      situacao: 'passado',
      diasDecorridos: 31,
      diasNoMes: 31,
    });

    assert.equal(resultado.projecao, 300);
  });

  test('mes futuro projeta so o que ja esta comprometido', () => {
    const resultado = projetarMes([{ valor: -80, data: '2026-02-10', plano_id: 'plano' }], {
      hoje: '2026-01-10',
      situacao: 'futuro',
      diasDecorridos: 0,
      diasNoMes: 28,
    });

    assert.equal(resultado.projecao, 80);
    assert.equal(resultado.mediaDiaria, 0);
  });
});
