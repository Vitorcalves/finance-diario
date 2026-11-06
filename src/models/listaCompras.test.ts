import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, prepararBanco } from '../../tests/setup/banco';
import { getConnection } from './database';
import { insertEmpresa } from './empresas';
import { listHistoricoPreco } from './historicoPreco';
import { listItensTransacaoByTransacao } from './itensTransacao';
import { registrarLancamento } from './lancamentos';
import {
  adicionarMercadoNaLista,
  type CotacaoNaLista,
  deleteCotacao,
  deleteItemListaCompras,
  deleteItensComprados,
  deleteTodasCotacoesDaLista,
  getMercadoAtualDaLista,
  insertItensListaCompras,
  type ItemListaCompras,
  listComprasDeProdutos,
  listCotacoesDaLista,
  listItensListaCompras,
  listMercadosDaLista,
  removerMercadoDaLista,
  salvarCotacao,
  saveMercadoAtualDaLista,
  updateItemListaCompras,
} from './listaCompras';
import { migration010 } from './migrations/010_lista_compras_precos';
import { migration011 } from './migrations/011_lista_compras_preco_variante';
import { migration016 } from './migrations/016_lista_compras_cotacoes';
import { insertProduto } from './produtos';
import { insertProdutoVariantes } from './produtoVariantes';
import { listTransacoes } from './transacoesModel';

const item = (id: string, extra: Partial<ItemListaCompras> = {}): ItemListaCompras => ({
  id,
  produto_id: null,
  variante_id: null,
  descricao: id,
  quantidade: 1,
  comprado: 0,
  ordem: 0,
  created_at: AGORA,
  ...extra,
});

const cotacao = (
  id: string,
  itemId: string,
  empresaId: string,
  preco: number,
  varianteId: string | null = null,
): CotacaoNaLista => ({
  id,
  item_id: itemId,
  empresa_id: empresaId,
  preco,
  variante_id: varianteId,
  updated_at: AGORA,
});

const cadastrarArroz = async (): Promise<void> => {
  await insertProduto({
    id: 'arroz',
    nome: 'Arroz',
    preco: 0,
    unidade_id: null,
    created_at: AGORA,
  });
  await insertProdutoVariantes({
    id: 'tio',
    produto_id: 'arroz',
    marca_id: null,
    unidade_id: null,
    quantidade: null,
    codigo_barras: '789',
    preco: 20,
    created_at: AGORA,
  });
  await insertProdutoVariantes({
    id: 'camil',
    produto_id: 'arroz',
    marca_id: null,
    unidade_id: null,
    quantidade: null,
    codigo_barras: null,
    preco: 22,
    created_at: AGORA,
  });
};

beforeEach(async () => {
  await prepararBanco();
});

describe('lista de compras', () => {
  test('mantem a ordem de entrada e poe o que esta no carrinho no fim', async () => {
    await insertItensListaCompras([item('leite'), item('pao')]);
    await insertItensListaCompras([item('cafe')]);

    const [leite] = await listItensListaCompras();
    await updateItemListaCompras({ ...leite, comprado: 1 });

    const lista = await listItensListaCompras();
    assert.deepEqual(
      lista.map((atual) => atual.id),
      ['pao', 'cafe', 'leite'],
    );
    assert.equal(lista[2].comprado, 1);
  });

  test('tirar os comprados nao mexe no que falta comprar', async () => {
    await insertItensListaCompras([item('leite', { comprado: 1 }), item('pao')]);

    await deleteItensComprados();

    assert.deepEqual(
      (await listItensListaCompras()).map((atual) => atual.id),
      ['pao'],
    );
  });

  test('excluir o produto tira o item da lista; excluir a variante so a desvincula', async () => {
    await cadastrarArroz();
    await insertItensListaCompras([
      item('com-variante', { produto_id: 'arroz', variante_id: 'tio' }),
    ]);
    const db = await getConnection();

    await db.runAsync('DELETE FROM produto_variantes WHERE id = ?', ['tio']);
    assert.equal((await listItensListaCompras())[0].variante_id, null);

    await db.runAsync('DELETE FROM produtos WHERE id = ?', ['arroz']);
    assert.deepEqual(await listItensListaCompras(), []);
  });

  test('o mercado atual sobrevive e pode ser limpo', async () => {
    assert.equal(await getMercadoAtualDaLista(), null);

    await saveMercadoAtualDaLista('m1');
    assert.equal(await getMercadoAtualDaLista(), 'm1');

    await saveMercadoAtualDaLista(null);
    assert.equal(await getMercadoAtualDaLista(), null);
  });
});

