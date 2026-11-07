import { v4 as uuidv4 } from 'uuid';
import { getConnection } from './database';

/** Anotacao rapida do que ainda falta lancar. */
export type NotaLancamento = {
  id: string;
  texto: string;
  created_at: string;
  updated_at: string;
};

export class ValidacaoNotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoNotaError';
  }
}

/** Junta espacos e quebras de linha repetidos; nota vazia nao e gravada. */
export const normalizarTextoNota = (texto: string): string => {
  const limpo = texto.replace(/\s+/g, ' ').trim();

  if (!limpo) {
    throw new ValidacaoNotaError('Escreva ou dite a nota antes de salvar.');
  }

  return limpo;
};

/** Mais antigas primeiro: e a ordem em que os gastos aconteceram. */
export const listNotasLancamento = async (): Promise<NotaLancamento[]> => {
  const db = await getConnection();

  return db.getAllAsync<NotaLancamento>(
    `
        SELECT id, texto, created_at, updated_at
        FROM notas_lancamento
        ORDER BY created_at, id
    `,
  );
};

export const contarNotasLancamento = async (): Promise<number> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM notas_lancamento',
  );
  return row?.total ?? 0;
};

export const insertNotaLancamento = async (
  texto: string,
  agora: string = new Date().toISOString(),
): Promise<NotaLancamento> => {
  const nota: NotaLancamento = {
    id: uuidv4(),
    texto: normalizarTextoNota(texto),
    created_at: agora,
    updated_at: agora,
  };
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO notas_lancamento (id, texto, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `,
    [nota.id, nota.texto, nota.created_at, nota.updated_at],
  );

  return nota;
};

/** Troca o texto; a data de criacao (e a posicao na lista) nao muda. */
export const updateNotaLancamento = async (
  id: string,
  texto: string,
  agora: string = new Date().toISOString(),
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync('UPDATE notas_lancamento SET texto = ?, updated_at = ? WHERE id = ?', [
    normalizarTextoNota(texto),
    agora,
    id,
  ]);
};

export const deleteNotaLancamento = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM notas_lancamento WHERE id = ?', [id]);
};

/** Desfaz uma exclusao: grava a nota de volta com o mesmo id e datas. */
export const restaurarNotaLancamento = async (nota: NotaLancamento): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT OR REPLACE INTO notas_lancamento (id, texto, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `,
    [nota.id, nota.texto, nota.created_at, nota.updated_at],
  );
};
