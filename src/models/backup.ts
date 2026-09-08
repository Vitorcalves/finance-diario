import type { SQLiteDatabase } from 'expo-sqlite';
import { getConnection } from './database';

/**
 * Export/import do banco inteiro em JSON.
 *
 * As tabelas nao sao listadas em codigo: sao lidas de `sqlite_master`, entao
 * toda migration nova entra no backup sozinha. A tabela `migrations` fica de
 * fora dos dados e vira o campo `schema_version`, usado para recusar um JSON
 * gerado por uma versao do app mais nova que a instalada.
 */

export const BACKUP_FORMATO = 'finance-diario-backup';
export const BACKUP_VERSAO = 1;

/** Tabelas internas do SQLite/Android que nunca entram no backup. */
const TABELAS_IGNORADAS = ['migrations', 'sqlite_sequence', 'android_metadata'];

type ValorBind = string | number | null;

export type LinhaBackup = Record<string, string | number | boolean | null>;

export type BackupJson = {
  formato: string;
  versao: number;
  /** Id da ultima migration aplicada no banco de origem. */
  schema_version: number;
  exportado_em: string;
  tabelas: Record<string, LinhaBackup[]>;
};

export type ResumoTabela = {
  tabela: string;
  registros: number;
};

/** Erro de validacao do JSON, com mensagem pronta para exibir ao usuario. */
export class BackupInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupInvalidoError';
  }
}

const listarTabelas = async (db: SQLiteDatabase): Promise<string[]> => {
  const rows = await db.getAllAsync<{ name: string }>(
    `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
    `,
  );

  return rows.map((row) => row.name).filter((name) => !TABELAS_IGNORADAS.includes(name));
};

const listarColunas = async (db: SQLiteDatabase, tabela: string): Promise<string[]> => {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${tabela}")`);
  return rows.map((row) => row.name);
};

const lerSchemaVersion = async (db: SQLiteDatabase): Promise<number> => {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM migrations ORDER BY id DESC LIMIT 1',
  );

  return row?.id ?? 0;
};

export const resumirBackup = (backup: BackupJson): ResumoTabela[] => {
  return Object.entries(backup.tabelas)
    .map(([tabela, linhas]) => ({ tabela, registros: linhas.length }))
    .sort((a, b) => a.tabela.localeCompare(b.tabela));
};

/** Le todas as tabelas de dados e monta o objeto de backup. */
export const exportarBanco = async (): Promise<BackupJson> => {
  const db = await getConnection();
  const tabelas = await listarTabelas(db);
  const dados: Record<string, LinhaBackup[]> = {};

  for (const tabela of tabelas) {
    dados[tabela] = await db.getAllAsync<LinhaBackup>(`SELECT * FROM "${tabela}"`);
  }

  return {
    formato: BACKUP_FORMATO,
    versao: BACKUP_VERSAO,
    schema_version: await lerSchemaVersion(db),
    exportado_em: new Date().toISOString(),
    tabelas: dados,
  };
};

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
};

const validarEstrutura = (bruto: unknown): BackupJson => {
  if (!ehObjeto(bruto)) {
    throw new BackupInvalidoError('O JSON precisa ser um objeto.');
  }

  if (bruto.formato !== BACKUP_FORMATO) {
    throw new BackupInvalidoError(
      `JSON nao e um backup do Finance Diario (campo "formato" deve ser "${BACKUP_FORMATO}").`,
    );
  }

  if (bruto.versao !== BACKUP_VERSAO) {
    throw new BackupInvalidoError(
      `Versao de backup nao suportada: ${String(bruto.versao)} (esperado ${BACKUP_VERSAO}).`,
    );
  }

  if (typeof bruto.schema_version !== 'number') {
    throw new BackupInvalidoError('Campo "schema_version" ausente ou invalido.');
  }

  if (!ehObjeto(bruto.tabelas)) {
    throw new BackupInvalidoError('Campo "tabelas" ausente ou invalido.');
  }

  for (const [tabela, linhas] of Object.entries(bruto.tabelas)) {
    if (!Array.isArray(linhas)) {
      throw new BackupInvalidoError(`A tabela "${tabela}" precisa ser uma lista.`);
    }

    const posicaoInvalida = linhas.findIndex((linha) => !ehObjeto(linha));
    if (posicaoInvalida >= 0) {
      throw new BackupInvalidoError(
        `Registro ${posicaoInvalida + 1} da tabela "${tabela}" nao e um objeto.`,
      );
    }
  }

  return bruto as BackupJson;
};

/** Faz o parse e valida a forma do JSON, sem tocar no banco. */
export const analisarBackup = (texto: string): BackupJson => {
  const limpo = texto.trim();

  if (!limpo) {
    throw new BackupInvalidoError('Cole o JSON do backup antes de continuar.');
  }

  let bruto: unknown;

  try {
    bruto = JSON.parse(limpo);
  } catch (error: unknown) {
    const detalhe = error instanceof Error ? error.message : 'formato desconhecido';
    throw new BackupInvalidoError(`JSON invalido: ${detalhe}`);
  }

  return validarEstrutura(bruto);
};

