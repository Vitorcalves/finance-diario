import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  custoMensalEquivalente,
  dataDaOcorrencia,
  dividirEmParcelas,
  ocorrenciasAte,
  parcelasDaCompra,
  proximaOcorrencia,
  rotuloParcela,
} from './parcelas';

describe('dividirEmParcelas', () => {
  test('devolve o resto nas primeiras parcelas', () => {
    assert.deepEqual(dividirEmParcelas(100, 3), [33.34, 33.33, 33.33]);
  });

  test('a soma das parcelas fecha com o total', () => {
    for (const total of [100, 0.03, 19.99, 1234.56, 0.01, 999.97]) {
      for (const parcelas of [2, 3, 6, 7, 12]) {
        const soma = dividirEmParcelas(total, parcelas).reduce((a, b) => a + b, 0);
        assert.equal(
          Math.round(soma * 100),
          Math.round(total * 100),
          `${total} em ${parcelas}x nao fechou`,
        );
      }
    }
  });

  test('divide exato quando nao ha resto', () => {
    assert.deepEqual(dividirEmParcelas(90, 3), [30, 30, 30]);
  });

  test('total menor que o numero de parcelas deixa parcelas zeradas', () => {
    assert.deepEqual(dividirEmParcelas(0.02, 3), [0.01, 0.01, 0]);
  });

  test('preserva o sinal de valores negativos', () => {
    const parcelas = dividirEmParcelas(-100, 3);
    assert.deepEqual(parcelas, [-33.34, -33.33, -33.33]);
    assert.equal(Math.round(parcelas.reduce((a, b) => a + b, 0) * 100), -10000);
  });

  test('uma parcela e o total inteiro', () => {
    assert.deepEqual(dividirEmParcelas(19.99, 1), [19.99]);
  });

  test('zero ou menos parcelas devolve lista vazia', () => {
    assert.deepEqual(dividirEmParcelas(100, 0), []);
    assert.deepEqual(dividirEmParcelas(100, -3), []);
  });

  test('total zero devolve parcelas zeradas', () => {
    assert.deepEqual(dividirEmParcelas(0, 3), [0, 0, 0]);
  });
});

describe('dataDaOcorrencia', () => {
  test('a parcela 1 cai na propria data de inicio', () => {
    assert.equal(dataDaOcorrencia('2026-01-15', 'mensal', 1, 1), '2026-01-15');
  });

  test('conta sempre a partir do inicio, entao o dia 31 volta', () => {
    // Somando sobre a data anterior, 31/01 viraria 28/02 e ficaria preso no 28.
    assert.equal(dataDaOcorrencia('2026-01-31', 'mensal', 1, 2), '2026-02-28');
    assert.equal(dataDaOcorrencia('2026-01-31', 'mensal', 1, 3), '2026-03-31');
    assert.equal(dataDaOcorrencia('2026-01-31', 'mensal', 1, 4), '2026-04-30');
    assert.equal(dataDaOcorrencia('2026-01-31', 'mensal', 1, 5), '2026-05-31');
  });

  test('29 de fevereiro em ano bissexto', () => {
    assert.equal(dataDaOcorrencia('2024-02-29', 'anual', 1, 2), '2025-02-28');
    assert.equal(dataDaOcorrencia('2024-02-29', 'anual', 1, 5), '2028-02-29');
  });

  test('frequencia semanal e anual', () => {
    assert.equal(dataDaOcorrencia('2026-01-01', 'semanal', 1, 3), '2026-01-15');
    assert.equal(dataDaOcorrencia('2026-01-01', 'anual', 1, 3), '2028-01-01');
  });

  test('intervalo maior pula periodos', () => {
    assert.equal(dataDaOcorrencia('2026-01-01', 'mensal', 3, 2), '2026-04-01');
    assert.equal(dataDaOcorrencia('2026-01-01', 'semanal', 2, 3), '2026-01-29');
  });

  test('intervalo zero ou negativo e tratado como 1', () => {
    assert.equal(dataDaOcorrencia('2026-01-01', 'mensal', 0, 3), '2026-03-01');
    assert.equal(dataDaOcorrencia('2026-01-01', 'mensal', -5, 3), '2026-03-01');
  });
});

