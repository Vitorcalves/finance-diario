import { Locais } from '../utils/local';
import { getConnection } from './database';

const MONTHLY_INCOME_KEY = 'monthly_income';
const LOCAL_PADRAO_KEY = 'local_padrao';

type SettingRow = {
  value: string;
};

export const getMonthlyIncome = async (): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', [
    MONTHLY_INCOME_KEY,
  ]);

  if (!row?.value) {
    return 0;
  }

  const numeric = Number(row.value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const saveMonthlyIncome = async (value: number): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [MONTHLY_INCOME_KEY, String(value)],
  );
};

/**
 * Local usado ao registrar lancamentos e precos quando o usuario nao escolhe
 * nada - configurado uma vez na tela de menu, em vez de perguntado em cada
 * formulario.
 */
export const getLocalPadrao = async (): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', [
    LOCAL_PADRAO_KEY,
  ]);

  if (!row?.value) {
    return Locais.padrao;
  }

  const numeric = Number(row.value);
  return Number.isFinite(numeric) ? numeric : Locais.padrao;
};

export const saveLocalPadrao = async (id: number): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [LOCAL_PADRAO_KEY, String(id)],
  );
};

const API_URL_KEY = 'api_url';
const API_TOKEN_KEY = 'api_token';

export type ApiConfig = {
  /** Endereco base da API, ex.: `http://192.168.0.10:8010`. Vazio = nao configurada. */
  url: string;
  /** Enviado no header `X-API-Key`; vazio quando a API nao exige chave. */
  token: string;
};

const lerSetting = async (key: string): Promise<string> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? '';
};

/** Endereco e chave da API de persistencia, informados na tela de Integracao. */
export const getApiConfig = async (): Promise<ApiConfig> => {
  const [url, token] = await Promise.all([lerSetting(API_URL_KEY), lerSetting(API_TOKEN_KEY)]);
  return { url, token };
};

export const saveApiConfig = async (config: ApiConfig): Promise<void> => {
  const db = await getConnection();

  for (const [key, value] of [
    [API_URL_KEY, config.url.trim()],
    [API_TOKEN_KEY, config.token.trim()],
  ]) {
    await db.runAsync(
      `
          INSERT INTO settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      [key, value],
    );
  }
};