describe('cotacoes por mercado', () => {
  beforeEach(async () => {
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });
    await insertEmpresa({ id: 'm2', nome: 'Mercado 2', created_at: AGORA });
    await insertItensListaCompras([item('arroz'), item('feijao')]);
  });

  const anotadas = async (): Promise<string[]> =>
    (await listCotacoesDaLista())
      .map((atual) => `${atual.id}:${atual.item_id}@${atual.empresa_id}=${atual.preco}`)
      .sort();

  test('o mesmo item guarda varias cotacoes no mesmo mercado e a correcao vai pelo id', async () => {
    await salvarCotacao(cotacao('c1', 'arroz', 'm1', 20));
    await salvarCotacao(cotacao('c2', 'arroz', 'm1', 23));
    await salvarCotacao(cotacao('c3', 'arroz', 'm2', 22));
    await salvarCotacao(cotacao('c2', 'arroz', 'm1', 21.5));

    assert.deepEqual(await anotadas(), ['c1:arroz@m1=20', 'c2:arroz@m1=21.5', 'c3:arroz@m2=22']);
  });

  test('lista na ordem em que foram anotadas, mesmo depois de corrigir o preco', async () => {
    await salvarCotacao(cotacao('b', 'arroz', 'm1', 20));
    await salvarCotacao(cotacao('a', 'arroz', 'm1', 23));
    await salvarCotacao(cotacao('b', 'arroz', 'm1', 19));

    assert.deepEqual(
      (await listCotacoesDaLista()).map((atual) => atual.id),
      ['b', 'a'],
    );
  });

  test('apagar uma cotacao nao mexe nas outras do mesmo mercado', async () => {
    await salvarCotacao(cotacao('c1', 'arroz', 'm1', 20));
    await salvarCotacao(cotacao('c2', 'arroz', 'm1', 23));

    await deleteCotacao('c1');

    assert.deepEqual(await anotadas(), ['c2:arroz@m1=23']);
  });

  test('excluir o item leva as cotacoes dele junto', async () => {
    await salvarCotacao(cotacao('c1', 'arroz', 'm1', 20));
    await salvarCotacao(cotacao('c2', 'feijao', 'm1', 8));

    await deleteItemListaCompras('arroz');

    assert.deepEqual(await anotadas(), ['c2:feijao@m1=8']);
  });

  test('mercados entram na ordem em que foram adicionados, sem repetir', async () => {
    await adicionarMercadoNaLista('m2');
    await adicionarMercadoNaLista('m1');
    await adicionarMercadoNaLista('m2');

    assert.deepEqual(await listMercadosDaLista(), ['m2', 'm1']);
  });

  test('tirar o mercado da comparacao apaga so as cotacoes dele', async () => {
    await adicionarMercadoNaLista('m1');
    await adicionarMercadoNaLista('m2');
    await salvarCotacao(cotacao('c1', 'arroz', 'm1', 20));
    await salvarCotacao(cotacao('c2', 'arroz', 'm2', 22));
    await salvarCotacao(cotacao('c3', 'arroz', 'm2', 24));

    await removerMercadoDaLista('m2');

    assert.deepEqual(await listMercadosDaLista(), ['m1']);
    assert.deepEqual(await anotadas(), ['c1:arroz@m1=20']);
  });

  test('apagar as cotacoes mantem itens e mercados', async () => {
    await adicionarMercadoNaLista('m1');
    await salvarCotacao(cotacao('c1', 'arroz', 'm1', 20));

    await deleteTodasCotacoesDaLista();

    assert.deepEqual(await anotadas(), []);
    assert.equal((await listItensListaCompras()).length, 2);
    assert.deepEqual(await listMercadosDaLista(), ['m1']);
  });
});

