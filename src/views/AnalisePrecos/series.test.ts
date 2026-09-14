import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparPorDia,
  calcularDominio,
  caminhoLinha,
  pontoMaisProximo,
  projetarPontos,
  resumirPrecos,
  ticksEixoX,
} from './series';
import type { Dominio, Serie } from './types';

const serie = (id: Serie['id'], pontos: { data: string; valor: number }[]): Serie => ({
  id,
  rotulo: id,
  pontos: pontos.map((ponto) => ({ ...ponto, registros: 1 })),
});

describe('agruparPorDia', () => {
  test('ordena do mais antigo para o mais recente', () => {
    const pontos = agruparPorDia([
      { data: '2026-03-10', preco: 10 },
      { data: '2026-01-05', preco: 8 },
    ]);

    assert.deepEqual(
      pontos.map((ponto) => ponto.data),
      ['2026-01-05', '2026-03-10'],
    );
  });

  test('dois registros no mesmo dia viram a media do dia', () => {
    const pontos = agruparPorDia([
      { data: '2026-03-10', preco: 10 },
      { data: '2026-03-10', preco: 14 },
    ]);

    assert.deepEqual(pontos, [{ data: '2026-03-10', valor: 12, registros: 2 }]);
  });

  test('descarta a hora da data ao agrupar', () => {
    const pontos = agruparPorDia([
      { data: '2026-03-10T08:00:00', preco: 10 },
      { data: '2026-03-10T20:00:00', preco: 20 },
    ]);

    assert.equal(pontos.length, 1);
    assert.equal(pontos[0].valor, 15);
  });

  test('sem registros devolve lista vazia', () => {
    assert.deepEqual(agruparPorDia([]), []);
  });
});

describe('calcularDominio', () => {
  test('sem pontos devolve null', () => {
    assert.equal(calcularDominio([serie('pago', [])]), null);
  });

  test('escala vertical arredonda para ticks redondos e cobre todos os valores', () => {
    const dominio = calcularDominio([
      serie('pago', [
        { data: '2026-01-01', valor: 7.3 },
        { data: '2026-02-01', valor: 12.9 },
      ]),
    ]);

    assert.ok(dominio);
    assert.ok(dominio.minimo <= 7.3);
    assert.ok(dominio.maximo >= 12.9);
    assert.equal(dominio.ticks[0], dominio.minimo);
    assert.equal(dominio.ticks.at(-1), dominio.maximo);
    assert.ok(dominio.ticks.length >= 3 && dominio.ticks.length <= 7);
  });

  test('minimo nunca fica negativo', () => {
    const dominio = calcularDominio([serie('pago', [{ data: '2026-01-01', valor: 0.5 }])]);

    assert.ok(dominio);
    assert.equal(dominio.minimo, 0);
  });

  test('um unico dia abre o eixo do tempo para os dois lados', () => {
    const dominio = calcularDominio([serie('pago', [{ data: '2026-01-10', valor: 5 }])]);

    assert.ok(dominio);
    assert.ok(dominio.fim > dominio.inicio);
    assert.deepEqual(ticksEixoX(dominio, 4), ['2026-01-09', '2026-01-10', '2026-01-11']);
  });

  test('valores todos iguais nao geram escala vazia', () => {
    const dominio = calcularDominio([
      serie('pago', [
        { data: '2026-01-01', valor: 10 },
        { data: '2026-01-02', valor: 10 },
      ]),
    ]);

    assert.ok(dominio);
    assert.ok(dominio.maximo > dominio.minimo);
  });

  test('junta o intervalo das duas series', () => {
    const dominio = calcularDominio([
      serie('historico', [{ data: '2026-01-01', valor: 20 }]),
      serie('pago', [{ data: '2026-03-01', valor: 5 }]),
    ]);

    assert.ok(dominio);
    assert.ok(dominio.minimo <= 5);
    assert.ok(dominio.maximo >= 20);
    assert.deepEqual(ticksEixoX(dominio, 2), ['2026-01-01', '2026-03-01']);
  });
});

describe('projetarPontos', () => {
  const dominio: Dominio = {
    inicio: new Date(2026, 0, 1).getTime(),
    fim: new Date(2026, 0, 11).getTime(),
    minimo: 0,
    maximo: 100,
    ticks: [0, 50, 100],
  };

  test('primeiro dia na esquerda, ultimo na direita; maior valor no topo', () => {
    const [inicio, fim] = projetarPontos(
      [
        { data: '2026-01-01', valor: 0, registros: 1 },
        { data: '2026-01-11', valor: 100, registros: 1 },
      ],
      dominio,
      200,
      100,
    );

    assert.equal(inicio.x, 0);
    assert.equal(inicio.y, 100);
    assert.equal(fim.x, 200);
    assert.equal(fim.y, 0);
  });

  test('caminho SVG liga os pontos em ordem', () => {
    const pontos = projetarPontos(
      [
        { data: '2026-01-01', valor: 50, registros: 1 },
        { data: '2026-01-06', valor: 25, registros: 1 },
      ],
      dominio,
      200,
      100,
    );

    assert.equal(caminhoLinha(pontos), 'M0.0 50.0 L100.0 75.0');
  });
});

describe('ticksEixoX', () => {
  test('nao cria mais marcas do que dias no intervalo', () => {
    const dominio: Dominio = {
      inicio: new Date(2026, 0, 1).getTime(),
      fim: new Date(2026, 0, 2).getTime(),
      minimo: 0,
      maximo: 1,
      ticks: [0, 1],
    };

    assert.deepEqual(ticksEixoX(dominio, 4), ['2026-01-01', '2026-01-02']);
  });
});

describe('pontoMaisProximo', () => {
  const pontos = [10, 50, 90].map((x) => ({
    x,
    y: 0,
    ponto: { data: '', valor: 0, registros: 1 },
  }));

  test('escolhe pelo eixo horizontal', () => {
    assert.equal(pontoMaisProximo(pontos, 45), 1);
    assert.equal(pontoMaisProximo(pontos, 300), 2);
  });

  test('sem pontos devolve null', () => {
    assert.equal(pontoMaisProximo([], 10), null);
  });
});

describe('resumirPrecos', () => {
  test('variacao compara o ultimo pago com o anterior', () => {
    const resumo = resumirPrecos(
      [
        { data: '2026-01-01', valor: 10, registros: 1 },
        { data: '2026-02-01', valor: 12, registros: 2 },
      ],
      [{ data: '2026-02-05', valor: 11, registros: 1 }],
    );

    assert.equal(resumo.ultimoPago, 12);
    assert.equal(resumo.variacaoPago, 20);
    assert.equal(resumo.menorPago, 10);
    assert.equal(resumo.maiorPago, 12);
    assert.equal(resumo.ultimoHistorico, 11);
    assert.equal(resumo.compras, 3);
    assert.equal(resumo.registros, 1);
  });

  test('sem compras tudo fica nulo', () => {
    const resumo = resumirPrecos([], []);

    assert.equal(resumo.ultimoPago, null);
    assert.equal(resumo.variacaoPago, null);
    assert.equal(resumo.menorPago, null);
    assert.equal(resumo.compras, 0);
  });

  test('uma unica compra nao tem variacao', () => {
    const resumo = resumirPrecos([{ data: '2026-01-01', valor: 10, registros: 1 }], []);

    assert.equal(resumo.variacaoPago, null);
  });
});
