import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, desfazerMigrationsDesde, prepararBanco } from '../../tests/setup/banco';
import { deleteCategoriaById, insertCategoria, listCategorias } from './categorias';
import {
  insertCategoria as insertCategoriaVinculo,
  listCategorias as listCategoriaVinculos,
} from './categoriasProduto';
import { listProdutosComMovimento } from './dashboard';
import { getConnection, initializeDatabase } from './database';
import {
  deleteEmpresaById,
  insertEmpresa,
  listCategoriasPorEmpresa,
  listEmpresas,
} from './empresas';
import { ativosPrimeiro, filtroDeAtivos, nomeComExclusao, somenteAtivos } from './exclusaoLogica';
import {
  insertHistoricoPreco,
  listHistoricoPreco,
  listHistoricoPrecoDeAtivos,
} from './historicoPreco';
import { insertItemTransacao, listItensTransacaoByTransacao } from './itensTransacao';
import {
  adicionarMercadoNaLista,
  insertItensListaCompras,
  listComprasDeProdutos,
  listCotacoesDaLista,
  listItensListaCompras,
  listMercadosDaLista,
  salvarCotacao,
} from './listaCompras';
import { deleteMarcaById, insertMarca, listMarcas } from './marcas';
import { migration020 } from './migrations/020_exclusao_logica';
import { deleteProdutoById, getProdutoById, insertProduto, listProdutos } from './produtos';
import {
  deleteProdutoVariantesById,
  getProdutoVariantesById,
  insertProdutoVariantes,
  listProdutoVariantes,
  listProdutoVariantesByProduto,
} from './produtoVariantes';
import { insertTransacao } from './transacoesModel';

/** Momento da exclusao, diferente do `AGORA` em que tudo foi criado. */
const DEPOIS = '2026-02-20T08:00:00.000Z';

const criarVariante = (id: string, produtoId: string, marcaId: number | null): Promise<void> =>
  insertProdutoVariantes({
    id,
    produto_id: produtoId,
    marca_id: marcaId,
    unidade_id: null,
    quantidade: null,
    codigo_barras: null,
    preco: 20,
    created_at: AGORA,
  });

const registrarPreco = (
  id: string,
  varianteId: string,
  empresaId: string | null,
  produtoId = 'arroz',
): Promise<void> =>
  insertHistoricoPreco({
    id,
    produto_id: produtoId,
    variante_id: varianteId,
    empresa_id: empresaId,
    preco: 20,
    data: '2026-01-10',
    local: 1,
    created_at: AGORA,
  });

/**
 * Arroz com duas variantes (`tio`, da marca Tio Joao, e `camil`, sem marca),
 * numa categoria, comprado uma vez no Mercado 1, com um preco de cada variante
 * no historico e um item na lista de compras cotado no Mercado 1.
 */
const semear = async (): Promise<{ marcaId: number }> => {
  await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA }, ['mercado']);
  await insertEmpresa({ id: 'm2', nome: 'Mercado 2', created_at: AGORA });
  await insertMarca({ nome: 'Tio Joao', created_at: AGORA });
  const marcaId = (await listMarcas())[0].id;
  await insertCategoria({ id: 'graos', nome: 'Graos', created_at: AGORA });

  await insertProduto({
    id: 'arroz',
    nome: 'Arroz',
    preco: 20,
    unidade_id: null,
    created_at: AGORA,
  });
  await criarVariante('tio', 'arroz', marcaId);
  await criarVariante('camil', 'arroz', null);
  await insertCategoriaVinculo({
    id: 'arroz-graos',
    categoria_id: 'graos',
    produto_id: 'arroz',
    created_at: AGORA,
  });

  await insertTransacao({
    id: 't1',
    descricao: 'Compra',
    valor: -20,
    data: '2026-01-10',
    empresa_id: 'm1',
    natureza: 'movimento',
    created_at: AGORA,
  });
  await insertItemTransacao({
    id: 'i1',
    transacao_id: 't1',
    produto_id: 'arroz',
    variante_id: 'tio',
    descricao: 'Arroz',
    valor: 20,
    quantidade: 1,
    created_at: AGORA,
  });

  await registrarPreco('h-tio', 'tio', 'm1');
  await registrarPreco('h-camil', 'camil', null);

  await insertItensListaCompras([
    {
      id: 'lista-arroz',
      produto_id: 'arroz',
      variante_id: 'tio',
      descricao: 'Arroz',
      quantidade: 1,
      created_at: AGORA,
    },
  ]);
  await adicionarMercadoNaLista('m1');
  await salvarCotacao({
    id: 'cot1',
    item_id: 'lista-arroz',
    empresa_id: 'm1',
    preco: 19,
    variante_id: 'tio',
    updated_at: AGORA,
  });

  return { marcaId };
};

