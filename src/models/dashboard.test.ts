import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import {
  listHistoricoPorProduto,
  listPrecosPagosPorProduto,
  listProdutosComMovimento,
} from './dashboard';
import { insertHistoricoPreco } from './historicoPreco';
import { insertItemTransacao } from './itensTransacao';
import { insertProduto } from './produtos';
import { insertProdutoVariantes } from './produtoVariantes';
import { insertTransacao } from './transacoesModel';

const criarProduto = async (id: string, nome: string): Promise<void> => {
  await insertProduto({ id, nome, preco: 0, unidade_id: null, created_at: AGORA });
  await insertProdutoVariantes({
    id: `${id}-v1`,
    produto_id: id,
    marca_id: null,
    unidade_id: null,
    quantidade: null,
    codigo_barras: null,
    preco: 0,
    created_at: AGORA,
  });
};

const criarCompra = async (params: {
  transacaoId: string;
  produtoId: string;
  data: string;
  preco: number;
  quantidade?: number;
  empresaId?: string | null;
  local?: number;
}): Promise<void> => {
  await insertTransacao({
    id: params.transacaoId,
    descricao: 'Compra',
    valor: params.preco,
    data: params.data,
    empresa_id: params.empresaId ?? null,
    local: params.local,
    created_at: AGORA,
  });
  await insertItemTransacao({
    id: `${params.transacaoId}-item`,
    transacao_id: params.transacaoId,
    produto_id: params.produtoId,
    variante_id: `${params.produtoId}-v1`,
    descricao: 'Item',
    valor: params.preco,
    quantidade: params.quantidade ?? 1,
    created_at: AGORA,
  });
};

beforeEach(async () => {
  await prepararBanco();
});

describe('listPrecosPagosPorProduto', () => {
  test('cruza o item com a data, empresa e local da transacao, em ordem cronologica', async () => {
    await criarProduto('arroz', 'Arroz');
    await criarCompra({
      transacaoId: 't2',
      produtoId: 'arroz',
      data: '2026-02-10',
      preco: 24.9,
      local: 2,
    });
    await criarCompra({
      transacaoId: 't1',
      produtoId: 'arroz',
      data: '2026-01-05',
      preco: 22.5,
      quantidade: 2,
    });

    const pagos = await listPrecosPagosPorProduto('arroz');

    assert.deepEqual(
      pagos.map((pago) => [pago.data, pago.preco, pago.quantidade, pago.local]),
      [
        ['2026-01-05', 22.5, 2, 1],
        ['2026-02-10', 24.9, 1, 2],
      ],
    );
    assert.equal(pagos[0].transacao_id, 't1');
    assert.equal(pagos[0].variante_id, 'arroz-v1');
  });

  test('nao mistura produtos', async () => {
    await criarProduto('arroz', 'Arroz');
    await criarProduto('feijao', 'Feijao');
    await criarCompra({ transacaoId: 't1', produtoId: 'arroz', data: '2026-01-05', preco: 20 });
    await criarCompra({ transacaoId: 't2', produtoId: 'feijao', data: '2026-01-05', preco: 9 });

    const pagos = await listPrecosPagosPorProduto('feijao');

    assert.equal(pagos.length, 1);
    assert.equal(pagos[0].preco, 9);
  });
});

describe('listHistoricoPorProduto', () => {
  test('devolve so a data (sem hora), do mais antigo ao mais recente', async () => {
    await criarProduto('arroz', 'Arroz');
    await insertHistoricoPreco({
      id: 'h2',
      produto_id: 'arroz',
      variante_id: 'arroz-v1',
      empresa_id: null,
      preco: 25,
      data: '2026-03-01T15:30:00',
      local: 1,
      created_at: AGORA,
    });
    await insertHistoricoPreco({
      id: 'h1',
      produto_id: 'arroz',
      variante_id: 'arroz-v1',
      empresa_id: null,
      preco: 23,
      data: '2026-01-20T09:00:00',
      local: 1,
      created_at: AGORA,
    });

    const historico = await listHistoricoPorProduto('arroz');

    assert.deepEqual(
      historico.map((registro) => [registro.id, registro.data, registro.preco]),
      [
        ['h1', '2026-01-20', 23],
        ['h2', '2026-03-01', 25],
      ],
    );
  });
});

describe('listProdutosComMovimento', () => {
  test('lista so produtos com compra ou historico, do mais movimentado ao menos', async () => {
    await criarProduto('arroz', 'Arroz');
    await criarProduto('feijao', 'Feijao');
    await criarProduto('sal', 'Sal');

    await criarCompra({ transacaoId: 't1', produtoId: 'feijao', data: '2026-01-05', preco: 9 });
    await criarCompra({ transacaoId: 't2', produtoId: 'feijao', data: '2026-01-06', preco: 9 });
    await insertHistoricoPreco({
      id: 'h1',
      produto_id: 'arroz',
      variante_id: 'arroz-v1',
      empresa_id: null,
      preco: 23,
      data: '2026-01-20',
      local: 1,
      created_at: AGORA,
    });

    const produtos = await listProdutosComMovimento();

    assert.deepEqual(
      produtos.map((produto) => [produto.id, produto.compras, produto.registros]),
      [
        ['feijao', 2, 0],
        ['arroz', 0, 1],
      ],
    );
  });
});
