import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { alturaBarra, ALTURA_POR_DIA, posicaoLinha } from './charts';

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

describe('posicaoLinha', () => {
  test('posiciona proporcionalmente', () => {
    assert.deepEqual(posicaoLinha(50, 100, 140), { bottom: 70 });
  });

  test('nao passa do topo do grafico', () => {
    assert.deepEqual(posicaoLinha(500, 100, 140), { bottom: 140 });
  });

  test('maximo zero encosta no chao', () => {
    assert.deepEqual(posicaoLinha(10, 0, 140), { bottom: 0 });
  });

  test('valor zero encosta no chao', () => {
    assert.deepEqual(posicaoLinha(0, 100, 140), { bottom: 0 });
  });
});
