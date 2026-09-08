import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import {
  cancelarPlano,
  criarAssinatura,
  criarCompraParcelada,
  materializarPlanos,
} from './materializacaoPlanos';
import { getPlanoById, listPlanosAtivos } from './planosPagamento';
import { listTransacoesByPlano, type Transacoes } from './transacoesModel';

/** Cobrancas do plano, sem a transacao da compra (parcela 0). */
const parcelasDo = async (planoId: string): Promise<Transacoes[]> =>
  (await listTransacoesByPlano(planoId)).filter((transacao) => transacao.parcela_numero !== 0);

const compraDo = async (planoId: string): Promise<Transacoes | undefined> =>
  (await listTransacoesByPlano(planoId)).find((transacao) => transacao.parcela_numero === 0);

beforeEach(async () => {
  await prepararBanco();
});

describe('criarCompraParcelada', () => {
  const dados = {
    descricao: 'Geladeira',
    empresaId: null,
    valorTotal: -100,
    dataCompra: '2026-01-10',
    parcelas: 3,
    primeiraParcela: '2026-01-31',
  };

  test('gera todas as parcelas de uma vez', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const parcelas = await parcelasDo(planoId);

    assert.equal(parcelas.length, 3);
    assert.deepEqual(
      parcelas.map((p) => p.parcela_numero).sort((a, b) => (a ?? 0) - (b ?? 0)),
      [1, 2, 3],
    );
  });

  test('a soma das parcelas fecha com o total da compra', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const soma = (await parcelasDo(planoId)).reduce((total, p) => total + p.valor, 0);

    assert.equal(Math.round(soma * 100), -10000);
  });

  test('as datas seguem a frequencia a partir da primeira parcela', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const datas = (await parcelasDo(planoId)).map((p) => p.data).sort((a, b) => a.localeCompare(b));

    assert.deepEqual(datas, ['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  test('a compra fica fora do caixa e guarda o valor cheio', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const compra = await compraDo(planoId);

    assert.equal(compra?.valor, -100);
    assert.equal(compra?.contabilizado_saldo, 0);
    assert.equal(compra?.data, '2026-01-10');
  });

  test('as parcelas contam no caixa', async () => {
    const { planoId } = await criarCompraParcelada(dados);

    for (const parcela of await parcelasDo(planoId)) {
      assert.equal(parcela.contabilizado_saldo, 1);
    }
  });

  test('a descricao numera a parcela', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const descricoes = (await parcelasDo(planoId))
      .sort((a, b) => (a.parcela_numero ?? 0) - (b.parcela_numero ?? 0))
      .map((p) => p.descricao);

    assert.deepEqual(descricoes, ['Geladeira (1/3)', 'Geladeira (2/3)', 'Geladeira (3/3)']);
  });

  test('o plano nasce fechado, com data_fim na ultima parcela', async () => {
    const { planoId } = await criarCompraParcelada(dados);
    const plano = await getPlanoById(planoId);

    assert.equal(plano?.tipo, 'parcelamento');
    assert.equal(plano?.total_parcelas, 3);
    assert.equal(plano?.data_fim, '2026-03-31');
    assert.equal(plano?.gerado_ate, '2026-03-31');
  });

  test('materializar de novo nao duplica as parcelas', async () => {
    const { planoId } = await criarCompraParcelada(dados);

    await materializarPlanos('2027-01-01');
    await materializarPlanos('2027-01-01');

    assert.equal((await parcelasDo(planoId)).length, 3);
  });
});