describe('ocorrenciasAte', () => {
  const base = { dataInicio: '2026-01-10', frequencia: 'mensal', intervalo: 1 } as const;

  test('inclui a ocorrencia que cai exatamente no limite', () => {
    const ocorrencias = ocorrenciasAte({ ...base, ateData: '2026-03-10' });
    assert.deepEqual(
      ocorrencias.map((o) => o.data),
      ['2026-01-10', '2026-02-10', '2026-03-10'],
    );
  });

  test('para um dia antes da proxima', () => {
    const ocorrencias = ocorrenciasAte({ ...base, ateData: '2026-03-09' });
    assert.equal(ocorrencias.length, 2);
  });

  test('respeita o total de parcelas', () => {
    const ocorrencias = ocorrenciasAte({ ...base, ateData: '2030-01-01', totalOcorrencias: 3 });
    assert.equal(ocorrencias.length, 3);
    assert.equal(ocorrencias[2].numero, 3);
  });

  test('dataFim corta antes do horizonte', () => {
    const ocorrencias = ocorrenciasAte({
      ...base,
      ateData: '2026-12-31',
      dataFim: '2026-04-15',
    });
    assert.equal(ocorrencias.at(-1)?.data, '2026-04-10');
  });

  test('dataFim depois do horizonte nao amplia a geracao', () => {
    const ocorrencias = ocorrenciasAte({
      ...base,
      ateData: '2026-03-10',
      dataFim: '2030-01-01',
    });
    assert.equal(ocorrencias.length, 3);
  });

  test('primeiroNumero retoma de onde parou, sem repetir', () => {
    const ocorrencias = ocorrenciasAte({ ...base, ateData: '2026-05-10', primeiroNumero: 4 });
    assert.deepEqual(
      ocorrencias.map((o) => ({ numero: o.numero, data: o.data })),
      [
        { numero: 4, data: '2026-04-10' },
        { numero: 5, data: '2026-05-10' },
      ],
    );
  });

  test('nada a gerar quando o inicio e futuro', () => {
    assert.deepEqual(ocorrenciasAte({ ...base, ateData: '2025-12-31' }), []);
  });

  test('assinatura sem fim para na trava de seguranca', () => {
    const ocorrencias = ocorrenciasAte({
      dataInicio: '1900-01-01',
      frequencia: 'mensal',
      intervalo: 1,
      ateData: '2100-01-01',
    });
    assert.equal(ocorrencias.length, 600);
  });
});

describe('parcelasDaCompra', () => {
  test('numero, data e valor de cada parcela', () => {
    assert.deepEqual(parcelasDaCompra(100, 3, '2026-01-31'), [
      { numero: 1, data: '2026-01-31', valor: 33.34 },
      { numero: 2, data: '2026-02-28', valor: 33.33 },
      { numero: 3, data: '2026-03-31', valor: 33.33 },
    ]);
  });

  test('aceita outra frequencia e intervalo', () => {
    const parcelas = parcelasDaCompra(90, 3, '2026-01-01', 'semanal', 2);
    assert.deepEqual(
      parcelas.map((p) => p.data),
      ['2026-01-01', '2026-01-15', '2026-01-29'],
    );
  });
});

describe('proximaOcorrencia', () => {
  const base = { dataInicio: '2026-01-10', frequencia: 'mensal', intervalo: 1 } as const;

  test('a data exata conta como proxima', () => {
    assert.deepEqual(proximaOcorrencia({ ...base, aPartirDe: '2026-03-10' }), {
      numero: 3,
      data: '2026-03-10',
    });
  });

  test('pula para a seguinte quando a data ja passou', () => {
    assert.deepEqual(proximaOcorrencia({ ...base, aPartirDe: '2026-03-11' }), {
      numero: 4,
      data: '2026-04-10',
    });
  });

  test('null quando o parcelamento acabou', () => {
    assert.equal(
      proximaOcorrencia({ ...base, aPartirDe: '2027-01-01', totalOcorrencias: 6 }),
      null,
    );
  });

  test('null quando passou da data de encerramento', () => {
    assert.equal(
      proximaOcorrencia({ ...base, aPartirDe: '2027-01-01', dataFim: '2026-06-30' }),
      null,
    );
  });

  test('plano que ainda nao comecou devolve a primeira', () => {
    assert.deepEqual(proximaOcorrencia({ ...base, aPartirDe: '2020-01-01' }), {
      numero: 1,
      data: '2026-01-10',
    });
  });
});

describe('custoMensalEquivalente', () => {
  test('mensal e o proprio valor', () => {
    assert.equal(custoMensalEquivalente(39.9, 'mensal', 1), 39.9);
  });

  test('anual dilui em doze meses', () => {
    assert.equal(custoMensalEquivalente(120, 'anual', 1), 10);
  });

  test('semanal usa 52 semanas por ano', () => {
    assert.equal(Number(custoMensalEquivalente(30, 'semanal', 1).toFixed(2)), 130);
  });

  test('intervalo divide o custo', () => {
    assert.equal(custoMensalEquivalente(100, 'mensal', 2), 50);
    assert.equal(custoMensalEquivalente(240, 'anual', 2), 10);
  });

  test('intervalo zero nao divide por zero', () => {
    assert.equal(custoMensalEquivalente(50, 'mensal', 0), 50);
  });
});

describe('rotuloParcela', () => {
  test('parcelamento mostra numero e total', () => {
    assert.equal(rotuloParcela(3, 12), '3/12');
  });

  test('assinatura nao tem total', () => {
    assert.equal(rotuloParcela(3, null), '3ª cobrança');
  });
});