/**
 * Confere o backup contra o schema atual antes de qualquer escrita: melhor
 * recusar tudo do que apagar o banco e descobrir no meio que uma tabela ou
 * coluna do JSON nao existe mais.
 */
const validarContraSchema = async (db: SQLiteDatabase, backup: BackupJson): Promise<void> => {
  const schemaAtual = await lerSchemaVersion(db);

  if (backup.schema_version > schemaAtual) {
    throw new BackupInvalidoError(
      `Backup gerado por uma versao mais nova do app (schema ${backup.schema_version}, ` +
        `este app esta no ${schemaAtual}). Atualize o app antes de importar.`,
    );
  }

  const tabelasDoBanco = await listarTabelas(db);
  const desconhecidas = Object.keys(backup.tabelas).filter(
    (tabela) => !tabelasDoBanco.includes(tabela),
  );

  if (desconhecidas.length > 0) {
    throw new BackupInvalidoError(
      `Tabelas que nao existem neste banco: ${desconhecidas.join(', ')}.`,
    );
  }

  for (const [tabela, linhas] of Object.entries(backup.tabelas)) {
    const colunas = await listarColunas(db, tabela);
    const invalidas = new Set<string>();

    for (const linha of linhas) {
      for (const coluna of Object.keys(linha)) {
        if (!colunas.includes(coluna)) {
          invalidas.add(coluna);
        }
      }
    }

    if (invalidas.size > 0) {
      throw new BackupInvalidoError(
        `Colunas inexistentes em "${tabela}": ${[...invalidas].join(', ')}.`,
      );
    }
  }
};

const normalizarValor = (tabela: string, coluna: string, valor: unknown): ValorBind => {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (typeof valor === 'boolean') {
    return valor ? 1 : 0;
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    return valor;
  }

  throw new BackupInvalidoError(
    `Valor nao suportado em "${tabela}"."${coluna}": ${JSON.stringify(valor)}.`,
  );
};

/** Insere as linhas de uma tabela reaproveitando o statement por conjunto de colunas. */
const inserirLinhas = async (
  db: SQLiteDatabase,
  tabela: string,
  linhas: LinhaBackup[],
): Promise<void> => {
  const grupos = new Map<string, { colunas: string[]; linhas: LinhaBackup[] }>();

  for (const linha of linhas) {
    const colunas = Object.keys(linha);
    const chave = colunas.join(' ');
    const grupo = grupos.get(chave);

    if (grupo) {
      grupo.linhas.push(linha);
    } else {
      grupos.set(chave, { colunas, linhas: [linha] });
    }
  }

  for (const { colunas, linhas: doGrupo } of grupos.values()) {
    if (colunas.length === 0) {
      throw new BackupInvalidoError(`Ha registro sem nenhuma coluna na tabela "${tabela}".`);
    }

    const sql =
      `INSERT INTO "${tabela}" (${colunas.map((coluna) => `"${coluna}"`).join(', ')}) ` +
      `VALUES (${colunas.map(() => '?').join(', ')})`;

    const statement = await db.prepareAsync(sql);

    try {
      for (const linha of doGrupo) {
        await statement.executeAsync(
          colunas.map((coluna) => normalizarValor(tabela, coluna, linha[coluna])),
        );
      }
    } finally {
      await statement.finalizeAsync();
    }
  }
};

/**
 * Substitui todo o conteudo do banco pelo do backup.
 *
 * As FKs ficam desligadas durante a carga porque as tabelas sao gravadas em
 * ordem arbitraria; se algo falhar, a transacao volta atras e o banco continua
 * como estava. O schema (tabelas, indices, migrations aplicadas) nao e tocado.
 */
export const importarBanco = async (backup: BackupJson): Promise<ResumoTabela[]> => {
  const db = await getConnection();
  await validarContraSchema(db, backup);

  const tabelasDoBanco = await listarTabelas(db);
  const temSequence =
    (await db.getFirstAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'`,
    )) !== null;

  // PRAGMA foreign_keys e ignorado dentro de uma transacao.
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  try {
    await db.withTransactionAsync(async () => {
      for (const tabela of tabelasDoBanco) {
        await db.runAsync(`DELETE FROM "${tabela}"`);
      }

      // Zera os contadores de AUTOINCREMENT; os inserts com id explicito os
      // reposicionam no maior id importado.
      if (temSequence) {
        await db.runAsync('DELETE FROM sqlite_sequence');
      }

      for (const [tabela, linhas] of Object.entries(backup.tabelas)) {
        await inserirLinhas(db, tabela, linhas);
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  return resumirBackup(backup);
};
