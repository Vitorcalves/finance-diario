import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { emTransacao, getConnection } from './database';
import { insertItemTransacao, listItensTransacaoByTransacao } from './itensTransacao';
import { criarCompraParcelada } from './materializacaoPlanos';
import {
  excluirTransacao,
  insertTransacao,
  listCobrancasDePlanos,
  listTransacoes,
  restaurarTransacao,
  resumoCaixa,
} from './transacoesModel';

const lancar = async (id: string, valor: number, data: string): Promise<void> =>
  insertTransacao({ id, descricao: id, valor, data, created_at: AGORA });

beforeEach(async () => {
  await prepararBanco();
});

describe('listCobrancasDePlanos', () => {
  test('traz parcelamento longo inteiro, sem limite do feed ou janela de cinco anos', async () => {
    const { planoId } = await criarCompraParcelada({
      descricao: 'Plano longo',
      empresaId: null,
      valorTotal: -720,
      dataCompra: '2026-01-10',
      parcelas: 72,
      primeiraParcela: '2026-01-10',
    });

    const cobrancas = await listCobrancasDePlanos();
    const datas = cobrancas.map((cobranca) => cobranca.data).sort();

    assert.equal(cobrancas.length, 72);
    assert.ok(
      cobrancas.every(
        (cobranca) => cobranca.plano_id === planoId && cobranca.parcela_numero !== 0,
      ),
    );
    assert.equal(datas[0], '2026-01-10');
    assert.equal(datas[datas.length - 1], '2031-12-10');
  });

  test('inclui cobrancas antigas e ignora lancamentos avulsos', async () => {
    await criarCompraParcelada({
      descricao: 'Compra antiga',
      empresaId: null,
      valorTotal: -20,
      dataCompra: '2010-01-10',
      parcelas: 1,
      primeiraParcela: '2010-01-10',
    });
    await lancar('avulso', -10, '2026-01-10');

    const cobrancas = await listCobrancasDePlanos();

    assert.equal(cobrancas.length, 1);
    assert.equal(cobrancas[0].data, '2010-01-10');
    assert.equal(cobrancas[0].parcela_numero, 1);
  });
});

describe('resumoCaixa', () => {
  test('soma o saldo de todas as transacoes, sem o limite de 50 do feed', async () => {
    for (let dia = 0; dia < 60; dia++) {
      await lancar(
        `gasto-${dia}`,
        -10,
        `2026-0${1 + Math.floor(dia / 28)}-${String((dia % 28) + 1).padStart(2, '0')}`,
      );
    }
    await lancar('salario', 1000, '2026-01-05');

    const { saldoAtual } = await resumoCaixa('2026-12-31', '2026-12-31');

    assert.equal((await listTransacoes()).length, 50);
    assert.equal(saldoAtual, 1000 - 600);
  });

  test('o que vence depois de hoje fica fora do saldo e entra no comprometido ate a data limite', async () => {
    await lancar('mercado', -50, '2026-01-10');
    await lancar('parcela-jan', -30, '2026-01-20');
    await lancar('parcela-fev', -30, '2026-02-20');

    const resumo = await resumoCaixa('2026-01-15', '2026-01-31');

    assert.equal(resumo.saldoAtual, -50);
    assert.equal(resumo.comprometido, -30);
  });

  test('a compra parcelada (fora do caixa) nao entra no saldo; so as parcelas entram', async () => {
    await criarCompraParcelada({
      descricao: 'Geladeira',
      empresaId: null,
      valorTotal: -300,
      dataCompra: '2026-01-10',
      parcelas: 3,
      primeiraParcela: '2026-01-10',
    });

    const { saldoAtual } = await resumoCaixa('2026-01-15', '2026-01-31');

    assert.equal(saldoAtual, -100);
  });

  test('banco vazio devolve zero, e nao null', async () => {
    assert.deepEqual(await resumoCaixa('2026-01-15', '2026-01-31'), {
      saldoAtual: 0,
      comprometido: 0,
    });
  });
});

describe('excluirTransacao e restaurarTransacao', () => {
  test('apaga a transacao com os itens e devolve tudo para o desfazer', async () => {
    await lancar('compra', -20, '2026-01-10');
    await insertItemTransacao({
      id: 'item-1',
      transacao_id: 'compra',
      descricao: 'Arroz',
      valor: 10,
      quantidade: 2,
      created_at: AGORA,
    });

    const excluida = await excluirTransacao('compra');

    assert.equal(excluida?.transacao.id, 'compra');
    assert.equal(excluida?.itens.length, 1);
    assert.equal((await listTransacoes()).length, 0);
    assert.equal((await listItensTransacaoByTransacao('compra')).length, 0);
  });

  test('restaurar devolve a transacao e os itens com os mesmos ids', async () => {
    await lancar('compra', -20, '2026-01-10');
    await insertItemTransacao({
      id: 'item-1',
      transacao_id: 'compra',
      descricao: 'Arroz',
      valor: 10,
      quantidade: 2,
      created_at: AGORA,
    });

    const excluida = await excluirTransacao('compra');
    assert.ok(excluida);
    await restaurarTransacao(excluida);

    const [transacao] = await listTransacoes();
    assert.equal(transacao.id, 'compra');
    assert.equal(transacao.valor, -20);
    assert.deepEqual(
      (await listItensTransacaoByTransacao('compra')).map((item) => item.id),
      ['item-1'],
    );
  });

  test('restaurar uma parcela mantem o vinculo com o plano', async () => {
    const { planoId } = await criarCompraParcelada({
      descricao: 'Tenis',
      empresaId: null,
      valorTotal: -200,
      dataCompra: '2026-01-10',
      parcelas: 2,
      primeiraParcela: '2026-01-10',
    });
    const [parcela] = await listTransacoes('2026-01-01', '2026-01-31');

    const excluida = await excluirTransacao(parcela.id);
    assert.ok(excluida);
    await restaurarTransacao(excluida);

    const [restaurada] = await listTransacoes('2026-01-01', '2026-01-31');
    assert.equal(restaurada.plano_id, planoId);
    assert.equal(restaurada.parcela_numero, 1);
  });

  test('id inexistente devolve null', async () => {
    assert.equal(await excluirTransacao('nao-existe'), null);
  });
});

describe('emTransacao', () => {
  test('se um passo falha, nada do que foi gravado antes fica no banco', async () => {
    await assert.rejects(
      emTransacao(async () => {
        await lancar('primeira', -10, '2026-01-10');
        throw new Error('falhou no meio');
      }),
    );

    assert.equal((await listTransacoes()).length, 0);
  });

  test('chamadas aninhadas usam a mesma transacao', async () => {
    await emTransacao(async () => {
      await lancar('fora', -10, '2026-01-10');
      await emTransacao(async () => lancar('dentro', -5, '2026-01-11'));
    });

    assert.equal((await listTransacoes()).length, 2);
  });

  test('devolve o resultado da operacao', async () => {
    const db = await getConnection();
    const total = await emTransacao(async () => {
      await lancar('a', -10, '2026-01-10');
      const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transacoes');
      return row?.n ?? 0;
    });

    assert.equal(total, 1);
  });
});
