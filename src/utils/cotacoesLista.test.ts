import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compararCotacoes,
  type CotacaoComparavel,
  diferencaParaOMenor,
  empataComAMelhor,
  percentualAcimaDaMelhor,
} from './cotacoesLista';

const LITRO = 3;
const QUILO = 2;

type Cotacao = CotacaoComparavel & { id: string };

/** Cotacao de uma variante; `porUnidade` sem unidade = sem medida cadastrada. */
const cotacao = (
  id: string,
  preco: number,
  porUnidade: number | null = null,
  unidadeId = LITRO,
): Cotacao => ({
  id,
  varianteId: id,
  preco,
  unitario:
    porUnidade === null
      ? null
      : { valor: porUnidade, unidadeId, sigla: unidadeId === LITRO ? 'L' : 'kg' },
});

const ids = (lista: (Cotacao | null)[]): (string | null)[] =>
  lista.map((atual) => atual?.id ?? null);

describe('compararCotacoes', () => {
  test('sem cotacao nao ha o que comparar', () => {
    assert.deepEqual(compararCotacoes([], null), { vale: null, melhor: null, porUnidade: false });
  });

  test('qualquer marca: vale a mais barata por unidade, mesmo custando mais na prateleira', () => {
    // 1 L a R$ 4,99 (R$ 4,99/L) x 500 ml a R$ 3,20 (R$ 6,40/L).
    const comparacao = compararCotacoes(
      [cotacao('ninho', 3.2, 6.4), cotacao('piracanjuba', 4.99, 4.99)],
      null,
    );

    assert.equal(comparacao.porUnidade, true);
    assert.deepEqual(ids([comparacao.melhor, comparacao.vale]), ['piracanjuba', 'piracanjuba']);
  });

  test('a variante que o item quer levar vale mesmo nao sendo a mais barata', () => {
    const comparacao = compararCotacoes(
      [cotacao('piracanjuba', 4.99, 4.99), cotacao('itambe', 5.49, 5.49)],
      'itambe',
    );

    assert.deepEqual(ids([comparacao.melhor, comparacao.vale]), ['piracanjuba', 'itambe']);
  });

  test('sem a variante do item cotada aqui, vale a melhor', () => {
    const comparacao = compararCotacoes(
      [cotacao('piracanjuba', 4.99, 4.99), cotacao('itambe', 5.49, 5.49)],
      'parmalat',
    );

    assert.equal(comparacao.vale?.id, 'piracanjuba');
  });

  test('sem medida em alguma, ou em unidades diferentes, decide o preco cheio', () => {
    const semMedida = compararCotacoes([cotacao('a', 5, 5), cotacao('b', 4.5)], null);
    const unidades = compararCotacoes([cotacao('a', 5, 5), cotacao('b', 4.5, 9, QUILO)], null);

    assert.equal(semMedida.porUnidade, false);
    assert.equal(semMedida.melhor?.id, 'b');
    assert.equal(unidades.porUnidade, false);
    assert.equal(unidades.melhor?.id, 'b');
  });

  test('no empate fica a anotada primeiro', () => {
    const comparacao = compararCotacoes([cotacao('a', 5, 5), cotacao('b', 5.004, 5.004)], null);

    assert.equal(comparacao.melhor?.id, 'a');
  });
});

describe('empataComAMelhor e percentualAcimaDaMelhor', () => {
  const lista = [
    cotacao('piracanjuba', 4.99, 4.99),
    cotacao('itambe', 5.49, 5.49),
    cotacao('ninho', 3.2, 6.4),
  ];
  const comparacao = compararCotacoes(lista, null);

  test('so a melhor (ou quem empata com ela) leva o destaque', () => {
    assert.deepEqual(
      lista.map((atual) => empataComAMelhor(atual, comparacao)),
      [true, false, false],
    );
  });

  test('diz quanto cada uma sai a mais por unidade', () => {
    assert.deepEqual(
      lista.map((atual) => {
        const acima = percentualAcimaDaMelhor(atual, comparacao);
        return acima === null ? null : Math.round(acima);
      }),
      [0, 10, 28],
    );
  });

  test('sem comparacao por unidade nao ha percentual', () => {
    const semMedida = compararCotacoes([cotacao('a', 5), cotacao('b', 6)], null);

    assert.equal(percentualAcimaDaMelhor(cotacao('b', 6), semMedida), null);
    assert.equal(empataComAMelhor(cotacao('a', 5), semMedida), true);
  });
});

describe('diferencaParaOMenor', () => {
  test('sem outro mercado nao ha diferenca', () => {
    assert.equal(diferencaParaOMenor(cotacao('a', 5, 5), []), null);
  });

  test('compara por unidade quando todos reduzem a mesma unidade', () => {
    // Aqui 1 L a R$ 5,49; no outro mercado 500 ml a R$ 2,50 (R$ 5,00/L).
    assert.deepEqual(diferencaParaOMenor(cotacao('aqui', 5.49, 5.49), [cotacao('la', 2.5, 5)]), {
      valor: 5.49 - 5,
      sigla: 'L',
    });
  });

  test('sem medida em algum, compara o preco cheio', () => {
    assert.deepEqual(
      diferencaParaOMenor(cotacao('aqui', 5, 5), [cotacao('la', 6), cotacao('x', 4.5)]),
      {
        valor: 0.5,
        sigla: null,
      },
    );
  });
});
