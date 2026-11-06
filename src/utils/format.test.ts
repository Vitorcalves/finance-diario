import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarData,
  formatarDataHora,
  formatarDiaRelativo,
  toCurrency,
  toCurrencyCurto,
  toCurrencyFino,
  toCurrencyPorUnidade,
  toPercent,
} from './format';

/** `Intl` separa `R$` do valor com espaco nao-quebravel. */
const NBSP = String.fromCharCode(160);
const texto = (valor: string): string => valor.split(NBSP).join(' ');

describe('toCurrency', () => {
  test('formata em real com duas casas', () => {
    assert.equal(texto(toCurrency(1234.56)), 'R$ 1.234,56');
  });

  test('arredonda a terceira casa', () => {
    assert.equal(texto(toCurrency(24.995)), 'R$ 25,00');
  });

  test('negativos e zero', () => {
    assert.equal(texto(toCurrency(-50)), '-R$ 50,00');
    assert.equal(texto(toCurrency(0)), 'R$ 0,00');
  });
});

describe('toCurrencyCurto', () => {
  test('sem centavos, para as escalas dos graficos', () => {
    assert.equal(texto(toCurrencyCurto(1234.56)), 'R$ 1.235');
    assert.equal(texto(toCurrencyCurto(0)), 'R$ 0');
  });
});

describe('toPercent', () => {
  test('positivo ganha sinal explicito', () => {
    assert.equal(toPercent(12.5), '+12,5%');
  });

  test('negativo mantem o proprio sinal', () => {
    assert.equal(toPercent(-12.5), '-12,5%');
  });

  test('zero nao ganha sinal', () => {
    assert.equal(toPercent(0), '0%');
  });

  test('corta em uma casa decimal', () => {
    assert.equal(toPercent(3.14159), '+3,1%');
  });
});

describe('toCurrencyFino', () => {
  test('duas casas a partir de R$ 1,00', () => {
    assert.equal(texto(toCurrencyFino(4.998)), 'R$ 5,00');
  });

  test('abaixo de R$ 1,00 abre ate quatro casas', () => {
    assert.equal(texto(toCurrencyFino(0.0125)), 'R$ 0,0125');
    assert.equal(texto(toCurrencyFino(0.5)), 'R$ 0,50');
  });
});

describe('toCurrencyPorUnidade', () => {
  test('anexa a sigla da unidade', () => {
    assert.equal(texto(toCurrencyPorUnidade(4.998, 'kg')), 'R$ 5,00/kg');
    assert.equal(texto(toCurrencyPorUnidade(10, 'L')), 'R$ 10,00/L');
  });

  test('abaixo de R$ 1,00 abre casas para nao virar R$ 0,00', () => {
    assert.equal(texto(toCurrencyPorUnidade(0.0125, 'un')), 'R$ 0,0125/un');
    assert.notEqual(texto(toCurrencyPorUnidade(0.004, 'un')), 'R$ 0,00/un');
  });

  test('valores redondos abaixo de 1 continuam com duas casas', () => {
    assert.equal(texto(toCurrencyPorUnidade(0.5, 'L')), 'R$ 0,50/L');
  });

  test('a regra das casas vale tambem para negativos', () => {
    assert.equal(texto(toCurrencyPorUnidade(-0.0125, 'un')), '-R$ 0,0125/un');
  });
});

describe('formatarData', () => {
  test('ISO vira dd/mm/aaaa', () => {
    assert.equal(formatarData('2026-09-08'), '08/09/2026');
  });

  test('mantem o dia ao receber data com hora', () => {
    assert.equal(formatarData('2026-09-08T14:30:00'), '08/09/2026');
  });

  test('formatarDataHora inclui o horario', () => {
    assert.equal(formatarDataHora('2026-09-08T14:30:00'), '08/09/2026 14:30');
  });
});

describe('formatarDiaRelativo', () => {
  const hoje = '2026-09-30';

  test('hoje, ontem e amanha por extenso', () => {
    assert.equal(formatarDiaRelativo('2026-09-30', hoje), 'Hoje');
    assert.equal(formatarDiaRelativo('2026-09-29', hoje), 'Ontem');
    assert.equal(formatarDiaRelativo('2026-10-01', hoje), 'Amanhã');
  });

  test('demais dias com dia da semana e mes abreviados', () => {
    assert.equal(formatarDiaRelativo('2026-09-24', hoje), 'Qui, 24 set');
  });

  test('ano diferente do atual aparece no texto', () => {
    assert.equal(formatarDiaRelativo('2025-12-31', hoje), 'Qua, 31 dez 2025');
  });

  test('data com hora conta pelo dia', () => {
    assert.equal(formatarDiaRelativo('2026-09-29T22:15:00', hoje), 'Ontem');
  });
});
