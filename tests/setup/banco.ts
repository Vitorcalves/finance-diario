/**
 * Helpers dos testes que tocam o banco.
 *
 * Cada teste comeca com um banco em memoria vazio e com todas as migrations
 * aplicadas, entao o que roda aqui e o schema real do app.
 */
import { initializeDatabase } from '../../src/models/database';
import { __novoBanco } from './expo-sqlite';

/** Banco limpo com o schema atual. Chame no inicio de cada teste. */
export const prepararBanco = async (): Promise<void> => {
  __novoBanco();
  await initializeDatabase();
};

/** ISO fixo, para os testes nao dependerem do relogio. */
export const AGORA = '2026-01-15T12:00:00.000Z';
