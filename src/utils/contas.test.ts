import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContaComSaldo } from '../models/contas';
import { agruparContas, corDaConta, descreverConta, progressoDaMeta, valorDaConta } from './contas';

const conta = (parcial: Partial<ContaComSaldo>): ContaComSaldo => ({
  id: 'c1',
  nome: 'Conta',
  tipo: 'caixa',
  dia_fechamento: null,
  dia_vencimento: null,
  meta_valor: null,
  saldo_inicial: 0,
  cor: null,
  ativo: 1,
  ordem: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  saldo: 0,
  possui_lancamentos: 0,
  ...parcial,
});

describe('progressoDaMeta', () => {
  test('so a reserva com meta tem progresso', () => {
    assert.equal(progressoDaMeta(conta({ tipo: 'caixa', meta_valor: 100, saldo: 50 })), null);
    assert.equal(progressoDaMeta(conta({ tipo: 'reserva', meta_valor: null, saldo: 50 })), null);
  });

  test('fracao, percentual e quanto falta', () => {
    assert.deepEqual(progressoDaMeta(conta({ tipo: 'reserva', meta_valor: 1000, saldo: 300 })), {
      fracao: 0.3,
      percentual: 30,
      falta: 700,
    });
  });

  test('so mostra 100% quando a meta chega; passar dela nao estoura a barra', () => {
    assert.equal(
      progressoDaMeta(conta({ tipo: 'reserva', meta_valor: 1000, saldo: 996 }))?.percentual,
      99,
    );
    assert.deepEqual(progressoDaMeta(conta({ tipo: 'reserva', meta_valor: 1000, saldo: 1500 })), {
      fracao: 1,
      percentual: 100,
      falta: 0,
    });
  });

  test('reserva negativa fica em 0%', () => {
    assert.equal(
      progressoDaMeta(conta({ tipo: 'reserva', meta_valor: 1000, saldo: -50 }))?.fracao,
      0,
    );
  });
});

describe('valorDaConta', () => {
  test('caixa e reserva mostram o saldo; negativo e destacado', () => {
    assert.deepEqual(valorDaConta(conta({ tipo: 'caixa', saldo: 120 })), {
      rotulo: 'Saldo',
      valor: 120,
      negativo: false,
    });
    assert.equal(valorDaConta(conta({ tipo: 'reserva', saldo: -10 })).negativo, true);
  });

  test('cartao mostra a divida positiva, em aberto, sem marcar como negativo', () => {
    assert.deepEqual(valorDaConta(conta({ tipo: 'cartao', saldo: -80 })), {
      rotulo: 'Em aberto',
      valor: 80,
      negativo: false,
    });
  });

  test('cartao quitado mostra zero (e nao -0); pago a mais vira credito', () => {
    assert.ok(Object.is(valorDaConta(conta({ tipo: 'cartao', saldo: 0 })).valor, 0));
    assert.deepEqual(valorDaConta(conta({ tipo: 'cartao', saldo: 15 })), {
      rotulo: 'Crédito',
      valor: 15,
      negativo: false,
    });
  });
});

describe('descreverConta', () => {
  test('cada tipo diz o que o define', () => {
    assert.equal(
      descreverConta(conta({ tipo: 'cartao', dia_fechamento: 30, dia_vencimento: 10 })),
      'Fecha dia 30 · vence dia 10',
    );
    assert.equal(descreverConta(conta({ tipo: 'reserva', meta_valor: null })), 'Sem meta definida');
    assert.match(descreverConta(conta({ tipo: 'reserva', meta_valor: 5000 })), /^Meta de R\$/);
    assert.equal(descreverConta(conta({ id: 'caixa-padrao', tipo: 'caixa' })), 'Conta padrão');
    assert.equal(descreverConta(conta({ id: 'nubank', tipo: 'caixa' })), '');
  });

  test('a inativa leva o tipo na frente', () => {
    assert.equal(
      descreverConta(conta({ tipo: 'cartao', ativo: 0, dia_fechamento: 30, dia_vencimento: 10 })),
      'Cartão · Fecha dia 30 · vence dia 10',
    );
    assert.equal(descreverConta(conta({ id: 'nubank', tipo: 'caixa', ativo: 0 })), 'Caixa');
  });
});

describe('agruparContas', () => {
  test('caixas, reservas, cartoes e inativas, nessa ordem; secao vazia some', () => {
    const secoes = agruparContas([
      conta({ id: 'visa', tipo: 'cartao' }),
      conta({ id: 'caixa-padrao', tipo: 'caixa' }),
      conta({ id: 'velha', tipo: 'reserva', ativo: 0 }),
      conta({ id: 'nubank', tipo: 'caixa' }),
    ]);

    assert.deepEqual(
      secoes.map((secao) => [secao.titulo, secao.contas.map((item) => item.id)]),
      [
        ['Caixas', ['caixa-padrao', 'nubank']],
        ['Cartões', ['visa']],
        ['Inativas', ['velha']],
      ],
    );
  });
});

describe('corDaConta', () => {
  /** Tema de mentira: devolve a chave, para o teste ver qual cor foi pedida. */
  const corCategoria = (chave: string | null | undefined): string => `paleta:${chave}`;

  test('chave da paleta vem do tema (acompanha o modo claro e escuro)', () => {
    assert.equal(corDaConta({ tipo: 'caixa', cor: 'laranja' }, corCategoria), 'paleta:laranja');
  });

  test('hex gravado antes da paleta continua valendo', () => {
    assert.equal(corDaConta({ tipo: 'caixa', cor: '#22c55e' }, corCategoria), '#22c55e');
  });

  test('sem cor, ou com valor que nao e cor, vale a do tipo', () => {
    assert.equal(corDaConta({ tipo: 'caixa', cor: null }, corCategoria), 'paleta:aqua');
    assert.equal(corDaConta({ tipo: 'reserva', cor: '' }, corCategoria), 'paleta:azul');
    assert.equal(corDaConta({ tipo: 'cartao', cor: 'verdinho' }, corCategoria), 'paleta:violeta');
    assert.equal(corDaConta({ tipo: 'cartao', cor: '#abc' }, corCategoria), 'paleta:violeta');
  });
});
