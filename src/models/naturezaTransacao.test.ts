import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { Locais } from '../utils/local';
import { type Conta, CONTA_CAIXA_PADRAO, getContaById, insertConta } from './contas';
import { getConnection } from './database';
import { garantirFatura, listFaturas, pagarFatura } from './faturas';
import { type DadosLancamento, registrarLancamento } from './lancamentos';
import { criarAssinatura } from './materializacaoPlanos';
import {
  derivarNaturezaTransacoes,
  garantirCaixaPadrao,
} from './migrations/015_natureza_transacao';
import { contabilizadoDe, type NaturezaTransacao } from './naturezaTransacao';

beforeEach(async () => {
  await prepararBanco();
});

const conta = (parcial: Partial<Conta>): Conta => ({
  id: 'x',
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
  ...parcial,
});

const lancamento = (parcial: Partial<DadosLancamento>): DadosLancamento => ({
  descricao: 'Teste',
  data: '2026-03-15',
  empresaId: null,
  categoriaId: null,
  valor: -100,
  itens: [],
  ...parcial,
});

type Linha = {
  descricao: string;
  natureza: NaturezaTransacao;
  contabilizado_saldo: number;
  parcela_numero: number | null;
};

const linhas = async (): Promise<Linha[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Linha>(
    `SELECT descricao, natureza, contabilizado_saldo, parcela_numero
     FROM transacoes
     ORDER BY descricao, parcela_numero`,
  );
};

const naturezaDe = async (descricao: string): Promise<NaturezaTransacao[]> =>
  (await linhas())
    .filter((linha) => linha.descricao.startsWith(descricao))
    .map((linha) => linha.natureza);

describe('cada caminho de gravacao marca a natureza', () => {
  beforeEach(async () => {
    await insertConta(
      conta({
        id: 'cartao1',
        nome: 'Visa',
        tipo: 'cartao',
        dia_fechamento: 30,
        dia_vencimento: 10,
      }),
    );
    await insertConta(conta({ id: 'reserva1', nome: 'Reserva', tipo: 'reserva' }));
  });

  test('a vista no caixa e movimento; no cartao, compra no cartao', async () => {
    await registrarLancamento(lancamento({ descricao: 'Padaria' }), Locais.padrao);
    await registrarLancamento(
      lancamento({ descricao: 'Livraria', contaId: 'cartao1' }),
      Locais.padrao,
    );

    assert.deepEqual(await naturezaDe('Padaria'), ['movimento']);
    assert.deepEqual(await naturezaDe('Livraria'), ['compra_cartao']);
  });

  test('parcelado: a parcela 0 e registro; as parcelas seguem a conta', async () => {
    const parcelado = { parcelas: 2, primeiraParcela: '2026-03-15' };

    await registrarLancamento(
      lancamento({ descricao: 'Geladeira', parcelamento: parcelado }),
      Locais.padrao,
    );
    await registrarLancamento(
      lancamento({ descricao: 'Monitor', parcelamento: parcelado, contaId: 'cartao1' }),
      Locais.padrao,
    );

    assert.deepEqual(await naturezaDe('Geladeira'), ['registro_compra', 'movimento', 'movimento']);
    assert.deepEqual(await naturezaDe('Monitor'), [
      'registro_compra',
      'compra_cartao',
      'compra_cartao',
    ]);
  });

  test('transferencia, pagamento de fatura e salario', async () => {
    await registrarLancamento(
      lancamento({ descricao: 'Aporte', contaId: CONTA_CAIXA_PADRAO, contaDestinoId: 'reserva1' }),
      Locais.padrao,
    );
    await registrarLancamento(
      lancamento({ descricao: 'Livraria', contaId: 'cartao1' }),
      Locais.padrao,
    );
    const [fatura] = await listFaturas('cartao1');
    await pagarFatura(fatura.id, CONTA_CAIXA_PADRAO, '2026-04-10');
    await criarAssinatura(
      {
        descricao: 'Salário',
        empresaId: null,
        valorParcela: 3000,
        dataInicio: '2026-03-05',
        frequencia: 'mensal',
        intervalo: 1,
        contaDestinoId: CONTA_CAIXA_PADRAO,
      },
      '2026-03-31',
    );

    assert.deepEqual(await naturezaDe('Aporte'), ['transferencia']);
    assert.deepEqual(await naturezaDe('Pagamento fatura'), ['pagamento_fatura']);
    assert.deepEqual(await naturezaDe('Salário'), ['movimento']);
  });

  test('o contabilizado_saldo legado acompanha a natureza em toda linha gravada', async () => {
    await registrarLancamento(lancamento({ descricao: 'Padaria' }), Locais.padrao);
    await registrarLancamento(
      lancamento({
        descricao: 'Monitor',
        contaId: 'cartao1',
        parcelamento: { parcelas: 2, primeiraParcela: '2026-03-15' },
      }),
      Locais.padrao,
    );
    await registrarLancamento(
      lancamento({ descricao: 'Aporte', contaId: CONTA_CAIXA_PADRAO, contaDestinoId: 'reserva1' }),
      Locais.padrao,
    );

    for (const linha of await linhas()) {
      assert.equal(linha.contabilizado_saldo, contabilizadoDe(linha.natureza), linha.descricao);
    }
  });
});

