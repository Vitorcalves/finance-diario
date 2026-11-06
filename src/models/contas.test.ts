import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { getConnection } from './database';
import { garantirFatura } from './faturas';
import { criarCompraParcelada } from './materializacaoPlanos';
import { contabilizadoDe, type NaturezaTransacao } from './naturezaTransacao';
import {
  type Conta,
  CONTA_CAIXA_PADRAO,
  contarTransacoesDaConta,
  deleteContaById,
  getContaById,
  inativarConta,
  insertConta,
  listContas,
  listContasComSaldo,
  listContasPorTipo,
  normalizarDadosConta,
  podeMudarTipo,
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

/**
 * Grava uma linha crua. Sem `natureza`, ela sai das pontas como o app grava:
 * destino com fatura e pagamento, destino sem fatura e transferencia, so
 * fatura e compra no cartao, o resto e movimento.
 */
const inserirTransacao = async (
  parcial: Partial<{
    id: string;
    valor: number;
    data: string;
    conta_id: string | null;
    conta_destino_id: string | null;
    fatura_id: string | null;
    natureza: NaturezaTransacao;
  }> = {},
): Promise<void> => {
  const db = await getConnection();
  const destino = parcial.conta_destino_id ?? null;
  const fatura = parcial.fatura_id ?? null;
  const natureza: NaturezaTransacao =
    parcial.natureza ??
    (destino
      ? fatura
        ? 'pagamento_fatura'
        : 'transferencia'
      : fatura
        ? 'compra_cartao'
        : 'movimento');

  await db.runAsync(
    `
        INSERT INTO transacoes (id, descricao, valor, data, conta_id, conta_destino_id, natureza,
                                contabilizado_saldo, fatura_id, created_at)
        VALUES (?, 'Teste', ?, ?, ?, ?, ?, ?, ?, '2026-01-10')
    `,
    [
      parcial.id ?? Math.random().toString(36).slice(2),
      parcial.valor ?? -10,
      parcial.data ?? '2026-01-10',
      parcial.conta_id ?? null,
      destino,
      natureza,
      contabilizadoDe(natureza),
      fatura,
    ],
  );
};

/** Fatura real do cartao: compra no cartao sempre tem `fatura_id` (e a FK confere). */
const faturaDe = async (contaId: string, mesRef = '2026-01'): Promise<string> => {
  const fatura = await garantirFatura(contaId, {
    mesRef,
    dataFechamento: `${mesRef}-28`,
    dataVencimento: `${mesRef}-28`,
  });

  return fatura.id;
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

    // Compra no cartao: fora do caixa, presa a fatura, so pesa na divida.
    await inserirTransacao({
      valor: -300,
      conta_id: 'cartao1',
      fatura_id: await faturaDe('cartao1'),
    });
    assert.equal(await saldoDaConta('cartao1'), -300);
    assert.equal(await saldoDaConta('caixa1'), 0);

    // Pagamento da fatura: sai do caixa, quita divida do cartao.
    await inserirTransacao({ valor: -300, conta_id: 'caixa1', conta_destino_id: 'cartao1' });
    assert.equal(await saldoDaConta('cartao1'), 0);
    assert.equal(await saldoDaConta('caixa1'), -300);
  });

  test('a compra parcelada conta uma vez so: a parcela 0 so guarda os itens', async () => {
    await criarCompraParcelada({
      descricao: 'Geladeira',
      empresaId: null,
      valorTotal: -300,
      dataCompra: '2026-01-10',
      parcelas: 3,
      primeiraParcela: '2026-01-10',
    });

    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO, '2026-01-15'), -100);
    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO, '2026-03-31'), -300);
  });

  test('soma todo o historico, sem o limite de 50 do feed', async () => {
    for (let dia = 0; dia < 60; dia++) {
      await inserirTransacao({
        valor: -10,
        conta_id: CONTA_CAIXA_PADRAO,
        data: `2026-0${1 + Math.floor(dia / 28)}-${String((dia % 28) + 1).padStart(2, '0')}`,
      });
    }
    await inserirTransacao({ valor: 1000, conta_id: CONTA_CAIXA_PADRAO, data: '2026-01-05' });

    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO, '2026-12-31'), 1000 - 600);
  });
});

