import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import type { Conta } from './contas';
import { insertConta, saldoDaConta } from './contas';
import { getConnection } from './database';
import { faturaDaCompra } from '../utils/cartao';
import { FaturaError, garantirFatura, listFaturas, pagarFatura, totalDaFatura } from './faturas';
import { type DadosLancamento, registrarLancamento } from './lancamentos';
import { excluirTransacao, restaurarTransacao } from './transacoesModel';

beforeEach(async () => {
  await prepararBanco();
});

const contaBase = (parcial: Partial<Conta>): Conta => ({
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

const criarCartao = async (): Promise<void> => {
  await insertConta(
    contaBase({
      id: 'cartao1',
      nome: 'Visa',
      tipo: 'cartao',
      dia_fechamento: 30,
      dia_vencimento: 10,
    }),
  );
};

describe('garantirFatura', () => {
  test('cria a fatura do ciclo uma unica vez (idempotente)', async () => {
    await criarCartao();
    const ciclo = faturaDaCompra('2026-03-15', 30, 10);

    const primeira = await garantirFatura('cartao1', ciclo);
    const segunda = await garantirFatura('cartao1', ciclo);

    assert.equal(primeira.id, segunda.id);

    const faturas = await listFaturas('cartao1');
    assert.equal(faturas.length, 1);
    assert.equal(faturas[0].mes_ref, '2026-03');
    assert.equal(faturas[0].paga, 0);
    assert.equal(faturas[0].data_fechamento, '2026-03-30');
    assert.equal(faturas[0].data_vencimento, '2026-04-10');
  });

  test('ciclos diferentes viram faturas diferentes', async () => {
    await criarCartao();

    await garantirFatura('cartao1', faturaDaCompra('2026-03-15', 30, 10));
    await garantirFatura('cartao1', faturaDaCompra('2026-04-15', 30, 10));

    assert.equal((await listFaturas('cartao1')).length, 2);
  });
});

describe('lancamento no cartao', () => {
  test('compra cai na fatura do ciclo certo, fora do caixa', async () => {
    await criarCartao();

    // Fechamento dia 30: compra de 15/03 fecha em marco; compra de 31/03 fecha em abril.
    await registrarLancamento(
      {
        descricao: 'Mercado',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -100,
        itens: [],
        contaId: 'cartao1',
      },
      1,
    );
    await registrarLancamento(
      {
        descricao: 'Farmácia',
        data: '2026-03-31',
        empresaId: null,
        categoriaId: null,
        valor: -50,
        itens: [],
        contaId: 'cartao1',
      },
      1,
    );

    const faturas = await listFaturas('cartao1');
    assert.deepEqual(
      faturas.map((fatura) => [fatura.mes_ref, fatura.total]),
      [
        ['2026-04', -50],
        ['2026-03', -100],
      ],
    );

    // O caixa nao sente a compra; a divida do cartao e a soma das duas.
    assert.equal(await saldoDaConta('caixa-padrao'), 0);
    assert.equal(await saldoDaConta('cartao1'), -150);

    // A transacao da compra fica fora do fluxo de caixa e presa a fatura.
    const db = await getConnection();
    const compra = await db.getFirstAsync<{
      contabilizado_saldo: number;
      fatura_id: string | null;
    }>(
      `SELECT contabilizado_saldo, fatura_id
       FROM transacoes
       WHERE descricao = 'Mercado'`,
    );
    assert.equal(compra?.contabilizado_saldo, 0);
    assert.ok(compra?.fatura_id);
  });

  test('lancamento sem conta vai para a caixa padrao contabilizada', async () => {
    await registrarLancamento(
      {
        descricao: 'Salário',
        data: '2026-03-01',
        empresaId: null,
        categoriaId: null,
        valor: 3000,
        itens: [],
      },
      1,
    );

    assert.equal(await saldoDaConta('caixa-padrao'), 3000);
  });
});

describe('pagarFatura', () => {
  test('grava o pagamento em transacao e marca a fatura como paga', async () => {
    await criarCartao();
    await insertConta(contaBase({ id: 'conta1', nome: 'Conta corrente' }));

    await registrarLancamento(
      {
        descricao: 'Mercado',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -100,
        itens: [],
        contaId: 'cartao1',
      },
      1,
    );

    const [fatura] = await listFaturas('cartao1');
    assert.equal(await totalDaFatura(fatura.id), -100);

    await pagarFatura(fatura.id, 'conta1', '2026-04-05');

    const depois = await listFaturas('cartao1');
    assert.equal(depois[0].paga, 1);

    // Saiu da conta pagante e quitou a divida do cartao.
    assert.equal(await saldoDaConta('conta1'), -100);
    assert.equal(await saldoDaConta('cartao1'), 0);
  });

  test('pagamento e marcacao de paga acontecem juntos ou nada acontece', async () => {
    await criarCartao();
    await registrarLancamento(
      {
        descricao: 'Mercado',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -100,
        itens: [],
        contaId: 'cartao1',
      },
      1,
    );

    const [fatura] = await listFaturas('cartao1');

    await assert.rejects(() => pagarFatura(fatura.id, 'conta-inexistente', '2026-04-05'));

    // A fatura continua aberta e nenhum pagamento foi gravado.
    const depois = await listFaturas('cartao1');
    assert.equal(depois[0].paga, 0);
    const db = await getConnection();
    const pagamentos = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM transacoes WHERE fatura_id = ? AND conta_destino_id IS NOT NULL`,
      [fatura.id],
    );
    assert.equal(pagamentos?.total, 0);
  });

  test('fatura ja paga nao gera outro pagamento (idempotente)', async () => {
    await criarCartao();
    await registrarLancamento(
      {
        descricao: 'Mercado',
        data: '2026-03-15',
        empresaId: null,
        categoriaId: null,
        valor: -100,
        itens: [],
        contaId: 'cartao1',
      },
      1,
    );

    const [fatura] = await listFaturas('cartao1');
    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-05');
    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-06');

    const db = await getConnection();
    const pagamentos = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM transacoes WHERE fatura_id = ? AND conta_destino_id IS NOT NULL`,
      [fatura.id],
    );
    assert.equal(pagamentos?.total, 1);
  });

  test('fatura sem compras recusa o pagamento', async () => {
    await criarCartao();
    const fatura = await garantirFatura('cartao1', faturaDaCompra('2026-03-15', 30, 10));

    await assert.rejects(() => pagarFatura(fatura.id, 'caixa-padrao', '2026-04-05'), FaturaError);
  });
});

describe('compra retroativa e exclusao do pagamento', () => {
  const compraNoCartao = (descricao: string, valor: number, data: string): DadosLancamento => ({
    descricao,
    data,
    empresaId: null,
    categoriaId: null,
    valor,
    itens: [],
    contaId: 'cartao1',
  });

  test('compra lancada depois reabre a fatura paga; o novo pagamento cobre so a diferenca', async () => {
    await criarCartao();
    await registrarLancamento(compraNoCartao('Mercado', -100, '2026-03-15'), 1);

    const [fatura] = await listFaturas('cartao1');
    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-05');
    assert.equal((await listFaturas('cartao1'))[0].paga, 1);

    // Lancada so agora, mas a data e do ciclo ja pago.
    await registrarLancamento(compraNoCartao('Farmácia', -30, '2026-03-20'), 1);

    const reaberta = (await listFaturas('cartao1'))[0];
    assert.equal(reaberta.id, fatura.id);
    assert.equal(reaberta.paga, 0);
    assert.equal(reaberta.total, -130);
    assert.equal(reaberta.restante, -30);

    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-08');

    const quitada = (await listFaturas('cartao1'))[0];
    assert.equal(quitada.paga, 1);
    assert.equal(quitada.restante, 0);
    assert.equal(await saldoDaConta('cartao1'), 0);
    assert.equal(await saldoDaConta('caixa-padrao', '2026-04-30'), -130);

    const db = await getConnection();
    const complemento = await db.getFirstAsync<{ valor: number; descricao: string }>(
      `SELECT valor, descricao FROM transacoes WHERE data = '2026-04-08'`,
    );
    assert.equal(complemento?.valor, -30);
    assert.match(complemento?.descricao ?? '', /complemento/);
  });

  test('excluir o pagamento reabre a fatura; desfazer fecha de novo', async () => {
    await criarCartao();
    await registrarLancamento(compraNoCartao('Mercado', -100, '2026-03-15'), 1);

    const [fatura] = await listFaturas('cartao1');
    await pagarFatura(fatura.id, 'caixa-padrao', '2026-04-05');

    const db = await getConnection();
    const pagamento = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM transacoes WHERE natureza = 'pagamento_fatura'`,
    );
    assert.ok(pagamento);

    const excluida = await excluirTransacao(pagamento.id);
    assert.ok(excluida);

    const reaberta = (await listFaturas('cartao1'))[0];
    assert.equal(reaberta.paga, 0);
    assert.equal(reaberta.restante, -100);

    await restaurarTransacao(excluida);
    assert.equal((await listFaturas('cartao1'))[0].paga, 1);
  });
});
