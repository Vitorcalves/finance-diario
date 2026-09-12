import { exportarBanco, type BackupJson, type ResumoTabela } from './backup';
import type { ApiConfig } from './settingsModel';

/**
 * Envio do banco para a API de persistencia (`api_finance_diario`).
 *
 * O app so empurra: manda o mesmo JSON da aba Exportar para `POST /sync` e a
 * API guarda uma copia e espelha as tabelas no Postgres para analise. Nada
 * volta da API para o banco do app por aqui - a unica forma de trazer dados
 * de volta continua sendo a aba Importar, com o JSON que a API devolve em
 * `GET /backup`.
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

export class SincronizacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SincronizacaoError';
  }
}

/** Remove barras finais para montar `${url}/sync` sem `//`. */
export const normalizarUrl = (url: string): string => url.trim().replace(/\/+$/, '');

/** Monta a requisicao de envio; separado do `fetch` para ser testavel sem rede. */
export const montarRequisicao = (
  config: ApiConfig,
  backup: BackupJson,
): { url: string; init: RequestInit } => {
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
    url: `${base}/sync`,
    init: { method: 'POST', headers, body: JSON.stringify(backup) },
  };
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

/** Exporta o banco e envia para a API. Nao altera nada localmente. */
export const enviarParaApi = async (config: ApiConfig): Promise<ResultadoSync> => {
  const backup = await exportarBanco();
  const { url, init } = montarRequisicao(config, backup);

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
    throw new SincronizacaoError(`A API recusou o envio: ${await lerErro(response)}`);
  }

  return (await response.json()) as ResultadoSync;
};