describe('saldo na data', () => {
  test('caixa e reserva contam so o que ja aconteceu', async () => {
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));
    await inserirTransacao({ valor: -50, conta_id: CONTA_CAIXA_PADRAO, data: '2026-01-10' });
    await inserirTransacao({ valor: -30, conta_id: CONTA_CAIXA_PADRAO, data: '2026-01-20' });
    await inserirTransacao({
      valor: -100,
      conta_id: CONTA_CAIXA_PADRAO,
      conta_destino_id: 'reserva1',
      data: '2026-01-25',
    });

    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO, '2026-01-15'), -50);
    assert.equal(await saldoDaConta('reserva1', '2026-01-15'), 0);
    assert.equal(await saldoDaConta(CONTA_CAIXA_PADRAO, '2026-01-31'), -180);
    assert.equal(await saldoDaConta('reserva1', '2026-01-31'), 100);
  });

  test('no cartao a divida nasce na compra: parcela com data futura ja conta', async () => {
    await insertConta(
      contaBase({ id: 'cartao1', tipo: 'cartao', dia_fechamento: 28, dia_vencimento: 28 }),
    );
    await inserirTransacao({
      valor: -40,
      conta_id: 'cartao1',
      fatura_id: await faturaDe('cartao1', '2026-01'),
      data: '2026-01-10',
    });
    await inserirTransacao({
      valor: -40,
      conta_id: 'cartao1',
      fatura_id: await faturaDe('cartao1', '2026-02'),
      data: '2026-02-10',
    });

    assert.equal(await saldoDaConta('cartao1', '2026-01-15'), -80);
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
    await inserirTransacao({
      valor: -300,
      conta_id: 'cartao1',
      fatura_id: await faturaDe('cartao1'),
    });

    const totais = await totaisPorTipo();

    // caixa-padrao (0) + caixa1: 1000 - 50 - 200
    assert.equal(totais.caixaDisponivel, 750);
    assert.equal(totais.totalReservas, 200);
    assert.equal(totais.totalFaturasAbertas, 300);
  });

  test('resgate volta para o caixa disponivel (o "Saldo atual" da Home)', async () => {
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));
    await inserirTransacao({ valor: 1000, conta_id: CONTA_CAIXA_PADRAO });
    await inserirTransacao({
      valor: -500,
      conta_id: CONTA_CAIXA_PADRAO,
      conta_destino_id: 'reserva1',
    });
    await inserirTransacao({
      valor: -200,
      conta_id: 'reserva1',
      conta_destino_id: CONTA_CAIXA_PADRAO,
    });

    const totais = await totaisPorTipo();

    assert.equal(totais.caixaDisponivel, 700);
    assert.equal(totais.totalReservas, 300);
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

describe('protecao do caixa padrao e do tipo', () => {
  const caixaPadrao = async (): Promise<Conta> => {
    const conta = await getContaById(CONTA_CAIXA_PADRAO);
    assert.ok(conta);
    return conta;
  };

  test('o caixa padrao nao pode ser excluido nem inativado, mesmo sem lancamentos', async () => {
    await assert.rejects(() => deleteContaById(CONTA_CAIXA_PADRAO), ValidacaoContaError);
    await assert.rejects(() => inativarConta(CONTA_CAIXA_PADRAO), ValidacaoContaError);

    const conta = await caixaPadrao();
    assert.equal(conta.ativo, 1);
  });

  test('o caixa padrao nao muda de tipo nem fica inativo pela edicao, mas pode ser renomeado', async () => {
    const atual = await caixaPadrao();

    await assert.rejects(() => updateConta({ ...atual, tipo: 'reserva' }), ValidacaoContaError);
    await assert.rejects(() => updateConta({ ...atual, ativo: 0 }), ValidacaoContaError);

    await updateConta({ ...atual, nome: 'Carteira' });
    const depois = await caixaPadrao();
    assert.equal(depois.nome, 'Carteira');
    assert.equal(depois.tipo, 'caixa');
  });

  test('o tipo so muda enquanto a conta nao tem lancamentos', async () => {
    await insertConta(contaBase({ id: 'c1', tipo: 'caixa' }));

    // Sem lancamentos: escolheu errado, pode corrigir.
    await updateConta(contaBase({ id: 'c1', tipo: 'reserva' }));
    assert.equal((await getContaById('c1'))?.tipo, 'reserva');

    await inserirTransacao({ valor: -10, conta_id: 'c1' });

    await assert.rejects(
      () => updateConta(contaBase({ id: 'c1', tipo: 'caixa' })),
      /tipo dela não pode mudar/,
    );
    assert.equal((await getContaById('c1'))?.tipo, 'reserva');
  });

  test('conta com lancamentos nao e excluida: so inativada', async () => {
    await insertConta(contaBase({ id: 'c1' }));
    await inserirTransacao({ valor: -10, conta_id: 'c1' });

    await assert.rejects(() => deleteContaById('c1'), /não pode ser excluída/);

    await inativarConta('c1');
    assert.equal((await getContaById('c1'))?.ativo, 0);
  });

  test('excluir um cartao sem compras leva as faturas vazias junto', async () => {
    await insertConta(
      contaBase({ id: 'cartao1', tipo: 'cartao', dia_fechamento: 28, dia_vencimento: 28 }),
    );
    await faturaDe('cartao1');

    await deleteContaById('cartao1');

    const db = await getConnection();
    const faturas = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM faturas WHERE conta_id = 'cartao1'`,
    );
    assert.equal(faturas?.total, 0);
  });

  test('possui_lancamentos trava o tipo na tela; o caixa padrao sempre trava', async () => {
    await insertConta(contaBase({ id: 'c1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));

    const antes = await listContasComSaldo();
    const c1Antes = antes.find((conta) => conta.id === 'c1');
    assert.ok(c1Antes);
    assert.equal(c1Antes.possui_lancamentos, 0);
    assert.equal(podeMudarTipo(c1Antes), true);

    const padrao = antes.find((conta) => conta.id === CONTA_CAIXA_PADRAO);
    assert.ok(padrao);
    assert.equal(podeMudarTipo(padrao), false);

    // A reserva so aparece como destino: tambem conta como lancamento dela.
    await inserirTransacao({ valor: -10, conta_id: 'c1', conta_destino_id: 'reserva1' });

    const depois = await listContasComSaldo();
    assert.equal(depois.find((conta) => conta.id === 'c1')?.possui_lancamentos, 1);
    assert.equal(depois.find((conta) => conta.id === 'reserva1')?.possui_lancamentos, 1);
  });
});
