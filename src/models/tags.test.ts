import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, desfazerUltimaMigration, prepararBanco } from '../../tests/setup/banco';
import { Locais } from '../utils/local';
import { getConnection, initializeDatabase } from './database';
import { registrarLancamento, type DadosLancamento } from './lancamentos';
import { criarAssinatura, materializarPlanos } from './materializacaoPlanos';
import {
  definirTagsTransacao,
  deleteTag,
  listResumoTags,
  listTags,
  listTagsPorTransacao,
  salvarTag,
  type Tag,
  ValidacaoTagError,
} from './tags';
import {
  buscarTransacoes,
  excluirTransacao,
  listTransacoes,
  restaurarTransacao,
  type Transacoes,
} from './transacoesModel';

const lancamento = (dados: Partial<DadosLancamento> = {}): DadosLancamento => ({
  descricao: 'Lancamento',
  data: '2026-07-10',
  empresaId: null,
  categoriaId: null,
  valor: -100,
  itens: [],
  ...dados,
});

/** Todas as linhas gravadas, inclusive o registro da compra parcelada. */
const todasAsTransacoes = async (): Promise<Transacoes[]> =>
  listTransacoes(null, null, { incluirNaoContabilizadas: true, ateData: '2099-12-31' });

const tagsDe = async (transacaoId: string): Promise<string[]> =>
  (await listTagsPorTransacao()).get(transacaoId) ?? [];

let viagem: Tag;

beforeEach(async () => {
  await prepararBanco();
  viagem = await salvarTag({ nome: 'Viagem julho' }, AGORA);
});

describe('salvarTag', () => {
  test('junta os espacos do nome e da descricao', async () => {
    const tag = await salvarTag({ nome: '  Reforma   da cozinha ', descricao: ' obra  2026 ' });

    assert.equal(tag.nome, 'Reforma da cozinha');
    assert.equal(tag.descricao, 'obra 2026');
  });

  test('recusa nome vazio', async () => {
    await assert.rejects(salvarTag({ nome: '   ' }), ValidacaoTagError);
  });

  test('recusa nome longo demais', async () => {
    await assert.rejects(salvarTag({ nome: 'x'.repeat(41) }), ValidacaoTagError);
  });

  test('recusa nome repetido, sem diferenciar maiusculas nem acentos', async () => {
    await salvarTag({ nome: 'Reforma' });

    await assert.rejects(salvarTag({ nome: 'VIAGEM JULHO' }), /Viagem julho/);
    await assert.rejects(salvarTag({ nome: 'refórma' }), ValidacaoTagError);
  });

  test('editar mantem o id e aceita o proprio nome', async () => {
    const editada = await salvarTag({ id: viagem.id, nome: 'viagem julho', descricao: 'Bahia' });

    assert.equal(editada.id, viagem.id);
    assert.equal(editada.created_at, AGORA);
    assert.deepEqual(
      (await listTags()).map((tag) => [tag.nome, tag.descricao]),
      [['viagem julho', 'Bahia']],
    );
  });

  test('editar uma tag apagada avisa', async () => {
    await deleteTag(viagem.id);

    await assert.rejects(salvarTag({ id: viagem.id, nome: 'Viagem' }), ValidacaoTagError);
  });

  test('lista em ordem alfabetica', async () => {
    await salvarTag({ nome: 'reforma' });
    await salvarTag({ nome: 'Aniversário' });

    assert.deepEqual(
      (await listTags()).map((tag) => tag.nome),
      ['Aniversário', 'reforma', 'Viagem julho'],
    );
  });
});

