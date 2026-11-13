import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { opcoesDeEmpresa, sugerirCategoriaDaEmpresa } from './empresasPorCategoria';

const EMPRESAS = [
  { id: 'bahamas', nome: 'Bahamas' },
  { id: 'drogaria', nome: 'Drogaria' },
  { id: 'loja', nome: 'Loja nova' },
];

const LIGACOES = new Map<string, string[]>([
  ['bahamas', ['mercado', 'compras']],
  ['drogaria', ['saude']],
]);

const ocultas = (categoriaId: string | null): string[] =>
  opcoesDeEmpresa(EMPRESAS, LIGACOES, categoriaId)
    .filter((opcao) => opcao.oculta)
    .map((opcao) => opcao.id);

describe('opcoesDeEmpresa', () => {
  test('sem categoria escolhida nada e escondido', () => {
    assert.deepEqual(ocultas(null), []);
  });

  test('esconde a empresa ligada so a outras categorias', () => {
    assert.deepEqual(ocultas('mercado'), ['drogaria']);
    assert.deepEqual(ocultas('saude'), ['bahamas']);
  });

  test('empresa sem categoria aparece em qualquer categoria', () => {
    assert.deepEqual(ocultas('lazer'), ['bahamas', 'drogaria']);
  });

  test('mantem a ordem e os nomes recebidos', () => {
    assert.deepEqual(
      opcoesDeEmpresa(EMPRESAS, LIGACOES, 'mercado').map((opcao) => opcao.nome),
      ['Bahamas', 'Drogaria', 'Loja nova'],
    );
  });
});

describe('sugerirCategoriaDaEmpresa', () => {
  const CATEGORIAS = [
    { id: 'mercado', tipo: 'saida' },
    { id: 'compras', tipo: 'saida' },
    { id: 'saude', tipo: 'saida' },
    { id: 'outros', tipo: 'saida' },
    { id: 'salario', tipo: 'entrada' },
  ];

  const sugerir = (
    empresaId: string,
    tipo: string,
    ultimas: [string, string][] = [],
    ligacoes: Map<string, string[]> = LIGACOES,
  ): string | null =>
    sugerirCategoriaDaEmpresa(empresaId, tipo, CATEGORIAS, new Map(ultimas), ligacoes);

  test('empresa sem categoria ligada sugere a do ultimo lancamento', () => {
    assert.equal(sugerir('loja', 'saida', [['loja', 'outros']]), 'outros');
    assert.equal(sugerir('loja', 'saida'), null);
  });

  test('a unica categoria ligada vale mesmo sem lancamento anterior', () => {
    assert.equal(sugerir('drogaria', 'saida'), 'saude');
  });

  test('a categoria ligada ganha da ultima usada que nao e da empresa', () => {
    assert.equal(sugerir('drogaria', 'saida', [['drogaria', 'outros']]), 'saude');
  });

  test('com varias ligadas, vale a usada por ultimo entre elas', () => {
    assert.equal(sugerir('bahamas', 'saida', [['bahamas', 'compras']]), 'compras');
  });

  test('com varias ligadas e nenhuma usada, nao sugere', () => {
    assert.equal(sugerir('bahamas', 'saida'), null);
    assert.equal(sugerir('bahamas', 'saida', [['bahamas', 'outros']]), null);
  });

  test('nao sugere categoria de outro tipo', () => {
    assert.equal(sugerir('drogaria', 'entrada'), null);
    assert.equal(sugerir('loja', 'entrada', [['loja', 'outros']]), null);
  });

  test('ligacao de outro tipo nao bloqueia a ultima usada', () => {
    const ligacoes = new Map([['empregador', ['salario']]]);

    assert.equal(sugerir('empregador', 'saida', [['empregador', 'outros']], ligacoes), 'outros');
    assert.equal(sugerir('empregador', 'entrada', [], ligacoes), 'salario');
  });
});
