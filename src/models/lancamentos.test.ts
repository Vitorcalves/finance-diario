import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { type Conta, insertConta, saldoDaConta } from './contas';
import { listFaturas, pagarFatura, totalDaFatura } from './faturas';
import { registrarLancamento, type DadosLancamento } from './lancamentos';
import { listTransacoes, excluirTransacao } from './transacoesModel';
import { Locais } from '../utils/local';

const cartao = (): Conta => ({
  id: 'cartao1',
  nome: 'Cartão',
  tipo: 'cartao',
  dia_fechamento: 10,
  dia_vencimento: 20,
  meta_valor: null,
  saldo_inicial: 0,
  cor: null,
  ativo: 1,
  ordem: 0,
  created_at: '2026-01-01T00:00:00.000Z',
});

/** Compra de R$ 100 em 3x no cartao que fecha dia 10 (vence dia 20). */
const compraParceladaNoCartao: DadosLancamento = {
  descricao: 'Monitor',
  data: '2026-11-05',
  empresaId: null,
  categoriaId: null,
  valor: -100,
  itens: [],
  parcelamento: { parcelas: 3, primeiraParcela: '2026-11-05' },
  contaId: 'cartao1',
};

/** Dinheiro em centavos inteiros, sem ruido de ponto flutuante (`+ 0` troca -0 por 0). */
const centavos = (valor: number): number => Math.round(valor * 100) + 0;

beforeEach(async () => {
  await prepararBanco();
});

describe('registrarLancamento — compra parcelada no cartao', () => {
  test('a divida do cartao e o valor da compra, nao o dobro', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    // So as parcelas pesam: a parcela 0 guarda os itens, fora de qualquer saldo.
    assert.equal(centavos(await saldoDaConta('cartao1')), -10000);
  });

  test('pagar as tres faturas zera a divida e tira R$ 100 do caixa', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    for (const fatura of await listFaturas('cartao1')) {
      await pagarFatura(fatura.id, 'caixa-padrao', fatura.data_vencimento);
    }

    assert.equal(centavos(await saldoDaConta('cartao1')), 0);
    assert.equal(centavos(await saldoDaConta('caixa-padrao', '2027-01-31')), -10000);
  });

  test('cria uma fatura por ciclo, na data de cada parcela', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const faturas = await listFaturas('cartao1');

    assert.deepEqual(faturas.map((fatura) => fatura.mes_ref).sort(), [
      '2026-11',
      '2026-12',
      '2027-01',
    ]);

    // Fechamento dia 10, vencimento dia 20: o vencimento e no mesmo mes do ciclo.
    const dezembro = faturas.find((fatura) => fatura.mes_ref === '2026-12');
    assert.equal(dezembro?.data_fechamento, '2026-12-10');
    assert.equal(dezembro?.data_vencimento, '2026-12-20');
  });

  test('cada parcela fica fora do caixa, presa a fatura do proprio ciclo', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const faturas = await listFaturas('cartao1');
    const faturaPorMes = new Map(faturas.map((fatura) => [fatura.mes_ref, fatura.id]));

    const gastos = await listTransacoes('2026-11-01', '2027-01-31', { fluxoGastos: true });
    const parcelas = gastos.filter((transacao) => transacao.plano_id !== null);

    assert.equal(parcelas.length, 3);
    for (const parcela of parcelas) {
      assert.equal(parcela.contabilizado_saldo, 0);
      assert.equal(parcela.conta_id, 'cartao1');
      assert.equal(parcela.fatura_id, faturaPorMes.get(parcela.data.slice(0, 7)));
    }
  });

  test('totalDaFatura soma so as parcelas do proprio ciclo', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const faturas = await listFaturas('cartao1');
    const gastos = await listTransacoes('2026-11-01', '2027-01-31', { fluxoGastos: true });
    const parcelas = gastos.filter((transacao) => transacao.plano_id !== null);

    for (const fatura of faturas) {
      const doCiclo = parcelas
        .filter((parcela) => parcela.data.slice(0, 7) === fatura.mes_ref)
        .reduce((soma, parcela) => soma + parcela.valor, 0);

      assert.equal(await totalDaFatura(fatura.id), doCiclo);
    }
  });

  test('pagar a fatura de 12/2026 sai da conta pagante e reduz a divida', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const dezembro = (await listFaturas('cartao1')).find((fatura) => fatura.mes_ref === '2026-12');
    assert.ok(dezembro);

    const parcela = (await listTransacoes('2026-12-01', '2026-12-31', { fluxoGastos: true })).find(
      (transacao) => transacao.plano_id !== null,
    );
    assert.ok(parcela);

    await pagarFatura(dezembro.id, 'caixa-padrao', '2026-12-20');

    // O caixa pagante sai na data do pagamento; o cartao quita so a parcela
    // daquele ciclo e continua devendo as outras duas.
    assert.equal(await saldoDaConta('caixa-padrao', '2026-12-31'), parcela.valor);
    assert.equal(centavos(await saldoDaConta('cartao1')), centavos(-100 - parcela.valor));
  });

  test('fluxo de gastos inclui a parcela do cartao e exclui o pagamento da fatura', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const dezembro = (await listFaturas('cartao1')).find((fatura) => fatura.mes_ref === '2026-12');
    assert.ok(dezembro);
    await pagarFatura(dezembro.id, 'caixa-padrao', '2026-12-20');

    const gastos = await listTransacoes('2026-12-01', '2026-12-31', { fluxoGastos: true });

    assert.ok(gastos.some((transacao) => transacao.data === '2026-12-05'));
    assert.ok(!gastos.some((transacao) => transacao.descricao.startsWith('Pagamento fatura')));
  });

  test('excluir uma parcela pelo feed corrige o total da fatura', async () => {
    await insertConta(cartao());

    await registrarLancamento(compraParceladaNoCartao, Locais.padrao);

    const gastos = await listTransacoes('2026-11-01', '2027-01-31', { fluxoGastos: true });
    const parcelaDeDezembro = gastos.find((transacao) => transacao.data === '2026-12-05');
    assert.ok(parcelaDeDezembro?.fatura_id);

    await excluirTransacao(parcelaDeDezembro.id);

    assert.equal(Math.round((await totalDaFatura(parcelaDeDezembro.fatura_id)) * 100), 0);
  });
});