describe('registrarLancamento e o historico de compras', () => {
  test('grava o lancamento com categoria, itens e o preco pago no historico do mercado', async () => {
    await cadastrarArroz();
    await insertEmpresa({ id: 'm1', nome: 'Mercado', created_at: AGORA });

    await registrarLancamento(
      {
        descricao: 'Compras - Mercado',
        data: '2026-01-10',
        empresaId: 'm1',
        categoriaId: 'mercado',
        valor: -50,
        itens: [
          {
            produtoId: 'arroz',
            varianteId: 'tio',
            descricao: 'Arroz',
            quantidade: 2,
            precoUnitario: 22,
          },
          {
            produtoId: null,
            varianteId: null,
            descricao: 'Papel',
            quantidade: 1,
            precoUnitario: 6,
          },
        ],
      },
      1,
    );

    const [transacao] = await listTransacoes();
    assert.equal(transacao.categoria_id, 'mercado');
    assert.equal(transacao.empresa_id, 'm1');
    assert.equal((await listItensTransacaoByTransacao(transacao.id)).length, 2);

    const historico = await listHistoricoPreco();
    assert.equal(historico.length, 1);
    assert.equal(historico[0].empresa_id, 'm1');
    assert.equal(historico[0].preco, 22);

    assert.deepEqual(await listComprasDeProdutos(), [
      { produto_id: 'arroz', variante_id: 'tio', quantidade: 2, data: '2026-01-10' },
    ]);
  });

  test('uma falha no meio nao deixa o lancamento pela metade', async () => {
    await assert.rejects(
      registrarLancamento(
        {
          descricao: 'Compra',
          data: '2026-01-10',
          empresaId: null,
          categoriaId: null,
          valor: -10,
          // Produto e variante inexistentes: o item falha depois do insert da transacao.
          itens: [
            { produtoId: 'x', varianteId: 'y', descricao: 'X', quantidade: 1, precoUnitario: 10 },
          ],
        },
        1,
      ),
    );

    assert.deepEqual(await listTransacoes(), []);
  });
});

describe('migracao 010', () => {
  test('o preco pago guardado no item vira o preco no mercado que estava escolhido', async () => {
    const db = await getConnection();
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });

    // Volta ao formato da 009: preco no item e mercado escolhido nas configuracoes.
    // As migracoes posteriores saem antes e voltam depois, como no app.
    const desfazer016 = migration016.down;
    const desfazer011 = migration011.down;
    const desfazer010 = migration010.down;
    assert.ok(desfazer016);
    assert.ok(desfazer011);
    assert.ok(desfazer010);
    await desfazer016(db);
    await desfazer011(db);
    await desfazer010(db);
    await db.runAsync(
      `INSERT INTO lista_compras_itens (id, descricao, quantidade, comprado, preco_pago, ordem, created_at)
       VALUES ('tomate', 'tomate', 2, 1, 4.29, 1, ?), ('pao', 'pao', 1, 0, NULL, 2, ?)`,
      [AGORA, AGORA],
    );
    await saveMercadoAtualDaLista('m1');

    await migration010.up(db);
    await migration011.up(db);
    await migration016.up(db);

    assert.deepEqual(await listMercadosDaLista(), ['m1']);
    assert.deepEqual(
      (await listCotacoesDaLista()).map((atual) => [atual.item_id, atual.empresa_id, atual.preco]),
      [['tomate', 'm1', 4.29]],
    );
    assert.equal(
      (await listItensListaCompras()).every((atual) => !('preco_pago' in atual)),
      true,
    );
  });
});

describe('marca da cotacao', () => {
  beforeEach(async () => {
    await cadastrarArroz();
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });
    await insertItensListaCompras([item('arroz-lista', { produto_id: 'arroz' })]);
  });

  const marcas = async (): Promise<(string | null)[]> =>
    (await listCotacoesDaLista()).map((atual) => atual.variante_id);

  test('a cotacao guarda a variante e a troca junto com o preco', async () => {
    await salvarCotacao(cotacao('c1', 'arroz-lista', 'm1', 20, 'tio'));
    assert.deepEqual(await marcas(), ['tio']);

    await salvarCotacao(cotacao('c1', 'arroz-lista', 'm1', 21, null));
    assert.deepEqual(await marcas(), [null]);
  });

  test('excluir a variante do cadastro mantem as cotacoes, sem a marca', async () => {
    // Duas sem marca no mesmo mercado depois do SET NULL: nada pode barrar a exclusao.
    await salvarCotacao(cotacao('c1', 'arroz-lista', 'm1', 20, 'tio'));
    await salvarCotacao(cotacao('c2', 'arroz-lista', 'm1', 19, null));
    const db = await getConnection();

    await db.runAsync('DELETE FROM produto_variantes WHERE id = ?', ['tio']);

    assert.deepEqual(
      (await listCotacoesDaLista()).map((atual) => [atual.id, atual.preco, atual.variante_id]),
      [
        ['c1', 20, null],
        ['c2', 19, null],
      ],
    );
  });

  test('desfazer a migracao 011 mantem os precos anotados', async () => {
    await salvarCotacao(cotacao('c1', 'arroz-lista', 'm1', 20, 'tio'));
    const db = await getConnection();

    const desfazer016 = migration016.down;
    const desfazer011 = migration011.down;
    assert.ok(desfazer016);
    assert.ok(desfazer011);
    await desfazer016(db);
    await desfazer011(db);

    const linhas = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM lista_compras_precos',
    );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].preco, 20);
    assert.equal('variante_id' in linhas[0], false);

    await migration011.up(db);
    await migration016.up(db);
    assert.deepEqual(await marcas(), [null]);
  });
});

