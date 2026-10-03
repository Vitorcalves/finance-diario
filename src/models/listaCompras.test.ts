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
  deleteItemListaCompras,
  deleteItensComprados,
  deleteTodosPrecosDaLista,
  getMercadoAtualDaLista,
  insertItensListaCompras,
  type ItemListaCompras,
  listComprasDeProdutos,
  listItensListaCompras,
  listMercadosDaLista,
  listPrecosDaLista,
  removerMercadoDaLista,
  salvarPrecoDaLista,
  saveMercadoAtualDaLista,
  updateItemListaCompras,
} from './listaCompras';
import { migration010 } from './migrations/010_lista_compras_precos';
import { migration011 } from './migrations/011_lista_compras_preco_variante';
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

describe('precos por mercado', () => {
  beforeEach(async () => {
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });
    await insertEmpresa({ id: 'm2', nome: 'Mercado 2', created_at: AGORA });
    await insertItensListaCompras([item('arroz'), item('feijao')]);
  });

  const anotados = async (): Promise<string[]> =>
    (await listPrecosDaLista())
      .map((preco) => `${preco.item_id}@${preco.empresa_id}=${preco.preco}`)
      .sort();

  test('o mesmo item guarda um preco em cada mercado e a correcao substitui', async () => {
    await salvarPrecoDaLista('arroz', 'm1', 20);
    await salvarPrecoDaLista('arroz', 'm2', 22);
    await salvarPrecoDaLista('arroz', 'm2', 21.5);

    assert.deepEqual(await anotados(), ['arroz@m1=20', 'arroz@m2=21.5']);
  });

  test('preco vazio apaga a anotacao daquele mercado', async () => {
    await salvarPrecoDaLista('arroz', 'm1', 20);
    await salvarPrecoDaLista('arroz', 'm1', null);

    assert.deepEqual(await anotados(), []);
  });

  test('excluir o item leva os precos dele junto', async () => {
    await salvarPrecoDaLista('arroz', 'm1', 20);
    await salvarPrecoDaLista('feijao', 'm1', 8);

    await deleteItemListaCompras('arroz');

    assert.deepEqual(await anotados(), ['feijao@m1=8']);
  });

  test('mercados entram na ordem em que foram adicionados, sem repetir', async () => {
    await adicionarMercadoNaLista('m2');
    await adicionarMercadoNaLista('m1');
    await adicionarMercadoNaLista('m2');

    assert.deepEqual(await listMercadosDaLista(), ['m2', 'm1']);
  });

  test('tirar o mercado da comparacao apaga so os precos dele', async () => {
    await adicionarMercadoNaLista('m1');
    await adicionarMercadoNaLista('m2');
    await salvarPrecoDaLista('arroz', 'm1', 20);
    await salvarPrecoDaLista('arroz', 'm2', 22);

    await removerMercadoDaLista('m2');

    assert.deepEqual(await listMercadosDaLista(), ['m1']);
    assert.deepEqual(await anotados(), ['arroz@m1=20']);
  });

  test('apagar os precos mantem itens e mercados', async () => {
    await adicionarMercadoNaLista('m1');
    await salvarPrecoDaLista('arroz', 'm1', 20);

    await deleteTodosPrecosDaLista();

    assert.deepEqual(await anotados(), []);
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
    await migration011.down(db);
    await migration010.down(db);
    await db.runAsync(
      `INSERT INTO lista_compras_itens (id, descricao, quantidade, comprado, preco_pago, ordem, created_at)
       VALUES ('tomate', 'tomate', 2, 1, 4.29, 1, ?), ('pao', 'pao', 1, 0, NULL, 2, ?)`,
      [AGORA, AGORA],
    );
    await saveMercadoAtualDaLista('m1');

    await migration010.up(db);
    await migration011.up(db);

    assert.deepEqual(await listMercadosDaLista(), ['m1']);
    assert.deepEqual(
      (await listPrecosDaLista()).map((preco) => [preco.item_id, preco.empresa_id, preco.preco]),
      [['tomate', 'm1', 4.29]],
    );
    assert.equal(
      (await listItensListaCompras()).every((atual) => !('preco_pago' in atual)),
      true,
    );
  });
});

describe('marca anotada com o preco', () => {
  beforeEach(async () => {
    await cadastrarArroz();
    await insertEmpresa({ id: 'm1', nome: 'Mercado 1', created_at: AGORA });
    await insertItensListaCompras([item('arroz-lista', { produto_id: 'arroz' })]);
  });

  const marcas = async (): Promise<(string | null)[]> =>
    (await listPrecosDaLista()).map((preco) => preco.variante_id);

  test('o preco guarda a variante vista e a troca junto com o valor', async () => {
    await salvarPrecoDaLista('arroz-lista', 'm1', 20, 'tio');
    assert.deepEqual(await marcas(), ['tio']);

    await salvarPrecoDaLista('arroz-lista', 'm1', 21, null);
    assert.deepEqual(await marcas(), [null]);
  });

  test('excluir a variante do cadastro mantem o preco, sem a marca', async () => {
    await salvarPrecoDaLista('arroz-lista', 'm1', 20, 'tio');
    const db = await getConnection();

    await db.runAsync('DELETE FROM produto_variantes WHERE id = ?', ['tio']);

    const [preco] = await listPrecosDaLista();
    assert.equal(preco.preco, 20);
    assert.equal(preco.variante_id, null);
  });

  test('desfazer a migracao 011 mantem os precos anotados', async () => {
    await salvarPrecoDaLista('arroz-lista', 'm1', 20, 'tio');
    const db = await getConnection();

    await migration011.down(db);

    const linhas = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM lista_compras_precos',
    );
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].preco, 20);
    assert.equal('variante_id' in linhas[0], false);

    await migration011.up(db);
    assert.deepEqual(await marcas(), [null]);
  });
});
