import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import type { Conta } from './contas';
import { insertConta, saldoDaConta } from './contas';
import { getConnection } from './database';
import { registrarLancamento } from './lancamentos';

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

const transferir = (contaId: string, contaDestinoId: string, valor: number): Promise<void> =>
  registrarLancamento(
    {
      descricao: 'Transferência de teste',
      data: '2026-03-10',
      empresaId: null,
      categoriaId: null,
      valor,
      itens: [],
      contaId,
      contaDestinoId,
    },
    1,
  );

describe('transferencia entre contas', () => {
  test('aporte caixa -> reserva: uma linha so, saldo desce na origem e sobe no destino', async () => {
    await insertConta(contaBase({ id: 'caixa1', saldo_inicial: 1000 }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));

    await transferir('caixa1', 'reserva1', 200);

    assert.equal(await saldoDaConta('caixa1'), 800);
    assert.equal(await saldoDaConta('reserva1'), 200);

    const db = await getConnection();
    const transacoes = await db.getAllAsync<{
      conta_id: string;
      conta_destino_id: string;
      valor: number;
      contabilizado_saldo: number;
    }>(
      `SELECT conta_id, conta_destino_id, valor, contabilizado_saldo
       FROM transacoes
       WHERE conta_destino_id IS NOT NULL`,
    );
    assert.equal(transacoes.length, 1);
    assert.equal(transacoes[0].conta_id, 'caixa1');
    assert.equal(transacoes[0].conta_destino_id, 'reserva1');
    assert.equal(transacoes[0].valor, -200);
    assert.equal(transacoes[0].contabilizado_saldo, 1);
  });

  test('resgate reserva -> caixa inverte as pontas', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva', saldo_inicial: 500 }));

    await transferir('reserva1', 'caixa1', 150);

    assert.equal(await saldoDaConta('reserva1'), 350);
    assert.equal(await saldoDaConta('caixa1'), 150);
  });

  test('valor positivo e gravado negativo na origem', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva' }));

    await transferir('caixa1', 'reserva1', 300);

    assert.equal(await saldoDaConta('reserva1'), 300);
  });

  test('resgate sem saldo suficiente e permitido: o caixa fica negativo', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));
    await insertConta(contaBase({ id: 'reserva1', tipo: 'reserva', saldo_inicial: 1000 }));

    await transferir('reserva1', 'caixa1', 400);

    assert.equal(await saldoDaConta('reserva1'), 600);
    assert.equal(await saldoDaConta('caixa1'), 400);
    // E o avesso tambem: aporte maior que o caixa deixa ele negativo.
    await transferir('caixa1', 'reserva1', 900);
    assert.equal(await saldoDaConta('caixa1'), -500);
    assert.equal(await saldoDaConta('reserva1'), 1500);
  });

  test('origem igual ao destino recusado', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));

    await assert.rejects(() => transferir('caixa1', 'caixa1', 100), /diferentes/);
  });

  test('transferencia para conta inexistente nao grava nada', async () => {
    await insertConta(contaBase({ id: 'caixa1' }));

    await assert.rejects(() => transferir('caixa1', 'não-existe', 100));

    assert.equal(await saldoDaConta('caixa1'), 0);
    const db = await getConnection();
    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM transacoes',
    );
    assert.equal(total?.total, 0);
  });
});