describe('migracao 016', () => {
  beforeEach(async () => {
    await cadastrarArroz();
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });
    await insertEmpresa({ id: 'm2', nome: 'Mercado 2', created_at: AGORA });
    await insertItensListaCompras([
      item('com-marca', { produto_id: 'arroz', variante_id: 'tio' }),
      item('qualquer', { produto_id: 'arroz' }),
    ]);
  });

  /** Volta ao formato da 015: um preco por item e mercado. */
  const voltarPara015 = async (): Promise<void> => {
    const desfazer = migration016.down;
    assert.ok(desfazer);
    await desfazer(await getConnection());
  };

  test('cada preco vira uma cotacao com id e a marca herdada do item fica gravada', async () => {
    await voltarPara015();
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO lista_compras_precos (item_id, empresa_id, preco, updated_at, variante_id)
       VALUES ('com-marca', 'm1', 20, ?, NULL),
              ('com-marca', 'm2', 23, ?, 'camil'),
              ('qualquer', 'm1', 21, ?, NULL)`,
      [AGORA, AGORA, AGORA],
    );

    await migration016.up(db);

    const cotacoes = await listCotacoesDaLista();
    assert.deepEqual(
      cotacoes.map((atual) => [atual.item_id, atual.empresa_id, atual.preco, atual.variante_id]),
      [
        ['com-marca', 'm1', 20, 'tio'],
        ['com-marca', 'm2', 23, 'camil'],
        ['qualquer', 'm1', 21, null],
      ],
    );
    assert.ok(cotacoes.every((atual) => /^[0-9a-f]{32}$/.test(atual.id)));
    assert.equal(new Set(cotacoes.map((atual) => atual.id)).size, cotacoes.length);
  });

  test('desfazer fica com uma cotacao por mercado: a da marca do item ou a mais recente', async () => {
    const DEPOIS = '2026-01-20T12:00:00.000Z';
    await salvarCotacao(cotacao('a', 'com-marca', 'm1', 20, 'camil'));
    await salvarCotacao({ ...cotacao('b', 'com-marca', 'm1', 22, 'tio'), updated_at: DEPOIS });
    await salvarCotacao(cotacao('c', 'com-marca', 'm2', 25, 'tio'));
    await salvarCotacao({ ...cotacao('d', 'com-marca', 'm2', 24, 'camil'), updated_at: DEPOIS });
    await salvarCotacao(cotacao('e', 'qualquer', 'm1', 19, 'tio'));
    await salvarCotacao({ ...cotacao('f', 'qualquer', 'm1', 18, 'camil'), updated_at: DEPOIS });

    await voltarPara015();

    const db = await getConnection();
    const linhas = await db.getAllAsync<{ item_id: string; empresa_id: string; preco: number }>(
      'SELECT item_id, empresa_id, preco FROM lista_compras_precos ORDER BY item_id, empresa_id',
    );
    // A marca do item vale mesmo sendo a mais antiga; sem marca no item, a mais recente.
    assert.deepEqual(linhas, [
      { item_id: 'com-marca', empresa_id: 'm1', preco: 22 },
      { item_id: 'com-marca', empresa_id: 'm2', preco: 25 },
      { item_id: 'qualquer', empresa_id: 'm1', preco: 18 },
    ]);
  });
});