describe('tags no lancamento', () => {
  test('o lancamento a vista recebe as tags, sem repetir', async () => {
    const reforma = await salvarTag({ nome: 'Reforma' });

    await registrarLancamento(
      lancamento({ tagIds: [viagem.id, reforma.id, viagem.id] }),
      Locais.padrao,
    );

    const [transacao] = await todasAsTransacoes();
    // Ordem alfabetica do nome da tag.
    assert.deepEqual(await tagsDe(transacao.id), [reforma.id, viagem.id]);
  });

  test('a compra parcelada leva as tags para a compra e para todas as parcelas', async () => {
    await registrarLancamento(
      lancamento({
        valor: -300,
        parcelamento: { parcelas: 3, primeiraParcela: '2026-07-10' },
        tagIds: [viagem.id],
      }),
      Locais.padrao,
    );

    const linhas = await todasAsTransacoes();
    assert.equal(linhas.length, 4);

    for (const linha of linhas) {
      assert.deepEqual(await tagsDe(linha.id), [viagem.id], linha.descricao);
    }
  });

  test('a transferencia nao recebe tags', async () => {
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO contas (id, nome, tipo, saldo_inicial, ativo, ordem, created_at)
       VALUES ('reserva', 'Reserva', 'reserva', 0, 1, 1, ?)`,
      [AGORA],
    );

    await registrarLancamento(
      lancamento({ contaDestinoId: 'reserva', tagIds: [viagem.id] }),
      Locais.padrao,
    );

    assert.equal((await listTagsPorTransacao()).size, 0);
  });

  test('tag apagada antes de salvar fica de fora, sem impedir o lancamento', async () => {
    await deleteTag(viagem.id);

    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);

    assert.equal((await todasAsTransacoes()).length, 1);
    assert.equal((await listTagsPorTransacao()).size, 0);
  });
});

describe('definirTagsTransacao', () => {
  test('troca as tags do lancamento; lista vazia tira todas', async () => {
    const reforma = await salvarTag({ nome: 'Reforma' });
    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);
    const [transacao] = await todasAsTransacoes();

    assert.equal(await definirTagsTransacao(transacao.id, [reforma.id]), 1);
    assert.deepEqual(await tagsDe(transacao.id), [reforma.id]);

    await definirTagsTransacao(transacao.id, []);
    assert.deepEqual(await tagsDe(transacao.id), []);
  });

  test('marcar uma parcela marca o plano inteiro', async () => {
    await registrarLancamento(
      lancamento({ valor: -300, parcelamento: { parcelas: 3, primeiraParcela: '2026-07-10' } }),
      Locais.padrao,
    );
    const parcela = (await todasAsTransacoes()).find((linha) => linha.parcela_numero === 2);
    assert.ok(parcela);

    // Compra (parcela 0) e as tres parcelas.
    assert.equal(await definirTagsTransacao(parcela.id, [viagem.id]), 4);

    for (const linha of await todasAsTransacoes()) {
      assert.deepEqual(await tagsDe(linha.id), [viagem.id]);
    }
  });

  test('lancamento que nao existe nao muda nada', async () => {
    assert.equal(await definirTagsTransacao('nao-existe', [viagem.id]), 0);
  });

  test('a cobranca nova da assinatura herda as tags do plano', async () => {
    const planoId = await criarAssinatura(
      {
        descricao: 'Aluguel de caçamba',
        empresaId: null,
        valorParcela: -200,
        dataInicio: '2026-07-01',
        frequencia: 'mensal',
        intervalo: 1,
      },
      '2026-07-31',
    );
    const [primeira] = await todasAsTransacoes();
    await definirTagsTransacao(primeira.id, [viagem.id]);

    await materializarPlanos('2026-08-31');

    const cobrancas = (await todasAsTransacoes()).filter((linha) => linha.plano_id === planoId);
    assert.equal(cobrancas.length, 2);

    for (const cobranca of cobrancas) {
      assert.deepEqual(await tagsDe(cobranca.id), [viagem.id], cobranca.data);
    }
  });

  test('a assinatura sem tags continua gerando cobrancas sem tags', async () => {
    await criarAssinatura(
      {
        descricao: 'Streaming',
        empresaId: null,
        valorParcela: -40,
        dataInicio: '2026-07-01',
        frequencia: 'mensal',
        intervalo: 1,
      },
      '2026-09-30',
    );

    assert.equal((await todasAsTransacoes()).length, 3);
    assert.equal((await listTagsPorTransacao()).size, 0);
  });
});

describe('listResumoTags', () => {
  test('soma gastos e entradas do evento; parcelas contam uma a uma', async () => {
    await registrarLancamento(lancamento({ valor: -100, tagIds: [viagem.id] }), Locais.padrao);
    await registrarLancamento(
      lancamento({
        data: '2026-07-05',
        valor: -300,
        parcelamento: { parcelas: 3, primeiraParcela: '2026-07-05' },
        tagIds: [viagem.id],
      }),
      Locais.padrao,
    );
    await registrarLancamento(
      lancamento({ data: '2026-07-20', valor: 50, tagIds: [viagem.id] }),
      Locais.padrao,
    );
    // Sem tag: fica fora do total.
    await registrarLancamento(lancamento({ valor: -999 }), Locais.padrao);

    const [resumo] = await listResumoTags('2026-08-15');

    assert.equal(resumo.id, viagem.id);
    assert.equal(resumo.quantidade, 5);
    assert.equal(resumo.gastos, 400);
    assert.equal(resumo.entradas, 50);
    // A parcela de 05/09 ainda vai vencer.
    assert.equal(resumo.aVencer, 100);
    // A ultima parcela (setembro) nao estica o evento.
    assert.equal(resumo.inicio, '2026-07-05');
    assert.equal(resumo.fim, '2026-07-20');
  });

  test('tag sem lancamento vem zerada', async () => {
    const [resumo] = await listResumoTags('2026-08-15');

    assert.equal(resumo.quantidade, 0);
    assert.equal(resumo.gastos, 0);
    assert.equal(resumo.entradas, 0);
    assert.equal(resumo.aVencer, 0);
    assert.equal(resumo.inicio, null);
    assert.equal(resumo.fim, null);
  });

  test('evento mais recente primeiro', async () => {
    const reforma = await salvarTag({ nome: 'Reforma' }, '2025-01-01T00:00:00.000Z');
    await registrarLancamento(
      lancamento({ data: '2026-03-01', tagIds: [viagem.id] }),
      Locais.padrao,
    );
    await registrarLancamento(
      lancamento({ data: '2026-05-01', tagIds: [reforma.id] }),
      Locais.padrao,
    );

    assert.deepEqual(
      (await listResumoTags('2026-08-15')).map((resumo) => resumo.nome),
      ['Reforma', 'Viagem julho'],
    );
  });
});

describe('excluir e restaurar', () => {
  test('excluir a tag tira a marca, e os lancamentos continuam', async () => {
    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);

    await deleteTag(viagem.id);

    assert.equal((await listTags()).length, 0);
    assert.equal((await listTagsPorTransacao()).size, 0);
    assert.equal((await todasAsTransacoes()).length, 1);
  });

  test('o desfazer da exclusao do lancamento devolve as tags', async () => {
    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);
    const [transacao] = await todasAsTransacoes();

    const excluida = await excluirTransacao(transacao.id);
    assert.ok(excluida);
    assert.deepEqual(excluida.tagIds, [viagem.id]);
    assert.equal((await listTagsPorTransacao()).size, 0);

    await restaurarTransacao(excluida);
    assert.deepEqual(await tagsDe(transacao.id), [viagem.id]);
  });

  test('tag apagada enquanto o desfazer estava na tela nao volta', async () => {
    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);
    const [transacao] = await todasAsTransacoes();
    const excluida = await excluirTransacao(transacao.id);
    assert.ok(excluida);

    await deleteTag(viagem.id);
    await restaurarTransacao(excluida);

    assert.equal((await todasAsTransacoes()).length, 1);
    assert.deepEqual(await tagsDe(transacao.id), []);
  });
});

describe('busca por tag', () => {
  test('so traz os lancamentos com a tag', async () => {
    await registrarLancamento(
      lancamento({ descricao: 'Hotel', tagIds: [viagem.id] }),
      Locais.padrao,
    );
    await registrarLancamento(lancamento({ descricao: 'Mercado' }), Locais.padrao);

    const encontrados = await buscarTransacoes({ tagId: viagem.id });

    assert.deepEqual(
      encontrados.map((transacao) => transacao.descricao),
      ['Hotel'],
    );
  });
});

describe('migration 018', () => {
  test('tira ligacoes repetidas e passa a recusar novas', async () => {
    await registrarLancamento(lancamento({ tagIds: [viagem.id] }), Locais.padrao);
    const [transacao] = await todasAsTransacoes();

    await desfazerUltimaMigration();
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO transacoes_tags (id, transacao_id, tag_id, created_at)
       VALUES ('repetida', ?, ?, ?)`,
      [transacao.id, viagem.id, AGORA],
    );

    await initializeDatabase();

    const total = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM transacoes_tags',
    );
    assert.equal(total?.total, 1);

    await assert.rejects(
      db.runAsync(
        `INSERT INTO transacoes_tags (id, transacao_id, tag_id, created_at)
         VALUES ('outra', ?, ?, ?)`,
        [transacao.id, viagem.id, AGORA],
      ),
    );
  });
});
