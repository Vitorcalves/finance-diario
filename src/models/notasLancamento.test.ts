import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararBanco } from '../../tests/setup/banco';
import {
  contarNotasLancamento,
  deleteNotaLancamento,
  insertNotaLancamento,
  listNotasLancamento,
  normalizarTextoNota,
  restaurarNotaLancamento,
  updateNotaLancamento,
  ValidacaoNotaError,
} from './notasLancamento';

beforeEach(async () => {
  await prepararBanco();
});

describe('notas de lancamento', () => {
  test('normaliza espacos e recusa nota vazia', () => {
    assert.equal(normalizarTextoNota('  almoço\n 35   ontem '), 'almoço 35 ontem');
    assert.throws(() => normalizarTextoNota(' \n '), ValidacaoNotaError);
  });

  test('grava e lista da mais antiga para a mais nova', async () => {
    await insertNotaLancamento('segunda', '2026-11-06T10:00:00.000Z');
    await insertNotaLancamento('primeira', '2026-11-05T10:00:00.000Z');

    const notas = await listNotasLancamento();
    assert.deepEqual(
      notas.map((nota) => nota.texto),
      ['primeira', 'segunda'],
    );
    assert.equal(await contarNotasLancamento(), 2);
  });

  test('editar troca o texto e mantem a data de criacao', async () => {
    const nota = await insertNotaLancamento('almoço 35', '2026-11-05T10:00:00.000Z');
    await updateNotaLancamento(nota.id, 'almoço 38', '2026-11-06T10:00:00.000Z');

    const [editada] = await listNotasLancamento();
    assert.equal(editada.texto, 'almoço 38');
    assert.equal(editada.created_at, '2026-11-05T10:00:00.000Z');
    assert.equal(editada.updated_at, '2026-11-06T10:00:00.000Z');
  });

  test('excluir e desfazer devolvem a mesma nota', async () => {
    const nota = await insertNotaLancamento('uber 20');
    await deleteNotaLancamento(nota.id);
    assert.equal(await contarNotasLancamento(), 0);

    await restaurarNotaLancamento(nota);
    assert.deepEqual(await listNotasLancamento(), [nota]);
  });
});
