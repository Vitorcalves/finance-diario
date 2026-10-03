import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { intervaloDoPeriodo, rotuloIntervalo } from './periodos';

describe('intervaloDoPeriodo', () => {
  const hoje = '2026-03-15';

  test('este mes vai do dia 1 ao ultimo dia, incluindo o que ainda vai vencer', () => {
    assert.deepEqual(intervaloDoPeriodo('mes', hoje), { inicio: '2026-03-01', fim: '2026-03-31' });
  });

  test('mes passado cobre o mes anterior inteiro', () => {
    assert.deepEqual(intervaloDoPeriodo('mesPassado', hoje), {
      inicio: '2026-02-01',
      fim: '2026-02-28',
    });
  });

  test('mes passado em janeiro volta para dezembro do ano anterior', () => {
    assert.deepEqual(intervaloDoPeriodo('mesPassado', '2026-01-10'), {
      inicio: '2025-12-01',
      fim: '2025-12-31',
    });
  });

  test('ultimos 90 dias contam hoje como o 90o dia', () => {
    assert.deepEqual(intervaloDoPeriodo('ultimos90', hoje), {
      inicio: '2025-12-16',
      fim: '2026-03-15',
    });
  });

  test('este ano vai de 1o de janeiro a 31 de dezembro', () => {
    assert.deepEqual(intervaloDoPeriodo('ano', hoje), { inicio: '2026-01-01', fim: '2026-12-31' });
  });

  test('todo o periodo nao tem limites', () => {
    assert.deepEqual(intervaloDoPeriodo('tudo', hoje), { inicio: null, fim: null });
  });

  test('personalizado devolve as datas escolhidas', () => {
    const escolhido = { inicio: '2025-05-01', fim: '2025-05-20' };
    assert.deepEqual(intervaloDoPeriodo('personalizado', hoje, escolhido), escolhido);
  });
});

describe('rotuloIntervalo', () => {
  test('um mes inteiro aparece pelo nome', () => {
    assert.equal(rotuloIntervalo({ inicio: '2026-09-01', fim: '2026-09-30' }), 'Setembro de 2026');
    assert.equal(rotuloIntervalo({ inicio: '2028-02-01', fim: '2028-02-29' }), 'Fevereiro de 2028');
  });

  test('os demais intervalos usam datas curtas', () => {
    assert.equal(
      rotuloIntervalo({ inicio: '2026-09-01', fim: '2026-09-15' }),
      '01/09/26 a 15/09/26',
    );
    assert.equal(rotuloIntervalo({ inicio: '2026-09-01', fim: null }), 'Desde 01/09/26');
    assert.equal(rotuloIntervalo({ inicio: null, fim: '2026-09-15' }), 'Até 15/09/26');
    assert.equal(rotuloIntervalo({ inicio: null, fim: null }), 'Todo o período');
  });
});
