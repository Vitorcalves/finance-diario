import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  caminhoBarra,
  colunaMaisProxima,
  ehJaneiro,
  escalaVariacao,
  formatarFatia,
  formatarPontos,
  formatarVariacao,
  marcasEixoMeses,
  mediaMensal,
  nomeDoMes,
  posicaoY,
  rotuloMarca,
  rotuloMes,
} from './grafico';

describe('rotulos de mes', () => {
  test('curto, com e sem o ano', () => {
    assert.equal(rotuloMes('2026-10'), 'out/26');
    assert.equal(rotuloMes('2026-10', false), 'out');
  });

  test('por extenso', () => {
    assert.equal(nomeDoMes('2026-03'), 'Março de 2026');
  });

  test('janeiro marca a virada do ano', () => {
    assert.equal(ehJaneiro('2026-01'), true);
    assert.equal(ehJaneiro('2026-02'), false);
  });
});

describe('formatarVariacao', () => {
  test('uma casa e o sinal sempre a mostra', () => {
    assert.equal(formatarVariacao(8.44), '+8,4%');
    assert.equal(formatarVariacao(-0.26), '-0,3%');
    assert.equal(formatarVariacao(12), '+12,0%');
  });

  test('zero, ou o que arredonda para zero, sai sem sinal', () => {
    assert.equal(formatarVariacao(0), '0%');
    assert.equal(formatarVariacao(0.04), '0%');
    assert.equal(formatarVariacao(-0.04), '0%');
  });
});

describe('formatarPontos', () => {
  test('duas casas, em pontos percentuais', () => {
    assert.equal(formatarPontos(0.854), '+0,85 p.p.');
    assert.equal(formatarPontos(-1.2), '-1,20 p.p.');
    assert.equal(formatarPontos(0.001), '0 p.p.');
  });
});

describe('formatarFatia', () => {
  test('percentual inteiro da cesta', () => {
    assert.equal(formatarFatia(0.254), '25%');
    assert.equal(formatarFatia(1), '100%');
    assert.equal(formatarFatia(0), '0%');
  });

  test('fatia minima nao vira 0%', () => {
    assert.equal(formatarFatia(0.004), '<1%');
  });
});

describe('mediaMensal', () => {
  test('composta, da o acumulado de volta', () => {
    const media = mediaMensal(21, 2);

    assert.ok(Math.abs(media - 10) < 1e-9);
  });

  test('sem meses nao ha media', () => {
    assert.equal(mediaMensal(10, 0), 0);
  });
});

describe('escalaVariacao', () => {
  test('o zero entra mesmo com todos os valores positivos', () => {
    const escala = escalaVariacao([1.2, 3.4, 2]);

    assert.equal(escala.minimo, 0);
    assert.deepEqual(escala.marcas, [0, 1, 2, 3, 4]);
  });

  test('valores dos dois lados do zero', () => {
    const escala = escalaVariacao([-1.5, 2.5]);

    assert.deepEqual(escala.marcas, [-2, -1, 0, 1, 2, 3]);
    assert.equal(escala.maximo, 3);
  });

  test('variacoes pequenas ganham passo decimal, sem marca sobrando', () => {
    const escala = escalaVariacao([0.3, -0.1]);

    assert.deepEqual(escala.marcas, [-0.1, 0, 0.1, 0.2, 0.3]);
  });

  test('tudo zero ou vazio ainda tem eixo', () => {
    assert.deepEqual(escalaVariacao([]).marcas, [0, 0.5, 1]);
    assert.deepEqual(escalaVariacao([0, 0]).marcas, [0, 0.5, 1]);
  });
});

describe('rotuloMarca', () => {
  test('usa as casas que o passo pede', () => {
    assert.equal(rotuloMarca(2, 1), '2%');
    assert.equal(rotuloMarca(-0.5, 0.5), '-0,5%');
    assert.equal(rotuloMarca(0.05, 0.05), '0,05%');
  });
});

describe('posicaoY', () => {
  test('o maximo fica no topo e o minimo na base', () => {
    const escala = escalaVariacao([-2, 2]);

    assert.equal(posicaoY(escala.maximo, escala, 100), 0);
    assert.equal(posicaoY(escala.minimo, escala, 100), 100);
    assert.equal(posicaoY(0, escala, 100), 50);
  });
});

describe('marcasEixoMeses', () => {
  test('poucas colunas levam todas o rotulo', () => {
    assert.deepEqual(marcasEixoMeses(4, 6), [0, 1, 2, 3]);
  });

  test('muitas colunas: de tantos em tantos meses, sempre com a ultima', () => {
    assert.deepEqual(marcasEixoMeses(13, 5), [0, 3, 6, 9, 12]);
    assert.deepEqual(marcasEixoMeses(12, 6), [1, 3, 5, 7, 9, 11]);
  });

  test('sem colunas nao ha rotulo', () => {
    assert.deepEqual(marcasEixoMeses(0, 5), []);
  });
});

describe('caminhoBarra', () => {
  test('para cima: sai da base e arredonda so a ponta', () => {
    assert.equal(
      caminhoBarra(10, 20, 100, 40, 4),
      'M10.0 100.0 L10.0 44.0 Q10.0 40.0 14.0 40.0 L26.0 40.0 Q30.0 40.0 30.0 44.0 L30.0 100.0 Z',
    );
  });

  test('para baixo: a ponta arredondada fica embaixo', () => {
    assert.equal(
      caminhoBarra(10, 20, 100, 130, 4),
      'M10.0 100.0 L10.0 126.0 Q10.0 130.0 14.0 130.0 L26.0 130.0 Q30.0 130.0 30.0 126.0 L30.0 100.0 Z',
    );
  });

  test('barra mais baixa que o raio nao passa da base', () => {
    const caminho = caminhoBarra(0, 20, 100, 98, 4);

    assert.ok(caminho.includes('L0.0 100.0 Q0.0 98.0 2.0 98.0'));
  });
});

describe('colunaMaisProxima', () => {
  test('escolhe a coluna de menor distancia horizontal', () => {
    assert.equal(colunaMaisProxima([10, 30, 50], 34), 1);
    assert.equal(colunaMaisProxima([10, 30, 50], 500), 2);
  });

  test('sem colunas devolve null', () => {
    assert.equal(colunaMaisProxima([], 10), null);
  });
});
