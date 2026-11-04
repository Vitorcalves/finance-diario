import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { getConnection } from './database';
import {
  type Conta,
  contarTransacoesDaConta,
  inativarConta,
  insertConta,
  listContas,
  listContasPorTipo,
  normalizarDadosConta,
  reativarConta,
  saldoDaConta,
  totaisPorTipo,
  updateConta,
  ValidacaoContaError,
} from './contas';

beforeEach(async () => {
  await prepararBanco();
});

const contaBase = (parcial: Partial<Conta> = {}): Conta => ({
  id: parcial.id ?? 'c1',
  nome: parcial.nome ?? 'Conta',
  tipo: parcial.tipo ?? 'caixa',
  dia_fechamento: parcial.dia_fechamento ?? null,
  dia_vencimento: parcial.dia_vencimento ?? null,
  meta_valor: parcial.meta_valor ?? null,
  saldo_inicial: parcial.saldo_inicial ?? 0,
  cor: parcial.cor ?? null,
  ativo: parcial.ativo ?? 1,
  ordem: parcial.ordem ?? 0,
  created_at: '2026-01-01T00:00:00.000Z',
});

const inserirTransacao = async (
  parcial: Partial<{
    id: string;
    valor: number;
    conta_id: string | null;
    conta_destino_id: string | null;
    contabilizado_saldo: number;
  }> = {},
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO transacoes (id, descricao, valor, data, conta_id, conta_destino_id,
                                contabilizado_saldo, created_at)
        VALUES (?, 'Teste', ?, '2026-01-10', ?, ?, ?, '2026-01-10')
    `,
    [
      parcial.id ?? Math.random().toString(36).slice(2),
      parcial.valor ?? -10,
      parcial.conta_id ?? null,
      parcial.conta_destino_id ?? null,
      parcial.contabilizado_saldo ?? 1,
    ],
  );
};

describe('crud de contas', () => {
  test('insert e list devolvem a conta gravada', async () => {
    await insertConta(contaBase({ id: 'c1', nome: 'Nubank' }));

    const contas = await listContas();

    assert.equal(contas.length, 2); // caixa-padrao + Nubank
    const nubank = contas.find((conta) => conta.id === 'c1');
    assert.equal(nubank?.nome, 'Nubank');
    assert.equal(nubank?.tipo, 'caixa');
  });

  test('listContasPorTipo filtra por tipo e so traz ativas', async () => {
    await insertConta(
      contaBase({
        id: 'cartao1',
        nome: 'Visa',
        tipo: 'cartao',
        dia_fechamento: 30,
        dia_vencimento: 10,
      }),
    );
    await insertConta(contaBase({ id: 'reserva1', nome: 'Reserva', tipo: 'reserva' }));
    await insertConta(contaBase({ id: 'inativa', nome: 'Velha', ativo: 0 }));

    const caixas = await listContasPorTipo('caixa');
    assert.deepEqual(
      caixas.map((conta) => conta.id),
      ['caixa-padrao'],
    );

    const cartoes = await listContasPorTipo('cartao');
    assert.equal(cartoes.length, 1);
    assert.equal(cartoes[0].nome, 'Visa');
  });

  test('update altera os campos', async () => {
    await insertConta(contaBase({ id: 'c1', nome: 'Antes' }));

    await updateConta({ ...contaBase({ id: 'c1' }), nome: 'Depois', cor: '#ff0000' });

    const contas = await listContas();
    const conta = contas.find((item) => item.id === 'c1');
    assert.equal(conta?.nome, 'Depois');
    assert.equal(conta?.cor, '#ff0000');
  });

  test('inativar e reativar mudam o ativo', async () => {
    await insertConta(contaBase({ id: 'c1' }));

    await inativarConta('c1');
    let contas = await listContas();
    assert.equal(contas.find((conta) => conta.id === 'c1')?.ativo, 0);

    await reativarConta('c1');
    contas = await listContas();
    assert.equal(contas.find((conta) => conta.id === 'c1')?.ativo, 1);
  });
});

describe('validacoes', () => {
  test('nome vazio recusado', () => {
    assert.throws(() => normalizarDadosConta({ nome: '   ', tipo: 'caixa' }), ValidacaoContaError);
  });

  test('cartao exige fechamento e vencimento entre 1 e 31', () => {
    assert.throws(() => normalizarDadosConta({ nome: 'Cartao', tipo: 'cartao' }), /fechamento/);
    assert.throws(
      () =>
        normalizarDadosConta({
          nome: 'Cartao',
          tipo: 'cartao',
          diaFechamento: 32,
          diaVencimento: 10,
        }),
      /1 e 31/,
    );
    assert.throws(
      () =>
        normalizarDadosConta({
          nome: 'Cartao',
          tipo: 'cartao',
          diaFechamento: 30,
          diaVencimento: 0,
        }),
      /1 e 31/,
    );
  });

  test('dia so vale para cartao: caixa e reserva zeram os campos', () => {
    const caixa = normalizarDadosConta({
      nome: 'Caixa',
      tipo: 'caixa',
      diaFechamento: 30,
      diaVencimento: 10,
    });
    assert.equal(caixa.dia_fechamento, null);
    assert.equal(caixa.dia_vencimento, null);

    const reserva = normalizarDadosConta({
      nome: 'Reserva',
      tipo: 'reserva',
      diaFechamento: 30,
      metaValor: 1000,
    });
    assert.equal(reserva.dia_fechamento, null);
    assert.equal(reserva.meta_valor, 1000);
  });

  test('meta so vale para reserva', () => {
    const cartao = normalizarDadosConta({
      nome: 'Cartao',
      tipo: 'cartao',
      diaFechamento: 30,
      diaVencimento: 10,
      metaValor: 500,
    });
    assert.equal(cartao.meta_valor, null);
  });
});

describe('saldoDaConta', () => {
  test('comeca com o saldo inicial', async () => {
    await insertConta(contaBase({ id: 'c1', saldo_inicial: 250 }));

    assert.equal(await saldoDaConta('c1'), 250);
  });

  test('gasto a vista sai da conta de origem', async () => {
    await insertConta(contaBase({ id: 'c1' }));
    await inserirTransacao({ valor: -100, conta_id: 'c1' });

    assert.equal(await saldoDaConta('c1'), -100);
  });

  test('aporte caixa -> reserva move o valor entre as pontas', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));
    // Aporte: uma linha, valor negativo saindo do caixa e entrando na reserva.
    await inserirTransacao({ valor: -200, conta_id: 'caixa1', conta_destino_id: 'reserva1' });

    assert.equal(await saldoDaConta('caixa1'), -200);
    assert.equal(await saldoDaConta('reserva1'), 200);
  });

  test('resgate reserva -> caixa inverte as pontas', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva', saldo_inicial: 500 }));
    await inserirTransacao({ valor: -150, conta_id: 'reserva1', conta_destino_id: 'caixa1' });

    assert.equal(await saldoDaConta('reserva1'), 350);
    assert.equal(await saldoDaConta('caixa1'), 150);
  });

  test('compra no cartao aumenta a divida; pagamento reduz', async () => {
    await insertConta(
      contaBase({ id: 'cartao1', tipo: 'cartao', dia_fechamento: 30, dia_vencimento: 10 }),
    );
    await insertConta(contaBase({ id: 'caixa1' }));

    // Compra no cartao: fora do caixa, so pesa na divida.
    await inserirTransacao({ valor: -300, conta_id: 'cartao1', contabilizado_saldo: 0 });
    assert.equal(await saldoDaConta('cartao1'), -300);
    assert.equal(await saldoDaConta('caixa1'), 0);

    // Pagamento da fatura: sai do caixa, quita divida do cartao.
    await inserirTransacao({ valor: -300, conta_id: 'caixa1', conta_destino_id: 'cartao1' });
    assert.equal(await saldoDaConta('cartao1'), 0);
    assert.equal(await saldoDaConta('caixa1'), -300);
  });
});

describe('totaisPorTipo', () => {
  test('soma caixa, reservas e divida dos cartoes separadamente', async () => {
    await insertConta(contaBase({ id: 'caixa1', saldo_inicial: 1000 }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));
    await insertConta(
      contaBase({ id: 'cartao1', tipo: 'cartao', dia_fechamento: 30, dia_vencimento: 10 }),
    );

    await inserirTransacao({ valor: -50, conta_id: 'caixa1' });
    await inserirTransacao({ valor: -200, conta_id: 'caixa1', conta_destino_id: 'reserva1' });
    await inserirTransacao({ valor: -300, conta_id: 'cartao1', contabilizado_saldo: 0 });

    const totais = await totaisPorTipo();

    // caixa-padrao (0) + caixa1: 1000 - 50 - 200
    assert.equal(totais.caixaDisponivel, 750);
    assert.equal(totais.totalReservas, 200);
    assert.equal(totais.totalFaturasAbertas, 300);
  });

  test('conta inativa nao entra nos totais', async () => {
    await insertConta(contaBase({ id: 'caixa1', saldo_inicial: 400, ativo: 0 }));

    const totais = await totaisPorTipo();

    assert.equal(totais.caixaDisponivel, 0);
  });
});

describe('contarTransacoesDaConta', () => {
  test('conta as duas pontas', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));

    assert.equal(await contarTransacoesDaConta('caixa1'), 0);

    await inserirTransacao({ valor: -100, conta_id: 'caixa1', conta_destino_id: 'reserva1' });

    assert.equal(await contarTransacoesDaConta('caixa1'), 1);
    assert.equal(await contarTransacoesDaConta('reserva1'), 1);
  });
});
