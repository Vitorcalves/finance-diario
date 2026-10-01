import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alturaBarra,
  alturaProporcional,
  ALTURA_POR_DIA,
  caminhoArea,
  caminhoSuave,
} from './charts';

describe('alturaBarra', () => {
  test('proporcional ao maximo', () => {
    assert.deepEqual(alturaBarra(50, 100, 100), { height: 50 });
    assert.deepEqual(alturaBarra(100, 100, 96), { height: 96 });
  });

  test('valor pequeno mantem uma barra visivel', () => {
    // 0,1% de 96px daria 0,096px: some da tela sem o piso.
    assert.deepEqual(alturaBarra(0.1, 100, ALTURA_POR_DIA), { height: 3 });
  });

  test('valor zero nao desenha barra', () => {
    assert.deepEqual(alturaBarra(0, 100, 96), { height: 0 });
  });

  test('valor negativo nao desenha barra', () => {
    assert.deepEqual(alturaBarra(-10, 100, 96), { height: 0 });
  });

  test('maximo zero nao divide por zero', () => {
    assert.deepEqual(alturaBarra(10, 0, 96), { height: 3 });
  });

  test('valor acima do maximo estoura a altura (grafico assume maximo real)', () => {
    assert.deepEqual(alturaBarra(200, 100, 96), { height: 192 });
  });
});

describe('alturaProporcional', () => {
  test('posiciona proporcionalmente', () => {
    assert.equal(alturaProporcional(50, 100, 140), 70);
  });

  test('nao passa do topo do grafico', () => {
    assert.equal(alturaProporcional(500, 100, 140), 140);
  });

  test('maximo zero encosta no chao', () => {
    assert.equal(alturaProporcional(10, 0, 140), 0);
  });

  test('valor zero encosta no chao', () => {
    assert.equal(alturaProporcional(0, 100, 140), 0);
  });
});

/** Numeros do caminho SVG, na ordem em que aparecem. */
const numeros = (caminho: string): number[] => (caminho.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('caminhoSuave', () => {
  test('sem pontos nao desenha nada', () => {
    assert.equal(caminhoSuave([]), '');
  });

  test('um ponto vira so o movimento ate ele', () => {
    assert.equal(caminhoSuave([{ x: 1, y: 2 }]), 'M1.0 2.0');
  });

  test('comeca no primeiro ponto e termina no ultimo', () => {
    const caminho = caminhoSuave([
      { x: 0, y: 100 },
      { x: 10, y: 80 },
      { x: 20, y: 40 },
    ]);
    const valores = numeros(caminho);

    assert.ok(caminho.startsWith('M0.0 100.0'));
    assert.deepEqual(valores.slice(-2), [20, 40]);
  });

  test('serie monotona nao ultrapassa os pontos (acumulado nunca "desce")', () => {
    // Acumulado com um salto: y decresce (sobe na tela) e depois fica plano.
    const pontos = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 20 },
      { x: 30, y: 20 },
    ];
    const valores = numeros(caminhoSuave(pontos));
    const ys = valores.filter((_, indice) => indice % 2 === 1);

    assert.ok(ys.every((y) => y >= 20 && y <= 100));
  });
});

describe('caminhoArea', () => {
  test('fecha a curva na linha de base', () => {
    const caminho = caminhoArea(
      [
        { x: 0, y: 50 },
        { x: 10, y: 20 },
      ],
      100,
    );

    assert.ok(caminho.endsWith('L10.0 100.0 L0.0 100.0 Z'));
  });

  test('menos de dois pontos nao forma area', () => {
    assert.equal(caminhoArea([{ x: 0, y: 0 }], 100), '');
  });
});
