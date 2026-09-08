import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { HistoricoPreco } from '../../models/historicoPreco';
import { definirBaseComparacao, normalizarGrupo, valorComparavel } from './normalizacao';
import type { GrupoPreco, RegistroPreco } from './types';

const registro = (id: string, preco: number, data = '2026-01-01'): HistoricoPreco => ({
  id,
  produto_id: 'p1',
  variante_id: `v-${id}`,
  empresa_id: null,
  preco,
  data,
  created_at: data,
});

/** Registro com preco por kg ja calculado. */
const porKg = (id: string, preco: number, valorKg: number): RegistroPreco => ({
  registro: registro(id, preco),
  unitario: { valor: valorKg, unidadeId: 2, sigla: 'kg' },
});

const semMedida = (id: string, preco: number): RegistroPreco => ({
  registro: registro(id, preco),
  unitario: null,
});

describe('normalizarGrupo', () => {
  // Ordem esperada pelo hook: do mais recente para o mais antigo.
  const grupo = [porKg('r1', 24.99, 4.998), porKg('r2', 5, 10), porKg('r3', 6, 6)];

  test('atual e o registro mais recente, nao o mais barato', () => {
    const norm = normalizarGrupo([porKg('caro', 5, 10), porKg('barato', 24.99, 4.998)]);
    assert.equal(norm.status, 'ok');
    assert.equal(norm.status === 'ok' && norm.atual, 10);
    assert.equal(norm.status === 'ok' && norm.menor, 4.998);
  });

  test('menor, maior e media saem da escala unitaria', () => {
    const norm = normalizarGrupo(grupo);
    assert.equal(norm.status, 'ok');

    if (norm.status !== 'ok') return;
    assert.equal(norm.menor, 4.998);
    assert.equal(norm.maior, 10);
    assert.equal(Number(norm.media.toFixed(4)), 6.9993);
    assert.equal(norm.sigla, 'kg');
    assert.equal(norm.unidadeId, 2);
  });

  test('aponta os registros de origem do atual e do menor', () => {
    const norm = normalizarGrupo(grupo);
    if (norm.status !== 'ok') return assert.fail('esperava ok');

    assert.equal(norm.registroAtual.id, 'r1');
    assert.equal(norm.registroMenor.id, 'r1');
  });

  test('registro sem medida fica de fora do calculo, mas e contado', () => {
    const norm = normalizarGrupo([porKg('r1', 24.99, 4.998), semMedida('r4', 1)]);
    if (norm.status !== 'ok') return assert.fail('esperava ok');

    assert.equal(norm.semMedida, 1);
    // R$ 1,00 e o menor preco pago, mas nao entra por nao ter medida.
    assert.equal(norm.menor, 4.998);
  });

  test('grupo inteiro sem medida nao normaliza', () => {
    assert.equal(normalizarGrupo([semMedida('a', 1), semMedida('b', 2)]).status, 'semMedida');
  });

  test('grupo vazio nao normaliza', () => {
    assert.equal(normalizarGrupo([]).status, 'semMedida');
  });

  test('medidas de grupos diferentes nao tem base comum', () => {
    const norm = normalizarGrupo([
      porKg('r1', 24.99, 4.998),
      { registro: registro('r5', 8), unitario: { valor: 8, unidadeId: 7, sigla: 'un' } },
    ]);
    assert.equal(norm.status, 'unidadesIncompativeis');
  });

  test('um unico registro normaliza com atual igual a menor e maior', () => {
    const norm = normalizarGrupo([porKg('r1', 24.99, 4.998)]);
    if (norm.status !== 'ok') return assert.fail('esperava ok');

    assert.equal(norm.atual, 4.998);
    assert.equal(norm.menor, 4.998);
    assert.equal(norm.maior, 4.998);
    assert.equal(norm.semMedida, 0);
  });
});

const grupoPreco = (
  chave: string,
  atual: number,
  normalizado: GrupoPreco['normalizado'],
): GrupoPreco => ({
  chave,
  titulo: chave,
  subtitulo: '',
  registros: [],
  atual,
  menor: atual,
  maior: atual,
  media: atual,
  registroMenor: registro(chave, atual),
  registroAtual: registro(chave, atual),
  normalizado,
});

const metricas = (valor: number, unidadeId: number, sigla: string): GrupoPreco['normalizado'] => ({
  status: 'ok',
  unidadeId,
  sigla,
  atual: valor,
  menor: valor,
  maior: valor,
  media: valor,
  registroAtual: registro('x', 0),
  registroMenor: registro('x', 0),
  semMedida: 0,
});

describe('definirBaseComparacao', () => {
  test('todos na mesma unidade primaria comparam por unidade', () => {
    const grupos = [
      grupoPreco('5kg', 24.99, metricas(4.998, 2, 'kg')),
      grupoPreco('500g', 5, metricas(10, 2, 'kg')),
    ];
    assert.equal(definirBaseComparacao(grupos), 'unitario');
  });

  test('unidades diferentes entre grupos caem para o preco bruto', () => {
    const grupos = [
      grupoPreco('arroz', 24.99, metricas(4.998, 2, 'kg')),
      grupoPreco('leite', 9, metricas(9, 3, 'L')),
    ];
    assert.equal(definirBaseComparacao(grupos), 'bruto');
  });

  test('um grupo sem normalizacao derruba a base unitaria', () => {
    const grupos = [
      grupoPreco('arroz', 24.99, metricas(4.998, 2, 'kg')),
      grupoPreco('outro', 3, { status: 'semMedida' }),
    ];
    assert.equal(definirBaseComparacao(grupos), 'bruto');
  });

  test('lista vazia e bruto', () => {
    assert.equal(definirBaseComparacao([]), 'bruto');
  });

  test('grupo unico normalizado ja e unitario', () => {
    assert.equal(
      definirBaseComparacao([grupoPreco('5kg', 24.99, metricas(4.998, 2, 'kg'))]),
      'unitario',
    );
  });
});

describe('valorComparavel', () => {
  const cincoKg = grupoPreco('5kg', 24.99, metricas(4.998, 2, 'kg'));
  const meioKg = grupoPreco('500g', 5, metricas(10, 2, 'kg'));

  test('na base unitaria usa o preco por unidade', () => {
    assert.equal(valorComparavel(cincoKg, 'unitario'), 4.998);
    assert.equal(valorComparavel(meioKg, 'unitario'), 10);
  });

  test('na base bruta usa o preco pago', () => {
    assert.equal(valorComparavel(cincoKg, 'bruto'), 24.99);
  });

  test('sem normalizacao cai no preco pago mesmo pedindo unitario', () => {
    const grupo = grupoPreco('x', 7, { status: 'semMedida' });
    assert.equal(valorComparavel(grupo, 'unitario'), 7);
  });

  test('o melhor preco por unidade nao e o mais barato na etiqueta', () => {
    const base = definirBaseComparacao([cincoKg, meioKg]);
    const melhor = Math.min(...[cincoKg, meioKg].map((g) => valorComparavel(g, base)));

    assert.equal(melhor, valorComparavel(cincoKg, base));
    assert.notEqual(melhor, valorComparavel(meioKg, base));
    // Na etiqueta o de 500 g e o mais barato: e o engano que a tela evitava mostrar.
    assert.ok(meioKg.atual < cincoKg.atual);
  });
});