describe('derivarNaturezaTransacoes (migration 015 e backup antigo)', () => {
  test('classifica as linhas antigas pelos campos que a natureza substitui', async () => {
    await insertConta(
      conta({ id: 'cartao1', tipo: 'cartao', dia_fechamento: 30, dia_vencimento: 10 }),
    );
    await insertConta(conta({ id: 'reserva1', tipo: 'reserva' }));
    const fatura = await garantirFatura('cartao1', {
      mesRef: '2026-03',
      dataFechamento: '2026-03-30',
      dataVencimento: '2026-04-10',
    });

    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO planos_pagamento (id, tipo, descricao, valor_parcela, data_inicio, created_at)
       VALUES ('p1', 'parcelamento', 'Geladeira', -50, '2026-03-10', 'x')`,
    );

    // Linhas como estavam antes da 015: todas com o default `movimento`.
    const antigas: [string, string | null, string | null, number | null, string | null][] = [
      // id, conta_id, conta_destino_id, parcela_numero, fatura_id
      ['avulso', CONTA_CAIXA_PADRAO, null, null, null],
      ['registro', CONTA_CAIXA_PADRAO, null, 0, null],
      ['parcela', CONTA_CAIXA_PADRAO, null, 1, null],
      ['cartao', 'cartao1', null, null, fatura.id],
      ['aporte', CONTA_CAIXA_PADRAO, 'reserva1', null, null],
      ['pagamento', CONTA_CAIXA_PADRAO, 'cartao1', null, fatura.id],
    ];

    for (const [id, contaId, destino, parcela, faturaId] of antigas) {
      await db.runAsync(
        `INSERT INTO transacoes (id, descricao, valor, data, conta_id, conta_destino_id,
                                 plano_id, parcela_numero, fatura_id, contabilizado_saldo,
                                 created_at)
         VALUES (?, ?, -50, '2026-03-10', ?, ?, ?, ?, ?, 1, 'x')`,
        [id, id, contaId, destino, parcela === null ? null : 'p1', parcela, faturaId],
      );
    }

    await derivarNaturezaTransacoes(db);

    const depois = await db.getAllAsync<{
      id: string;
      natureza: NaturezaTransacao;
      contabilizado_saldo: number;
    }>('SELECT id, natureza, contabilizado_saldo FROM transacoes');
    const porId = new Map(depois.map((linha) => [linha.id, linha]));

    assert.equal(porId.get('avulso')?.natureza, 'movimento');
    assert.equal(porId.get('registro')?.natureza, 'registro_compra');
    assert.equal(porId.get('parcela')?.natureza, 'movimento');
    assert.equal(porId.get('cartao')?.natureza, 'compra_cartao');
    assert.equal(porId.get('aporte')?.natureza, 'transferencia');
    assert.equal(porId.get('pagamento')?.natureza, 'pagamento_fatura');

    // O legado fica coerente: so o que esta fora do caixa vai a 0.
    assert.equal(porId.get('registro')?.contabilizado_saldo, 0);
    assert.equal(porId.get('cartao')?.contabilizado_saldo, 0);
    assert.equal(porId.get('avulso')?.contabilizado_saldo, 1);
  });
});

describe('garantirCaixaPadrao (migration 015)', () => {
  test('recria o caixa padrao excluido e devolve a ele os lancamentos sem conta', async () => {
    const db = await getConnection();
    await db.runAsync(`DELETE FROM contas WHERE id = ?`, [CONTA_CAIXA_PADRAO]);
    await db.runAsync(
      `INSERT INTO transacoes (id, descricao, valor, data, created_at)
       VALUES ('orfa', 'Sem conta', -10, '2026-03-10', 'x')`,
    );

    await garantirCaixaPadrao(db);

    const caixa = await getContaById(CONTA_CAIXA_PADRAO);
    assert.equal(caixa?.tipo, 'caixa');
    assert.equal(caixa?.ativo, 1);

    const orfa = await db.getFirstAsync<{ conta_id: string | null }>(
      `SELECT conta_id FROM transacoes WHERE id = 'orfa'`,
    );
    assert.equal(orfa?.conta_id, CONTA_CAIXA_PADRAO);
  });

  test('reativa o caixa padrao que tinha sido inativado', async () => {
    const db = await getConnection();
    await db.runAsync(`UPDATE contas SET ativo = 0 WHERE id = ?`, [CONTA_CAIXA_PADRAO]);

    await garantirCaixaPadrao(db);

    assert.equal((await getContaById(CONTA_CAIXA_PADRAO))?.ativo, 1);
  });
});
