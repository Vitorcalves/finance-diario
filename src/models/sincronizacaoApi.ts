import { exportarBanco, type BackupJson, type ResumoTabela } from './backup';
import type { ApiConfig } from './settingsModel';

/**
 * Comunicacao com a API de persistencia (`api_finance_diario`).
 *
 * Duas rotas sao usadas:
 * - `POST /sync`: o app empurra o mesmo JSON da aba Exportar e a API guarda
 *   uma copia e espelha as tabelas no Postgres para analise. Nada volta da
 *   API para o banco do app por aqui - a unica forma de trazer dados de volta
 *   continua sendo a aba Importar, com o JSON que a API devolve em `GET /backup`.
 * - `POST /ia/consultar`: manda uma pergunta em linguagem natural e a API
 *   responde consultando o espelho no Postgres com um modelo de linguagem.
 */

/** Resposta de `POST /sync`. */
export type ResultadoSync = {
  id: number;
  recebido_em: string;
  registros: number;
  tabelas: ResumoTabela[];
  /** Tabelas/colunas que a API ainda nao espelha; ficam so no JSON guardado. */
  ignorados: string[];
};

/** Corpo de `POST /ia/consultar`. */
export type PerguntaIa = {
  pergunta: string;
  /** Liga o modo de raciocinio do modelo; mais lento, mas mais preciso. */
  pensar: boolean;
  /** Limite de idas ao banco antes do modelo ser obrigado a responder. */
  max_passos: number;
};

/** Uma consulta SQL executada pelo modelo enquanto montava a resposta. */
export type ConsultaIa = {
  sql: string;
  linhas: number;
  erro: string | null;
  segundos: number;
};

/** Resposta de `POST /ia/consultar`. */
export type RespostaIa = {
  /** Texto final em Markdown simples (negrito com `**`). */
  resposta: string;
  raciocinio: string;
  consultas: ConsultaIa[];
  passos: number;
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  /** `true` quando a resposta foi truncada pelo limite de tokens ou passos. */
  cortado: boolean;
  segundos: number;
};

/** Valor padrao de `max_passos` enviado pelo app. */
export const MAX_PASSOS_PADRAO = 6;

export class SincronizacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SincronizacaoError';
  }
}

/** Remove barras finais para montar `${url}/rota` sem `//`. */
export const normalizarUrl = (url: string): string => url.trim().replace(/\/+$/, '');

type Requisicao = { url: string; init: RequestInit };

/** Monta um POST JSON para `rota`, com a chave no header quando configurada. */
const montarPost = (config: ApiConfig, rota: string, corpo: unknown): Requisicao => {
  const base = normalizarUrl(config.url);

  if (!base) {
    throw new SincronizacaoError('Informe o endereco da API antes de enviar.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = config.token.trim();

  if (token) {
    headers['X-API-Key'] = token;
  }

  return {
    url: `${base}${rota}`,
    init: { method: 'POST', headers, body: JSON.stringify(corpo) },
  };
};

/** Monta a requisicao de envio; separado do `fetch` para ser testavel sem rede. */
export const montarRequisicao = (config: ApiConfig, backup: BackupJson): Requisicao =>
  montarPost(config, '/sync', backup);

/** Monta a requisicao da pergunta; separado do `fetch` para ser testavel sem rede. */
export const montarRequisicaoIa = (config: ApiConfig, pergunta: PerguntaIa): Requisicao => {
  if (!pergunta.pergunta.trim()) {
    throw new SincronizacaoError('Escreva uma pergunta antes de consultar.');
  }

  return montarPost(config, '/ia/consultar', { ...pergunta, pergunta: pergunta.pergunta.trim() });
};

const lerErro = async (response: Response): Promise<string> => {
  try {
    const corpo = (await response.json()) as { detail?: unknown };
    if (typeof corpo.detail === 'string') {
      return corpo.detail;
    }
  } catch {
    // corpo nao e JSON; usa o status abaixo
  }

  return `HTTP ${response.status}`;
};

/** Executa a requisicao e traduz falhas de rede/HTTP em `SincronizacaoError`. */
const executar = async <T>({ url, init }: Requisicao, acao: string): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : 'sem detalhes';
    throw new SincronizacaoError(
      `Nao foi possivel conectar em ${url} (${detalhe}). Confira o endereco e se a API esta no ar.`,
    );
  }

  if (response.status === 401) {
    throw new SincronizacaoError('A API recusou a chave (X-API-Key). Confira o campo Chave.');
  }

  if (!response.ok) {
    throw new SincronizacaoError(`A API recusou ${acao}: ${await lerErro(response)}`);
  }

  return (await response.json()) as T;
};

/** Exporta o banco e envia para a API. Nao altera nada localmente. */
export const enviarParaApi = async (config: ApiConfig): Promise<ResultadoSync> => {
  const backup = await exportarBanco();
  return executar<ResultadoSync>(montarRequisicao(config, backup), 'o envio');
};

/** Manda a pergunta para o modelo da API e devolve a resposta com o rastro das consultas. */
export const consultarIa = async (config: ApiConfig, pergunta: PerguntaIa): Promise<RespostaIa> =>
  executar<RespostaIa>(montarRequisicaoIa(config, pergunta), 'a pergunta');
