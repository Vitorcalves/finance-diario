import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, desfazerUltimaMigration, prepararBanco } from '../../tests/setup/banco';
import {
  analisarBackup,
  BACKUP_FORMATO,
  BACKUP_VERSAO,
  exportarBanco,
  importarBanco,
} from './backup';
import { insertConta } from './contas';
import { getConnection, initializeDatabase } from './database';
import { insertEmpresa } from './empresas';
import { listHistoricoPreco } from './historicoPreco';
import { registrarLancamento } from './lancamentos';
import { migration021 } from './migrations/021_nota_fiscal';
import { gravarDeParaItemNfce, listDeParaItensNfce } from './nfceItensVariantes';
import { insertProduto } from './produtos';
import { insertProdutoVariantes } from './produtoVariantes';
import {
  buscarLancamentoDaNota,
  excluirTransacao,
  restaurarTransacao,
  type Transacoes,
} from './transacoesModel';
import { Locais } from '../utils/local';

const CHAVE = '31261120320503001123650350001972781044038887';

const ITEM_NOTA = { codigo: '3875', descricao: 'QUEIJO TIROLEZ PARMESAO KG' };

const cadastrar = async (): Promise<void> => {
  await insertEmpresa({
    id: 'funarbe',
    nome: 'Funarbe',
    cnpj: '20.320.503/0011-23',
    created_at: AGORA,
  });
  await insertProduto({
    id: 'queijo',
    nome: 'Queijo',
    preco: 0,
    unidade_id: null,
    created_at: AGORA,
  });
  await insertProdutoVariantes({
    id: 'tirolez',
    produto_id: 'queijo',
    marca_id: null,
    unidade_id: null,
    quantidade: null,
    codigo_barras: null,
    preco: 100,
    created_at: AGORA,
  });
};

/** Lancamento como o formulario manda, vindo da nota real. */
const lancarNota = async (
  extra: Partial<Parameters<typeof registrarLancamento>[0]> = {},
): Promise<void> =>
  registrarLancamento(
    {
      descricao: 'Funarbe',
      data: '2026-11-13',
      empresaId: 'funarbe',
      categoriaId: null,
      valor: -41.34,
      chaveNfce: CHAVE,
      itens: [
        {
          produtoId: 'queijo',
          varianteId: 'tirolez',
          descricao: 'QUEIJO TIROLEZ PARMESAO KG',
          quantidade: 0.196,
          precoUnitario: 23.5 / 0.196,
          itemNota: ITEM_NOTA,
        },
        {
          produtoId: null,
          varianteId: null,
          descricao: 'BACON NOVO SUINO PEDACO KG',
          quantidade: 0.36,
          precoUnitario: 16.52 / 0.36,
          itemNota: { codigo: '845', descricao: 'BACON NOVO SUINO PEDACO KG' },
        },
        {
          produtoId: 'queijo',
          varianteId: null,
          descricao: 'Queijo digitado à mão',
          quantidade: 1,
          precoUnitario: 1.32,
        },
      ],
      ...extra,
    },
    Locais.padrao,
  );

const transacoesDaNota = async (): Promise<Transacoes[]> => {
  const db = await getConnection();
  return db.getAllAsync<Transacoes>(
    'SELECT * FROM transacoes WHERE chave_nfce = ? ORDER BY parcela_numero',
    [CHAVE],
  );
};

beforeEach(async () => {
  await prepararBanco();
});

