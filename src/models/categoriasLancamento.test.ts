import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import {
  definirCategoriaTransacao,
  deleteCategoriaLancamento,
  insertCategoriaLancamento,
  listCategoriasLancamento,
  ultimaCategoriaPorEmpresa,
} from './categoriasLancamento';
import { insertEmpresa } from './empresas';
import { insertItemTransacao } from './itensTransacao';
import { criarCompraParcelada } from './materializacaoPlanos';
import { listPlanos } from './planosPagamento';
import {
  buscarTransacoes,
  insertTransacao,
  listTransacoes,
  SEM_CATEGORIA,
  type Transacoes,
} from './transacoesModel';

const lancar = async (
  id: string,
  valor: number,
  data: string,
  extra: Partial<Transacoes> = {},
): Promise<void> =>
  insertTransacao({ id, descricao: id, valor, data, created_at: AGORA, ...extra });

beforeEach(async () => {
  await prepararBanco();
});

describe('categorias de lancamento', () => {
  test('o banco novo ja vem com as categorias padrao, saidas antes das entradas', async () => {
    const categorias = await listCategoriasLancamento();
    const ids = categorias.map((categoria) => categoria.id);

    assert.ok(ids.includes('mercado'));
    assert.ok(ids.includes('salario'));
    assert.ok(ids.indexOf('outros') < ids.indexOf('salario'));
  });

  test('categoria nova entra no fim do proprio tipo', async () => {
    await insertCategoriaLancamento({
      id: 'pet',
      nome: 'Pet',
      icone: 'paw-outline',
      cor: 'verde',
      tipo: 'saida',
      created_at: AGORA,
    });

    const saidas = (await listCategoriasLancamento()).filter((item) => item.tipo === 'saida');
    assert.equal(saidas[saidas.length - 1].id, 'pet');
  });

  test('excluir a categoria deixa os lancamentos sem categoria', async () => {
    await lancar('cinema', -40, '2026-01-10', { categoria_id: 'lazer' });

    await deleteCategoriaLancamento('lazer');

    assert.equal((await listTransacoes())[0].categoria_id, null);
  });

  test('categorizar uma parcela categoriza o plano e todas as parcelas', async () => {
    await criarCompraParcelada({
      descricao: 'Geladeira',
      empresaId: null,
      valorTotal: -300,
      dataCompra: '2026-01-10',
      parcelas: 3,
      primeiraParcela: '2026-01-10',
    });

    const [parcela] = (await listTransacoes('2026-01-01', '2026-01-31')).filter(
      (transacao) => transacao.parcela_numero === 1,
    );
    await definirCategoriaTransacao(parcela.id, 'compras');

    const [plano] = await listPlanos();
    assert.equal(plano.categoria_id, 'compras');

    const doPlano = (await listTransacoes('2026-01-01', '2026-12-31')).filter(
      (transacao) => transacao.plano_id === plano.id,
    );
    assert.ok(doPlano.length >= 3);
    assert.ok(doPlano.every((transacao) => transacao.categoria_id === 'compras'));
  });

  test('sugere a categoria do lancamento mais recente de cada empresa', async () => {
    await insertEmpresa({ id: 'posto', nome: 'Posto', created_at: AGORA });
    await lancar('antigo', -100, '2026-01-01', {
      empresa_id: 'posto',
      categoria_id: 'outros',
      created_at: '2026-01-01T10:00:00.000Z',
    });
    await lancar('recente', -100, '2026-01-05', {
      empresa_id: 'posto',
      categoria_id: 'transporte',
      created_at: '2026-01-05T10:00:00.000Z',
    });

    assert.equal((await ultimaCategoriaPorEmpresa()).get('posto'), 'transporte');
  });
});

describe('buscarTransacoes', () => {
  beforeEach(async () => {
    await insertEmpresa({ id: 'm1', nome: 'Mercado', created_at: AGORA });
    await lancar('mercado', -80, '2026-01-10', { empresa_id: 'm1', categoria_id: 'mercado' });
    await lancar('uber', -25, '2026-02-03T18:30:00', { categoria_id: 'transporte' });
    await lancar('salario', 3000, '2026-02-05', { categoria_id: 'salario' });
    await lancar('avulso', -10, '2026-03-01');
    await insertItemTransacao({
      id: 'i1',
      transacao_id: 'mercado',
      descricao: 'Feijão carioca',
      valor: 8,
      quantidade: 1,
      created_at: AGORA,
    });
  });

  const ids = (lista: Transacoes[]): string[] => lista.map((transacao) => transacao.id);

  test('sem filtros traz tudo, do mais recente para o mais antigo, sem limite', async () => {
    assert.deepEqual(ids(await buscarTransacoes()), ['avulso', 'salario', 'uber', 'mercado']);
  });

  test('periodo inclui os lancamentos com hora no ultimo dia', async () => {
    assert.deepEqual(ids(await buscarTransacoes({ inicio: '2026-02-01', fim: '2026-02-03' })), [
      'uber',
    ]);
  });

  test('filtra por categoria, sem categoria, empresa e tipo', async () => {
    assert.deepEqual(ids(await buscarTransacoes({ categoriaId: 'transporte' })), ['uber']);
    assert.deepEqual(ids(await buscarTransacoes({ categoriaId: SEM_CATEGORIA })), ['avulso']);
    assert.deepEqual(ids(await buscarTransacoes({ empresaId: 'm1' })), ['mercado']);
    assert.deepEqual(ids(await buscarTransacoes({ tipo: 'entrada' })), ['salario']);
  });

  test('traz o texto dos itens para a busca por item', async () => {
    const [mercado] = await buscarTransacoes({ empresaId: 'm1' });
    assert.equal(mercado.itens_texto, 'Feijão carioca');
  });
});
