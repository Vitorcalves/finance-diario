import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { correspondeBusca, filtrarPorTexto, normalizarTexto } from './busca';

const empresas = new Map([['e1', 'Supermercado Bahamas']]);
const nomeEmpresa = (id?: string | null): string => (id ? (empresas.get(id) ?? '') : '');

const lancamentos = [
  {
    id: '1',
    descricao: 'Compra do mês',
    empresa_id: 'e1',
    itens_texto: 'Arroz 5kg Açúcar cristal',
  },
  { id: '2', descricao: 'Uber', empresa_id: null, itens_texto: null },
  { id: '3', descricao: 'Padaria', empresa_id: null, itens_texto: 'Pão francês' },
];

const ids = (lista: { id: string }[]): string[] => lista.map((item) => item.id);

describe('normalizarTexto', () => {
  test('tira acentos, cedilha e maiusculas', () => {
    assert.equal(normalizarTexto('  Açúcar CRISTAL '), 'acucar cristal');
  });
});

describe('filtrarPorTexto', () => {
  test('termo vazio devolve tudo', () => {
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, '  ', nomeEmpresa)), ['1', '2', '3']);
  });

  test('acha pela descricao ignorando maiusculas', () => {
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'uber', nomeEmpresa)), ['2']);
  });

  test('acha pelos itens comprados sem precisar de acento', () => {
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'acucar', nomeEmpresa)), ['1']);
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'pao', nomeEmpresa)), ['3']);
  });

  test('acha pelo nome da empresa', () => {
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'bahamas', nomeEmpresa)), ['1']);
  });

  test('todas as palavras precisam aparecer, em qualquer campo', () => {
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'arroz bahamas', nomeEmpresa)), ['1']);
    assert.deepEqual(ids(filtrarPorTexto(lancamentos, 'arroz uber', nomeEmpresa)), []);
  });
});

describe('correspondeBusca', () => {
  test('acha sem acento e por trecho do meio do nome', () => {
    assert.equal(correspondeBusca('Açúcar Cristal 1kg', 'acucar'), true);
    assert.equal(correspondeBusca('Açúcar Cristal 1kg', 'cris'), true);
    assert.equal(correspondeBusca('Pão de Forma', 'FORMA'), true);
  });

  test('cada palavra pode estar em qualquer ponto, em qualquer ordem', () => {
    assert.equal(correspondeBusca('Arroz Integral Tio João', 'int arroz'), true);
    assert.equal(correspondeBusca('Arroz Integral Tio João', 'joao tio'), true);
    assert.equal(correspondeBusca('Arroz Integral Tio João', 'arroz feijao'), false);
  });

  test('termo vazio aceita tudo', () => {
    assert.equal(correspondeBusca('Qualquer', '   '), true);
  });
});