describe('migration 021', () => {
  test('aplica num banco que ja tinha lancamentos, sem chave neles', async () => {
    await desfazerUltimaMigration();
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO transacoes (id, descricao, valor, data, natureza, contabilizado_saldo, created_at)
       VALUES ('antigo', 'Antes da 021', -10, '2026-01-01', 'movimento', 1, ?)`,
      [AGORA],
    );

    await initializeDatabase();

    const linha = await db.getFirstAsync<{ chave_nfce: string | null }>(
      "SELECT chave_nfce FROM transacoes WHERE id = 'antigo'",
    );
    assert.equal(linha?.chave_nfce, null);
    assert.deepEqual(await listDeParaItensNfce(), []);
  });

  test('o down desfaz tudo', async () => {
    const db = await getConnection();
    await migration021.down?.(db);

    const colunas = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transacoes)');
    assert.equal(
      colunas.some((coluna) => coluna.name === 'chave_nfce'),
      false,
    );
    const tabela = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE name = 'nfce_itens_variantes'",
    );
    assert.equal(tabela, null);
  });
});

describe('chave da nota no lancamento', () => {
  test('fica na transacao dos itens e acha a nota ja lancada', async () => {
    await cadastrar();
    assert.equal(await buscarLancamentoDaNota(CHAVE), null);

    await lancarNota();

    const [transacao] = await transacoesDaNota();
    assert.equal(transacao.natureza, 'movimento');
    assert.deepEqual(await buscarLancamentoDaNota(CHAVE), {
      id: transacao.id,
      descricao: 'Funarbe',
      valor: -41.34,
      data: '2026-11-13',
    });
  });

  test('compra parcelada: a chave vai no registro da compra, com o valor cheio', async () => {
    await cadastrar();
    await lancarNota({ parcelamento: { parcelas: 3, primeiraParcela: '2026-12-10' } });

    const linhas = await transacoesDaNota();
    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].natureza, 'registro_compra');
    assert.equal(linhas[0].parcela_numero, 0);
    assert.equal((await buscarLancamentoDaNota(CHAVE))?.valor, -41.34);
    assert.equal((await buscarLancamentoDaNota(CHAVE))?.data, '2026-11-13');
  });

  test('o "Desfazer" da exclusao devolve a chave junto', async () => {
    await cadastrar();
    await lancarNota();
    const [transacao] = await transacoesDaNota();

    const excluida = await excluirTransacao(transacao.id);
    assert.equal(await buscarLancamentoDaNota(CHAVE), null);

    assert.ok(excluida);
    await restaurarTransacao(excluida);
    assert.equal((await buscarLancamentoDaNota(CHAVE))?.id, transacao.id);
  });

  test('a transferencia nao leva a chave', async () => {
    await insertConta({
      id: 'reserva',
      nome: 'Reserva',
      tipo: 'reserva',
      dia_fechamento: null,
      dia_vencimento: null,
      meta_valor: null,
      saldo_inicial: 0,
      cor: null,
      ativo: 1,
      ordem: 0,
      created_at: AGORA,
    });

    await registrarLancamento(
      {
        descricao: 'Aporte',
        data: '2026-11-13',
        empresaId: null,
        categoriaId: null,
        valor: -10,
        itens: [],
        contaDestinoId: 'reserva',
        chaveNfce: CHAVE,
      },
      Locais.padrao,
    );

    assert.equal(await buscarLancamentoDaNota(CHAVE), null);
  });
});

describe('de-para dos itens da nota', () => {
  test('aprende so o item da nota que saiu ligado a um produto', async () => {
    await cadastrar();
    await lancarNota();

    const dePara = await listDeParaItensNfce();
    assert.deepEqual(
      dePara.map(({ empresa_id, chave_item, produto_id, variante_id }) => ({
        empresa_id,
        chave_item,
        produto_id,
        variante_id,
      })),
      [
        {
          empresa_id: 'funarbe',
          chave_item: 'codigo:3875',
          produto_id: 'queijo',
          variante_id: 'tirolez',
        },
      ],
    );
  });

  test('o preco pago vai ao historico', async () => {
    await cadastrar();
    await lancarNota();

    const historico = await listHistoricoPreco();
    assert.equal(historico.length, 1);
    assert.equal(Math.round(historico[0].preco * 0.196 * 100), 2350);
  });

  test('sem empresa nao ha de-para', async () => {
    await cadastrar();
    await lancarNota({ empresaId: null });

    assert.deepEqual(await listDeParaItensNfce(), []);
  });

  test('aprender de novo atualiza a ligacao', async () => {
    await cadastrar();
    await gravarDeParaItemNfce(
      { empresaId: 'funarbe', chaveItem: 'codigo:3875', produtoId: 'queijo', varianteId: null },
      '2026-01-01T00:00:00.000Z',
    );

    await lancarNota();

    const [linha] = await listDeParaItensNfce();
    assert.equal(linha.variante_id, 'tirolez');
    assert.equal(linha.created_at, '2026-01-01T00:00:00.000Z');
    assert.notEqual(linha.updated_at, '2026-01-01T00:00:00.000Z');
  });

  test('falha no meio nao deixa de-para sem o lancamento', async () => {
    await cadastrar();

    await assert.rejects(
      lancarNota({
        itens: [
          {
            produtoId: 'queijo',
            varianteId: 'tirolez',
            descricao: 'Queijo',
            quantidade: 1,
            precoUnitario: 10,
            itemNota: ITEM_NOTA,
          },
          {
            produtoId: 'queijo',
            varianteId: 'nao-existe',
            descricao: 'Variante que sumiu',
            quantidade: 1,
            precoUnitario: 10,
          },
        ],
      }),
    );

    assert.deepEqual(await listDeParaItensNfce(), []);
    assert.equal(await buscarLancamentoDaNota(CHAVE), null);
  });
});

describe('backup', () => {
  test('a coluna e a tabela novas entram no export', async () => {
    await cadastrar();
    await lancarNota();

    const backup = await exportarBanco();
    assert.equal(backup.tabelas.nfce_itens_variantes.length, 1);
    assert.equal(
      backup.tabelas.transacoes.find((linha) => linha.chave_nfce === CHAVE)?.descricao,
      'Funarbe',
    );
  });

  test('backup antigo, sem a coluna nem a tabela, entra com a chave vazia', async () => {
    const antigo = JSON.stringify({
      formato: BACKUP_FORMATO,
      versao: BACKUP_VERSAO,
      schema_version: 20,
      exportado_em: '2026-11-01T00:00:00.000Z',
      tabelas: {
        transacoes: [
          {
            id: 't1',
            descricao: 'Compra antiga',
            valor: -12.5,
            data: '2026-10-01',
            natureza: 'movimento',
            contabilizado_saldo: 1,
            conta_id: 'caixa-padrao',
            created_at: '2026-10-01T10:00:00.000Z',
          },
        ],
      },
    });

    await importarBanco(analisarBackup(antigo));

    const db = await getConnection();
    const linha = await db.getFirstAsync<{ chave_nfce: string | null }>(
      "SELECT chave_nfce FROM transacoes WHERE id = 't1'",
    );
    assert.equal(linha?.chave_nfce, null);
    assert.deepEqual(await listDeParaItensNfce(), []);
  });
});
