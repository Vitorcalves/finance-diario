import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { Locais } from '../utils/local';
import { insertConta } from './contas';
import { emTransacao, getConnection } from './database';
import { listFaturas, pagarFatura } from './faturas';
import { insertItemTransacao, listItensTransacaoByTransacao } from './itensTransacao';
import { registrarLancamento } from './lancamentos';
import { criarAssinatura, criarCompraParcelada } from './materializacaoPlanos';
import {
  buscarTransacoes,
  excluirTransacao,
  insertTransacao,
  listCobrancasDePlanos,
  listTransacoes,
  restaurarTransacao,
} from './transacoesModel';

const lancar = async (id: string, valor: number, data: string): Promise<void> =>
  insertTransacao({ id, descricao: id, valor, data, natureza: 'movimento', created_at: AGORA });

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
      cobrancas.every((cobranca) => cobranca.plano_id === planoId && cobranca.parcela_numero !== 0),
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

describe('cartao na busca e nos planos', () => {
  const criarCartao = (): Promise<void> =>
    insertConta({
      id: 'cartao1',
      nome: 'Visa',
      tipo: 'cartao',
      dia_fechamento: 30,
      dia_vencimento: 10,
      meta_valor: null,
      saldo_inicial: 0,
      cor: null,
      ativo: 1,
      ordem: 0,
      created_at: AGORA,
    });

  test('a busca acha a compra no cartao, inclusive filtrando pelo cartao', async () => {
    await criarCartao();
    await registrarLancamento(
      {
        descricao: 'Livraria',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -80,
        itens: [],
        contaId: 'cartao1',
      },
      Locais.padrao,
    );
    const [fatura] = await listFaturas('cartao1');
    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-10');

    const tudo = await buscarTransacoes();
    assert.ok(tudo.some((transacao) => transacao.descricao === 'Livraria'));

    // No cartao aparecem a compra e o pagamento que a quitou.
    const doCartao = await buscarTransacoes({ contaId: 'cartao1' });
    assert.deepEqual(doCartao.map((transacao) => transacao.natureza).sort(), [
      'compra_cartao',
      'pagamento_fatura',
    ]);
  });

  test('a busca mostra as parcelas, mas nao o registro da compra parcelada', async () => {
    await criarCartao();
    await registrarLancamento(
      {
        descricao: 'Monitor',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -100,
        itens: [],
        contaId: 'cartao1',
        parcelamento: { parcelas: 2, primeiraParcela: '2026-03-15' },
      },
      Locais.padrao,
    );

    const encontrados = await buscarTransacoes();

    assert.equal(encontrados.length, 2);
    assert.ok(encontrados.every((transacao) => transacao.natureza === 'compra_cartao'));
  });

  test('os planos no cartao trazem as cobrancas (antes vinham zeradas)', async () => {
    await criarCartao();
    const planoId = await criarAssinatura(
      {
        descricao: 'Streaming',
        empresaId: null,
        valorParcela: -40,
        dataInicio: '2026-01-10',
        frequencia: 'mensal',
        intervalo: 1,
        contaId: 'cartao1',
      },
      '2026-03-31',
    );

    const cobrancas = (await listCobrancasDePlanos()).filter(
      (cobranca) => cobranca.plano_id === planoId,
    );

    assert.equal(cobrancas.length, 3);
    assert.ok(cobrancas.every((cobranca) => cobranca.natureza === 'compra_cartao'));
  });
});