const ids = <T extends { id: string | number }>(registros: T[]): (string | number)[] =>
  registros.map((registro) => registro.id).sort();

const contar = async (tabela: string): Promise<number> => {
  const db = await getConnection();
  const linha = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${tabela}`,
  );

  return linha?.total ?? 0;
};

beforeEach(async () => {
  await prepararBanco();
});

describe('excluir produto', () => {
  beforeEach(async () => {
    await semear();
  });

  test('sai da listagem, mas a linha fica com a data da exclusao', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(await listProdutos(), []);
    assert.deepEqual(
      (await listProdutos({ comExcluidos: true })).map((produto) => [
        produto.id,
        produto.deleted_at,
      ]),
      [['arroz', DEPOIS]],
    );
    assert.equal((await getProdutoById('arroz'))?.deleted_at, DEPOIS);
  });

  test('as variantes do produto sao excluidas junto', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(await listProdutoVariantes(), []);
    assert.deepEqual(
      (await listProdutoVariantes({ comExcluidos: true })).map((variante) => variante.deleted_at),
      [DEPOIS, DEPOIS],
    );
  });

  test('o historico de precos e o item do lancamento continuam ligados a ele', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(ids(await listHistoricoPreco()), ['h-camil', 'h-tio']);

    const [item] = await listItensTransacaoByTransacao('t1');
    assert.equal(item.produto_id, 'arroz');
    assert.equal(item.variante_id, 'tio');
  });

  test('o vinculo com a categoria continua no banco', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.equal(await contar('categoria_produto'), 1);
  });

  test('os itens dele saem da lista de compras, com as cotacoes', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(await listItensListaCompras(), []);
    assert.deepEqual(await listCotacoesDaLista(), []);
  });

  test('excluir de novo nao troca a data', async () => {
    await deleteProdutoById('arroz', DEPOIS);
    await deleteProdutoById('arroz', '2026-03-01T00:00:00.000Z');

    assert.equal((await getProdutoById('arroz'))?.deleted_at, DEPOIS);
    assert.equal((await getProdutoVariantesById('tio'))?.deleted_at, DEPOIS);
  });

  test('nao mexe na variante que ja estava excluida', async () => {
    await deleteProdutoVariantesById('camil', AGORA);
    await deleteProdutoById('arroz', DEPOIS);

    assert.equal((await getProdutoVariantesById('camil'))?.deleted_at, AGORA);
  });
});

describe('excluir variante', () => {
  beforeEach(async () => {
    await semear();
  });

  test('sai da listagem; o produto e o historico continuam', async () => {
    await deleteProdutoVariantesById('tio', DEPOIS);

    assert.deepEqual(ids(await listProdutoVariantes()), ['camil']);
    assert.deepEqual(ids(await listProdutoVariantesByProduto('arroz')), ['camil']);
    assert.deepEqual(ids(await listProdutoVariantesByProduto('arroz', { comExcluidos: true })), [
      'camil',
      'tio',
    ]);
    assert.equal((await getProdutoVariantesById('tio'))?.deleted_at, DEPOIS);
    assert.deepEqual(ids(await listProdutos()), ['arroz']);
    assert.deepEqual(ids(await listHistoricoPreco()), ['h-camil', 'h-tio']);
  });

  test('o item do lancamento continua com a variante', async () => {
    await deleteProdutoVariantesById('tio', DEPOIS);

    assert.equal((await listItensTransacaoByTransacao('t1'))[0].variante_id, 'tio');
  });

  test('na lista de compras o item e a cotacao ficam, sem a marca', async () => {
    await deleteProdutoVariantesById('tio', DEPOIS);

    const [item] = await listItensListaCompras();
    assert.equal(item.produto_id, 'arroz');
    assert.equal(item.variante_id, null);

    assert.deepEqual(
      (await listCotacoesDaLista()).map((cotacao) => [
        cotacao.id,
        cotacao.preco,
        cotacao.variante_id,
      ]),
      [['cot1', 19, null]],
    );
  });
});

describe('excluir marca', () => {
  test('sai do cadastro, mas a variante continua com ela', async () => {
    const { marcaId } = await semear();

    await deleteMarcaById(marcaId, DEPOIS);

    assert.deepEqual(await listMarcas(), []);
    assert.deepEqual(
      (await listMarcas({ comExcluidos: true })).map((marca) => [marca.nome, marca.deleted_at]),
      [['Tio Joao', DEPOIS]],
    );
    assert.equal((await getProdutoVariantesById('tio'))?.marca_id, marcaId);
    assert.equal((await getProdutoVariantesById('tio'))?.deleted_at, null);
  });
});

describe('excluir categoria de produto', () => {
  test('some do cadastro e dos produtos, sem apagar o vinculo', async () => {
    await semear();
    assert.deepEqual(ids(await listCategoriaVinculos()), ['arroz-graos']);

    await deleteCategoriaById('graos', DEPOIS);

    assert.deepEqual(await listCategorias(), []);
    assert.deepEqual(
      (await listCategorias({ comExcluidos: true })).map((categoria) => categoria.deleted_at),
      [DEPOIS],
    );
    assert.deepEqual(await listCategoriaVinculos(), []);
    assert.equal(await contar('categoria_produto'), 1);
    assert.deepEqual(ids(await listProdutos()), ['arroz']);
  });
});

describe('excluir empresa', () => {
  beforeEach(async () => {
    await semear();
  });

  test('sai da listagem, mas a linha fica com a data da exclusao', async () => {
    await deleteEmpresaById('m1', DEPOIS);

    assert.deepEqual(ids(await listEmpresas()), ['m2']);
    assert.deepEqual(
      (await listEmpresas({ comExcluidos: true })).map((empresa) => [
        empresa.id,
        empresa.deleted_at,
      ]),
      [
        ['m1', DEPOIS],
        ['m2', null],
      ],
    );
  });

  test('o lancamento e o historico de precos continuam com ela', async () => {
    await deleteEmpresaById('m1', DEPOIS);

    const db = await getConnection();
    const transacao = await db.getFirstAsync<{ empresa_id: string | null }>(
      `SELECT empresa_id FROM transacoes WHERE id = 't1'`,
    );
    const registro = (await listHistoricoPreco()).find((atual) => atual.id === 'h-tio');

    assert.equal(transacao?.empresa_id, 'm1');
    assert.equal(registro?.empresa_id, 'm1');
  });

  test('o mercado sai da comparacao da lista de compras, com as cotacoes dele', async () => {
    await deleteEmpresaById('m1', DEPOIS);

    assert.deepEqual(await listMercadosDaLista(), []);
    assert.deepEqual(await listCotacoesDaLista(), []);
    // O item em si continua na lista.
    assert.deepEqual(ids(await listItensListaCompras()), ['lista-arroz']);
  });

  test('as categorias de lancamento dela deixam de ser listadas', async () => {
    assert.deepEqual((await listCategoriasPorEmpresa()).get('m1'), ['mercado']);

    await deleteEmpresaById('m1', DEPOIS);

    assert.equal((await listCategoriasPorEmpresa()).get('m1'), undefined);
  });
});

describe('listHistoricoPrecoDeAtivos', () => {
  beforeEach(async () => {
    await semear();
  });

  test('sem nada excluido, e o historico inteiro', async () => {
    assert.deepEqual(ids(await listHistoricoPrecoDeAtivos()), ['h-camil', 'h-tio']);
  });

  test('preco de variante excluida fica de fora', async () => {
    await deleteProdutoVariantesById('tio', DEPOIS);

    assert.deepEqual(ids(await listHistoricoPrecoDeAtivos()), ['h-camil']);
  });

  test('preco de produto excluido fica de fora', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(await listHistoricoPrecoDeAtivos(), []);
  });

  test('preco visto em empresa excluida continua, sem o mercado', async () => {
    await deleteEmpresaById('m1', DEPOIS);

    assert.deepEqual(
      (await listHistoricoPrecoDeAtivos())
        .map((registro) => [registro.id, registro.empresa_id])
        .sort(),
      [
        ['h-camil', null],
        ['h-tio', null],
      ],
    );
  });
});

describe('listComprasDeProdutos', () => {
  beforeEach(async () => {
    await semear();
  });

  test('a compra de uma variante excluida conta para o produto, sem a variante', async () => {
    await deleteProdutoVariantesById('tio', DEPOIS);

    assert.deepEqual(
      (await listComprasDeProdutos()).map((compra) => [compra.produto_id, compra.variante_id]),
      [['arroz', null]],
    );
  });

  test('produto excluido nao entra nas sugestoes', async () => {
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(await listComprasDeProdutos(), []);
  });
});

describe('listProdutosComMovimento', () => {
  test('o produto excluido continua na analise, depois dos ativos', async () => {
    await semear();
    await insertProduto({ id: 'sal', nome: 'Sal', preco: 3, unidade_id: null, created_at: AGORA });
    await criarVariante('sal-v1', 'sal', null);
    await registrarPreco('h-sal', 'sal-v1', null, 'sal');

    // O arroz tem mais movimento, mas excluido vai para o fim.
    await deleteProdutoById('arroz', DEPOIS);

    assert.deepEqual(
      (await listProdutosComMovimento()).map((produto) => [produto.id, produto.deleted_at]),
      [
        ['sal', null],
        ['arroz', DEPOIS],
      ],
    );
  });
});

describe('migration 020', () => {
  test('desfazer e reaplicar mantem os cadastros; o excluido volta ativo', async () => {
    await semear();
    await deleteProdutoById('arroz', DEPOIS);

    await desfazerMigrationsDesde(migration020.id);
    await initializeDatabase();

    assert.deepEqual(
      (await listProdutos()).map((produto) => [produto.id, produto.deleted_at]),
      [['arroz', null]],
    );
    assert.deepEqual(ids(await listProdutoVariantes()), ['camil', 'tio']);
    assert.deepEqual(ids(await listEmpresas()), ['m1', 'm2']);
  });
});

describe('helpers', () => {
  const ativo = { id: 'a', nome: 'Arroz', deleted_at: null };
  const excluido = { id: 'b', nome: 'Feijao', deleted_at: DEPOIS };

  test('somenteAtivos tira os excluidos', () => {
    assert.deepEqual(somenteAtivos([excluido, ativo]), [ativo]);
  });

  test('ativosPrimeiro mantem a ordem dentro de cada grupo', () => {
    const outro = { id: 'c', nome: 'Sal', deleted_at: null };

    assert.deepEqual(ativosPrimeiro([excluido, ativo, outro]), [ativo, outro, excluido]);
  });

  test('nomeComExclusao marca so o excluido, no genero pedido', () => {
    assert.equal(nomeComExclusao(ativo), 'Arroz');
    assert.equal(nomeComExclusao(excluido), 'Feijao (excluído)');
    assert.equal(nomeComExclusao(excluido, 'excluída'), 'Feijao (excluída)');
  });

  test('filtroDeAtivos some quando a listagem pede os excluidos', () => {
    assert.equal(filtroDeAtivos({}), 'WHERE deleted_at IS NULL');
    assert.equal(filtroDeAtivos({}, 'AND'), 'AND deleted_at IS NULL');
    assert.equal(filtroDeAtivos({ comExcluidos: true }), '');
  });
});