describe('criarAssinatura', () => {
  const dados = {
    descricao: 'Streaming',
    empresaId: null,
    valorParcela: -39.9,
    dataInicio: '2026-01-10',
    frequencia: 'mensal' as const,
    intervalo: 1,
  };

  test('materializa so ate o horizonte pedido', async () => {
    const planoId = await criarAssinatura(dados, '2026-03-31');
    const parcelas = await parcelasDo(planoId);

    assert.equal(parcelas.length, 3);
    assert.deepEqual(
      parcelas.map((p) => p.data).sort((a, b) => a.localeCompare(b)),
      ['2026-01-10', '2026-02-10', '2026-03-10'],
    );
  });

  test('nao tem total de parcelas nem valor total', async () => {
    const planoId = await criarAssinatura(dados, '2026-03-31');
    const plano = await getPlanoById(planoId);

    assert.equal(plano?.tipo, 'assinatura');
    assert.equal(plano?.total_parcelas, null);
    assert.equal(plano?.valor_total, null);
  });

  test('avancar o horizonte gera so as cobrancas novas', async () => {
    const planoId = await criarAssinatura(dados, '2026-03-31');

    const criadas = await materializarPlanos('2026-05-31');

    assert.equal(criadas, 2);
    assert.equal((await parcelasDo(planoId)).length, 5);
  });

  test('rodar duas vezes no mesmo horizonte nao cria nada', async () => {
    const planoId = await criarAssinatura(dados, '2026-03-31');

    assert.equal(await materializarPlanos('2026-03-31'), 0);
    assert.equal((await parcelasDo(planoId)).length, 3);
  });

  test('a numeracao das cobrancas continua de onde parou', async () => {
    const planoId = await criarAssinatura(dados, '2026-03-31');
    await materializarPlanos('2026-05-31');

    const numeros = (await parcelasDo(planoId))
      .map((p) => p.parcela_numero)
      .sort((a, b) => (a ?? 0) - (b ?? 0));

    assert.deepEqual(numeros, [1, 2, 3, 4, 5]);
  });

  test('a descricao numera a cobranca sem total', async () => {
    const planoId = await criarAssinatura(dados, '2026-02-28');
    const descricoes = (await parcelasDo(planoId)).map((p) => p.descricao).sort();

    assert.deepEqual(descricoes, ['Streaming (1a cobranca)', 'Streaming (2a cobranca)']);
  });

  test('assinatura com fim previsto para de gerar', async () => {
    const planoId = await criarAssinatura({ ...dados, dataFim: '2026-02-28' }, '2026-12-31');

    assert.equal((await parcelasDo(planoId)).length, 2);
  });

  test('frequencia anual gera uma cobranca por ano', async () => {
    const planoId = await criarAssinatura(
      { ...dados, frequencia: 'anual', dataInicio: '2026-01-10' },
      '2028-12-31',
    );

    assert.equal((await parcelasDo(planoId)).length, 3);
  });

  test('assinatura que ainda nao comecou nao gera nada', async () => {
    const planoId = await criarAssinatura({ ...dados, dataInicio: '2027-01-01' }, '2026-12-31');

    assert.equal((await parcelasDo(planoId)).length, 0);
  });
});

describe('cancelarPlano', () => {
  test('apaga as cobrancas futuras e mantem as passadas', async () => {
    const planoId = await criarAssinatura(
      {
        descricao: 'Streaming',
        empresaId: null,
        valorParcela: -39.9,
        dataInicio: '2026-01-10',
        frequencia: 'mensal',
        intervalo: 1,
      },
      '2026-05-31',
    );

    const plano = await getPlanoById(planoId);
    assert.ok(plano);

    await cancelarPlano(plano, '2026-03-15');
    const restantes = (await parcelasDo(planoId)).map((p) => p.data).sort();

    assert.deepEqual(restantes, ['2026-01-10', '2026-02-10', '2026-03-10']);
  });

  test('o plano sai da lista de ativos', async () => {
    const planoId = await criarAssinatura(
      {
        descricao: 'Streaming',
        empresaId: null,
        valorParcela: -39.9,
        dataInicio: '2026-01-10',
        frequencia: 'mensal',
        intervalo: 1,
      },
      '2026-05-31',
    );

    const plano = await getPlanoById(planoId);
    assert.ok(plano);
    await cancelarPlano(plano, '2026-03-15');

    assert.deepEqual(await listPlanosAtivos(), []);
    assert.equal((await getPlanoById(planoId))?.ativo, 0);
  });

  test('cancelado nao volta a gerar cobrancas', async () => {
    const planoId = await criarAssinatura(
      {
        descricao: 'Streaming',
        empresaId: null,
        valorParcela: -39.9,
        dataInicio: '2026-01-10',
        frequencia: 'mensal',
        intervalo: 1,
      },
      '2026-05-31',
    );

    const plano = await getPlanoById(planoId);
    assert.ok(plano);
    await cancelarPlano(plano, '2026-03-15');

    await materializarPlanos('2026-12-31');

    assert.equal((await parcelasDo(planoId)).length, 3);
  });
});
