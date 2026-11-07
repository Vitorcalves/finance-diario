import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { type CatalogoNota, interpretarNota } from './interpretarNota';

// 2026-11-06 e uma sexta-feira.
const HOJE = '2026-11-06';

const catalogo: CatalogoNota = {
  contas: [
    { id: 'caixa', nome: 'Carteira', tipo: 'caixa' },
    { id: 'nubank', nome: 'Nubank', tipo: 'cartao' },
    { id: 'inter', nome: 'Inter', tipo: 'cartao' },
  ],
  empresas: [
    { id: 'pao', nome: 'Padaria Pão Quente' },
    { id: 'carrefour', nome: 'Carrefour' },
  ],
  categorias: [
    { id: 'alim', nome: 'Alimentação', tipo: 'saida' },
    { id: 'mercado', nome: 'Mercado', tipo: 'saida' },
    { id: 'salario', nome: 'Salário', tipo: 'entrada' },
  ],
  categoriaPorEmpresa: new Map([['carrefour', 'mercado']]),
};

const ler = (texto: string): ReturnType<typeof interpretarNota> =>
  interpretarNota(texto, catalogo, HOJE);

describe('interpretarNota', () => {
  test('exemplo da tarefa: valor, ontem e cartao', () => {
    assert.deepEqual(ler('almoço 35 ontem no cartão'), {
      tipo: 'saida',
      descricao: 'Almoço',
      valor: 35,
      data: '2026-11-05',
      contaId: 'nubank',
    });
  });

  test('valores com centavos, R$, milhar e "reais e"', () => {
    assert.equal(ler('uber 23,90').valor, 23.9);
    assert.equal(ler('uber 23.9').valor, 23.9);
    assert.equal(ler('geladeira R$ 1.234,56').valor, 1234.56);
    assert.equal(ler('pizza 45 reais e 50').valor, 45.5);
    assert.equal(ler('pizza 45 reais e 50 centavos').descricao, 'Pizza');
  });

  test('prefere o numero marcado como dinheiro', () => {
    const nota = ler('2 pães e leite 12 reais');
    assert.equal(nota.valor, 12);
    assert.equal(nota.descricao, '2 pães e leite');
  });

  test('sem valor, o rascunho nao inventa um', () => {
    const nota = ler('farmácia');
    assert.equal(nota.valor, undefined);
    assert.equal(nota.descricao, 'Farmácia');
  });

  test('datas: anteontem, dia do mes, dd/mm e dia da semana', () => {
    assert.equal(ler('cinema 40 anteontem').data, '2026-11-04');
    assert.equal(ler('cinema 40 dia 3').data, '2026-11-03');
    // Dia que ainda nao chegou neste mes: e o do mes passado.
    assert.equal(ler('cinema 40 dia 20').data, '2026-10-20');
    assert.equal(ler('cinema 40 em 02/11').data, '2026-11-02');
    assert.equal(ler('cinema 40 em 25/12').data, '2025-12-25');
    assert.equal(ler('cinema 40 em 02/11/2025').data, '2025-11-02');
    assert.equal(ler('cinema 40 na terça').data, '2026-11-03');
    assert.equal(ler('cinema 40 sexta-feira').data, HOJE);
    assert.equal(ler('cinema 40').data, undefined);
  });

  test('data nao vira valor', () => {
    const nota = ler('gasolina dia 3 150');
    assert.equal(nota.valor, 150);
    assert.equal(nota.data, '2026-11-03');
    assert.equal(nota.descricao, 'Gasolina');
  });

  test('parcelas', () => {
    const nota = ler('tênis 600 em 3x no nubank');
    assert.equal(nota.parcelas, 3);
    assert.equal(nota.valor, 600);
    assert.equal(nota.contaId, 'nubank');
    assert.equal(nota.descricao, 'Tênis');
    assert.equal(ler('sofá 2000 parcelado em 10 vezes').parcelas, 10);
    assert.equal(ler('livro 50 1x').parcelas, undefined);
  });

  test('conta pelo nome e pelo cartao generico', () => {
    assert.equal(ler('mercado 80 no cartão inter').contaId, 'inter');
    assert.equal(ler('mercado 80 no cartão inter').descricao, 'Mercado');
    assert.equal(ler('mercado 80 no crédito').contaId, 'nubank');
    assert.equal(ler('mercado 80 no pix').contaId, undefined);
    assert.equal(ler('mercado 80 no pix').descricao, 'Mercado');
  });

  test('empresa pelo nome, com a categoria usada nela', () => {
    const nota = ler('compras no Carrefour 230');
    assert.equal(nota.empresaId, 'carrefour');
    assert.equal(nota.categoriaId, 'mercado');
    assert.equal(nota.descricao, 'Compras');
  });

  test('empresa com acento e varias palavras; sem descricao, vale o nome dela', () => {
    const nota = ler('padaria pao quente 18');
    assert.equal(nota.empresaId, 'pao');
    assert.equal(nota.descricao, 'Padaria Pão Quente');
  });

  test('categoria citada pelo nome fica tambem na descricao', () => {
    const nota = ler('alimentacao 30');
    assert.equal(nota.categoriaId, 'alim');
    assert.equal(nota.descricao, 'Alimentacao');
  });

  test('entrada', () => {
    const nota = ler('recebi 5000 de salário');
    assert.equal(nota.tipo, 'entrada');
    assert.equal(nota.valor, 5000);
    assert.equal(nota.categoriaId, 'salario');
    assert.equal(nota.descricao, 'Salário');
    // Entrada nao e parcelada.
    assert.equal(ler('recebi 300 em 3x').parcelas, undefined);
  });

  test('nomes curtos demais nao casam com pedacos de palavra', () => {
    const nota = interpretarNota(
      'xp 10',
      { ...catalogo, contas: [{ id: 'xp', nome: 'XP', tipo: 'caixa' }] },
      HOJE,
    );
    assert.equal(nota.contaId, undefined);
  });

  test('texto vazio vira rascunho so com o tipo', () => {
    assert.deepEqual(ler('   '), { tipo: 'saida' });
  });
});
