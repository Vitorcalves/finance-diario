import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularInflacao, type CompraDoItem, type PrecoDoItem } from './inflacaoPessoal';

const preco = (itemId: string, data: string, valor: number): PrecoDoItem => ({
  itemId,
  data,
  preco: valor,
});

const compra = (itemId: string, data: string, total: number): CompraDoItem => ({
  itemId,
  data,
  total,
});

/** Compara percentuais sem esbarrar no arredondamento do ponto flutuante. */
const perto = (valor: number | null, esperado: number): void => {
  assert.ok(valor !== null, 'esperava um numero, veio null');
  assert.ok(Math.abs(valor - esperado) < 1e-9, `${valor} deveria ser ${esperado}`);
};

const FINAL = { mesFinal: '2026-12' };

describe('calcularInflacao', () => {
  test('sem historico de precos nao ha o que calcular', () => {
    assert.deepEqual(calcularInflacao([], [], FINAL), {
      mesBase: null,
      meses: [],
      acumulado: null,
      itens: [],
    });
  });

  test('um mes so de precos ainda nao tem com o que comparar', () => {
    const resultado = calcularInflacao(
      [preco('arroz', '2026-01-10', 20)],
      [compra('arroz', '2026-01-10', 20)],
      FINAL,
    );

    assert.equal(resultado.mesBase, '2026-01');
    assert.deepEqual(resultado.meses, []);
    assert.equal(resultado.acumulado, null);
  });

  test('encadeia a variacao de cada mes no acumulado', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 10),
        preco('arroz', '2026-02-10', 11),
        preco('arroz', '2026-03-10', 12.1),
      ],
      [compra('arroz', '2026-01-10', 10)],
      FINAL,
    );

    assert.equal(resultado.mesBase, '2026-01');
    assert.deepEqual(
      resultado.meses.map((mes) => mes.mes),
      ['2026-02', '2026-03'],
    );
    perto(resultado.meses[0].variacao, 10);
    perto(resultado.meses[1].variacao, 10);
    perto(resultado.meses[0].acumulado, 10);
    perto(resultado.meses[1].acumulado, 21);
    perto(resultado.acumulado, 21);
  });

  test('o peso de cada item e quanto foi gasto nele', () => {
    // Arroz subiu 10% e pesa 1/4 da cesta; o feijao nao mudou.
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('feijao', '2026-01-10', 8),
        preco('arroz', '2026-02-10', 22),
        preco('feijao', '2026-02-10', 8),
      ],
      [compra('arroz', '2026-01-10', 100), compra('feijao', '2026-01-10', 300)],
      FINAL,
    );

    perto(resultado.meses[0].variacao, 2.5);
    assert.equal(resultado.meses[0].itens, 2);
    assert.equal(resultado.meses[0].itensComPrecoNovo, 2);
  });

  test('item so cotado, sem compra, fica fora da cesta', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('caviar', '2026-01-10', 100),
        preco('arroz', '2026-02-10', 20),
        preco('caviar', '2026-02-10', 200),
      ],
      [compra('arroz', '2026-01-10', 20)],
      FINAL,
    );

    perto(resultado.meses[0].variacao, 0);
    assert.equal(resultado.meses[0].itens, 1);
    assert.deepEqual(
      resultado.itens.map((item) => item.itemId),
      ['arroz'],
    );
  });

  test('sem nenhuma compra o mes fica sem variacao', () => {
    const resultado = calcularInflacao(
      [preco('arroz', '2026-01-10', 20), preco('arroz', '2026-02-10', 30)],
      [],
      FINAL,
    );

    assert.equal(resultado.meses[0].variacao, null);
    assert.equal(resultado.meses[0].acumulado, 0);
    assert.equal(resultado.acumulado, null);
  });

  test('mes sem registro repete o ultimo preco e a mudanca aparece na volta', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('feijao', '2026-01-10', 8),
        preco('feijao', '2026-02-10', 8),
        preco('arroz', '2026-03-10', 25),
      ],
      [compra('arroz', '2026-01-10', 100), compra('feijao', '2026-01-10', 100)],
      FINAL,
    );

    const [fevereiro, marco] = resultado.meses;

    perto(fevereiro.variacao, 0);
    assert.equal(fevereiro.itens, 2);
    assert.equal(fevereiro.itensComPrecoNovo, 1);
    // Arroz: 20 -> 25 (+25%), com metade da cesta.
    perto(marco.variacao, 12.5);
    assert.equal(marco.itensComPrecoNovo, 1);
  });

  test('mes inteiro sem registro entra na serie com variacao zero', () => {
    const resultado = calcularInflacao(
      [preco('arroz', '2026-01-10', 20), preco('arroz', '2026-03-10', 22)],
      [compra('arroz', '2026-01-10', 20)],
      FINAL,
    );

    assert.deepEqual(
      resultado.meses.map((mes) => [mes.mes, mes.itensComPrecoNovo]),
      [
        ['2026-02', 0],
        ['2026-03', 1],
      ],
    );
    perto(resultado.meses[0].variacao, 0);
    perto(resultado.meses[1].variacao, 10);
  });

  test('varios registros no mes viram a media do mes', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-05', 20),
        preco('arroz', '2026-02-05', 21),
        preco('arroz', '2026-02-20T18:30:00', 23),
      ],
      [compra('arroz', '2026-01-05', 20)],
      FINAL,
    );

    perto(resultado.meses[0].variacao, 10);
  });

  test('item novo so entra na comparacao no mes seguinte ao primeiro preco', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('arroz', '2026-02-10', 20),
        preco('cafe', '2026-02-10', 30),
        preco('arroz', '2026-03-10', 20),
        preco('cafe', '2026-03-10', 33),
      ],
      [compra('arroz', '2026-01-10', 100), compra('cafe', '2026-02-10', 100)],
      FINAL,
    );

    assert.equal(resultado.meses[0].itens, 1);
    assert.equal(resultado.meses[1].itens, 2);
    perto(resultado.meses[1].variacao, 5);
  });

  test('compra de mais de 12 meses atras deixa de pesar', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2025-01-10', 20),
        preco('arroz', '2025-12-10', 22),
        preco('arroz', '2026-01-10', 44),
      ],
      [compra('arroz', '2025-01-10', 20)],
      { mesFinal: '2026-12' },
    );

    const dezembro = resultado.meses.find((mes) => mes.mes === '2025-12');
    const janeiro = resultado.meses.find((mes) => mes.mes === '2026-01');

    // Dezembro ainda enxerga a compra de janeiro (12 meses contando o proprio).
    perto(dezembro?.variacao ?? null, 10);
    assert.equal(janeiro?.variacao, null);
    assert.equal(janeiro?.itens, 0);
  });

  test('registros depois do mes final ficam de fora', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('arroz', '2026-02-10', 22),
        preco('arroz', '2026-03-10', 40),
      ],
      [compra('arroz', '2026-01-10', 20)],
      { mesFinal: '2026-02' },
    );

    assert.deepEqual(
      resultado.meses.map((mes) => mes.mes),
      ['2026-02'],
    );
    perto(resultado.acumulado, 10);
  });

  test('precos e totais invalidos sao ignorados', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('arroz', '2026-02-10', 0),
        preco('arroz', 'sem data', 99),
        preco('arroz', '2026-02-12', 22),
      ],
      [compra('arroz', '2026-01-10', 20), compra('arroz', '2026-01-11', -5)],
      FINAL,
    );

    perto(resultado.meses[0].variacao, 10);
  });

  describe('periodo', () => {
    const precos = [
      preco('arroz', '2026-01-10', 10),
      preco('arroz', '2026-02-10', 11),
      preco('arroz', '2026-03-10', 12.1),
      preco('arroz', '2026-04-10', 13.31),
    ];
    const compras = [compra('arroz', '2026-01-10', 10)];

    test('recorta os ultimos meses e parte o acumulado do novo mes base', () => {
      const resultado = calcularInflacao(precos, compras, { mesFinal: '2026-12', meses: 2 });

      assert.equal(resultado.mesBase, '2026-02');
      assert.deepEqual(
        resultado.meses.map((mes) => mes.mes),
        ['2026-03', '2026-04'],
      );
      perto(resultado.meses[0].acumulado, 10);
      perto(resultado.acumulado, 21);
      perto(resultado.itens[0].precoInicial, 11);
      perto(resultado.itens[0].precoFinal, 13.31);
    });

    test('a variacao de um mes e a mesma em qualquer recorte', () => {
      const tudo = calcularInflacao(precos, compras, { mesFinal: '2026-12' });
      const recorte = calcularInflacao(precos, compras, { mesFinal: '2026-12', meses: 1 });

      assert.equal(recorte.meses[0].variacao, tudo.meses[2].variacao);
    });

    test('periodo maior que o historico mostra tudo', () => {
      const resultado = calcularInflacao(precos, compras, { mesFinal: '2026-12', meses: 12 });

      assert.equal(resultado.mesBase, '2026-01');
      assert.equal(resultado.meses.length, 3);
    });
  });

  describe('itens', () => {
    const resultado = calcularInflacao(
      [
        preco('arroz', '2026-01-10', 20),
        preco('feijao', '2026-01-10', 10),
        preco('cafe', '2026-01-10', 30),
        preco('arroz', '2026-02-10', 22),
        preco('feijao', '2026-02-10', 9),
        preco('cafe', '2026-02-10', 30),
        preco('arroz', '2026-03-10', 24.2),
        preco('feijao', '2026-03-10', 9),
        preco('cafe', '2026-03-10', 30),
      ],
      [
        compra('arroz', '2026-01-10', 200),
        compra('feijao', '2026-01-10', 100),
        compra('cafe', '2026-01-10', 100),
      ],
      FINAL,
    );

    test('a soma dos impactos e o acumulado do periodo', () => {
      const soma = resultado.itens.reduce((total, item) => total + item.impacto, 0);

      perto(soma, resultado.acumulado ?? Number.NaN);
    });

    test('traz o preco inicial, o final, a variacao e a fatia de cada item', () => {
      const arroz = resultado.itens.find((item) => item.itemId === 'arroz');

      assert.ok(arroz);
      perto(arroz.precoInicial, 20);
      perto(arroz.precoFinal, 24.2);
      perto(arroz.variacao, 21);
      perto(arroz.participacao, 0.5);
    });

    test('ordena pelo tamanho do impacto, para cima ou para baixo', () => {
      assert.deepEqual(
        resultado.itens.map((item) => item.itemId),
        ['arroz', 'feijao', 'cafe'],
      );
      assert.ok(resultado.itens[1].impacto < 0);
      perto(resultado.itens[2].impacto, 0);
    });
  });
});
