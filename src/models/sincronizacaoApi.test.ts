import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import { BACKUP_FORMATO, BACKUP_VERSAO, type BackupJson } from './backup';
import { getConnection } from './database';
import { getApiConfig, saveApiConfig } from './settingsModel';
import {
  consultarIa,
  enviarParaApi,
  montarRequisicao,
  montarRequisicaoIa,
  normalizarUrl,
  SincronizacaoError,
  type RespostaIa,
} from './sincronizacaoApi';

const backup: BackupJson = {
  formato: BACKUP_FORMATO,
  versao: BACKUP_VERSAO,
  schema_version: 6,
  exportado_em: '2026-01-15T12:00:00.000Z',
  tabelas: { settings: [] },
};

/** Troca o `fetch` global por uma resposta fixa e devolve o que foi chamado. */
const simularFetch = (
  status: number,
  corpo: unknown,
): { chamadas: { url: string; init: RequestInit | undefined }[]; restaurar: () => void } => {
  const original = globalThis.fetch;
  const chamadas: { url: string; init: RequestInit | undefined }[] = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init });
    return new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  return { chamadas, restaurar: (): void => void (globalThis.fetch = original) };
};

describe('normalizarUrl', () => {
  test('tira espacos e barras finais', () => {
    assert.equal(normalizarUrl('  http://api:8010/// '), 'http://api:8010');
  });
});

describe('montarRequisicao', () => {
  test('monta POST /sync com o JSON e a chave', () => {
    const { url, init } = montarRequisicao({ url: 'http://api:8010/', token: 'abc' }, backup);

    assert.equal(url, 'http://api:8010/sync');
    assert.equal(init.method, 'POST');
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json', 'X-API-Key': 'abc' });
    assert.equal(init.body, JSON.stringify(backup));
  });

  test('sem chave nao manda o header', () => {
    const { init } = montarRequisicao({ url: 'http://api:8010', token: '  ' }, backup);
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json' });
  });

  test('recusa endereco vazio', () => {
    assert.throws(() => montarRequisicao({ url: '   ', token: '' }, backup), SincronizacaoError);
  });
});

describe('montarRequisicaoIa', () => {
  test('monta POST /ia/consultar com a pergunta sem espacos e a chave', () => {
    const { url, init } = montarRequisicaoIa(
      { url: 'http://api:8010/', token: 'abc' },
      { pergunta: '  Quanto gastei?  ', pensar: true, max_passos: 6 },
    );

    assert.equal(url, 'http://api:8010/ia/consultar');
    assert.equal(init.method, 'POST');
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json', 'X-API-Key': 'abc' });
    assert.deepEqual(JSON.parse(init.body as string), {
      pergunta: 'Quanto gastei?',
      pensar: true,
      max_passos: 6,
    });
  });

  test('recusa pergunta vazia e endereco vazio', () => {
    assert.throws(
      () =>
        montarRequisicaoIa(
          { url: 'http://api:8010', token: '' },
          { pergunta: '  ', pensar: false, max_passos: 6 },
        ),
      /pergunta/i,
    );
    assert.throws(
      () =>
        montarRequisicaoIa(
          { url: '', token: '' },
          { pergunta: 'Oi', pensar: false, max_passos: 6 },
        ),
      SincronizacaoError,
    );
  });
});

describe('consultarIa', () => {
  const resposta: RespostaIa = {
    resposta: 'Voce gastou mais na loja **Bahamas**, com **R$ 182,89**.',
    raciocinio: 'The user wants to know...',
    consultas: [{ sql: 'SELECT 1', linhas: 10, erro: null, segundos: 0.07 }],
    passos: 2,
    modelo: 'qwen3.5-9b',
    tokens_entrada: 3111,
    tokens_saida: 332,
    cortado: false,
    segundos: 8.5,
  };

  test('devolve a resposta do modelo', async () => {
    const { chamadas, restaurar } = simularFetch(200, resposta);

    try {
      const resultado = await consultarIa(
        { url: 'http://api:8010', token: '' },
        { pergunta: 'Onde gastei mais?', pensar: true, max_passos: 6 },
      );

      assert.deepEqual(resultado, resposta);
      assert.equal(chamadas.length, 1);
      assert.equal(chamadas[0].url, 'http://api:8010/ia/consultar');
    } finally {
      restaurar();
    }
  });

  test('traduz erros da API em mensagem para o usuario', async () => {
    const { restaurar } = simularFetch(503, { detail: 'Modelo indisponível' });

    try {
      await assert.rejects(
        consultarIa(
          { url: 'http://api:8010', token: '' },
          { pergunta: 'Oi', pensar: false, max_passos: 6 },
        ),
        /Modelo indisponível/,
      );
    } finally {
      restaurar();
    }
  });
});

describe('enviarParaApi', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  test('exporta o banco e devolve o resultado da API', async () => {
    const db = await getConnection();
    await db.runAsync(
      `INSERT INTO categorias (id, nome, created_at) VALUES ('c1', 'Casa', '2026-01-01')`,
    );

    const resposta = {
      id: 7,
      recebido_em: '2026-01-15T12:00:01.000Z',
      registros: 12,
      tabelas: [],
      ignorados: [],
    };
    const { chamadas, restaurar } = simularFetch(201, resposta);

    try {
      const resultado = await enviarParaApi({ url: 'http://api:8010', token: 'abc' });

      assert.deepEqual(resultado, resposta);
      assert.equal(chamadas.length, 1);
      assert.equal(chamadas[0].url, 'http://api:8010/sync');

      const enviado = JSON.parse(String(chamadas[0].init?.body)) as BackupJson;
      assert.equal(enviado.formato, BACKUP_FORMATO);
      assert.deepEqual(enviado.tabelas.categorias, [
        { id: 'c1', nome: 'Casa', created_at: '2026-01-01', deleted_at: null },
      ]);
    } finally {
      restaurar();
    }
  });

  test('traduz 401 e erros da API em mensagem para o usuario', async () => {
    const naoAutorizado = simularFetch(401, { detail: 'X-API-Key inválida' });
    try {
      await assert.rejects(enviarParaApi({ url: 'http://api:8010', token: 'x' }), /chave/i);
    } finally {
      naoAutorizado.restaurar();
    }

    const invalido = simularFetch(422, { detail: 'Valor inválido em "transacoes"."data"' });
    try {
      await assert.rejects(
        enviarParaApi({ url: 'http://api:8010', token: 'x' }),
        /Valor inválido em "transacoes"/,
      );
    } finally {
      invalido.restaurar();
    }
  });

  test('nao escreve nada no banco local', async () => {
    const { restaurar } = simularFetch(201, {
      id: 1,
      recebido_em: '',
      registros: 0,
      tabelas: [],
      ignorados: [],
    });
    const db = await getConnection();
    const antes = await db.getAllAsync('SELECT * FROM settings');

    try {
      await enviarParaApi({ url: 'http://api:8010', token: '' });
    } finally {
      restaurar();
    }

    assert.deepEqual(await db.getAllAsync('SELECT * FROM settings'), antes);
  });
});

describe('ApiConfig em settings', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  test('vazio por padrao e persiste o que foi salvo, sem espacos', async () => {
    assert.deepEqual(await getApiConfig(), { url: '', token: '' });

    await saveApiConfig({ url: ' http://api:8010 ', token: ' abc ' });
    assert.deepEqual(await getApiConfig(), { url: 'http://api:8010', token: 'abc' });

    await saveApiConfig({ url: 'http://outro', token: '' });
    assert.deepEqual(await getApiConfig(), { url: 'http://outro', token: '' });
  });
});
