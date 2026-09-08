import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Unidades } from './unidades';

describe('porId / descricaoPorId', () => {
  test('acha a unidade cadastrada', () => {
    assert.equal(Unidades.porId(4)?.descricao, 'Gramas');
    assert.equal(Unidades.descricaoPorId(3), 'Litros');
  });

  test('id desconhecido nao quebra', () => {
    assert.equal(Unidades.porId(999), undefined);
    assert.equal(Unidades.porId(null), undefined);
    assert.equal(Unidades.descricaoPorId(999), '');
    assert.equal(Unidades.descricaoPorId(null), '');
  });
});

describe('listar', () => {
  test('devolve copia, para ninguem alterar a tabela por engano', () => {
    const lista = Unidades.listar();
    lista.pop();
    assert.notEqual(Unidades.listar().length, lista.length);
  });

  test('todo grupo tem exatamente uma unidade primaria com fator 1', () => {
    const grupos = new Set(Unidades.listar().map((unidade) => unidade.grupo));

    for (const grupo of grupos) {
      const primarias = Unidades.listar().filter(
        (unidade) => unidade.grupo === grupo && unidade.primario,
      );
      assert.equal(primarias.length, 1, `grupo ${grupo}`);
      assert.equal(primarias[0].fatorParaPrimaria, 1, `grupo ${grupo}`);
    }
  });

  test('ids e siglas nao se repetem', () => {
    const ids = Unidades.listar().map((unidade) => unidade.id);
    const siglas = Unidades.listar().map((unidade) => unidade.sigla);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(siglas).size, siglas.length);
  });
});

describe('mesmoGrupo', () => {
  test('gramas e quilogramas sao massa', () => {
    assert.equal(Unidades.mesmoGrupo(4, 2), true);
  });

  test('massa e volume nao', () => {
    assert.equal(Unidades.mesmoGrupo(4, 3), false);
  });

  test('id invalido devolve false em vez de estourar', () => {
    assert.equal(Unidades.mesmoGrupo(999, 2), false);
  });
});

describe('converter', () => {
  test('sobe e desce dentro do grupo', () => {
    assert.equal(Unidades.converter(500, 4, 2), 0.5);
    assert.equal(Unidades.converter(2, 2, 4), 2000);
    assert.equal(Unidades.converter(1500, 6, 3), 1.5);
    assert.equal(Unidades.converter(250, 5, 1), 2.5);
  });

  test('converter para a mesma unidade nao muda nada', () => {
    assert.equal(Unidades.converter(7.5, 2, 2), 7.5);
  });

  test('ida e volta preserva o valor', () => {
    assert.equal(Number(Unidades.converter(Unidades.converter(350, 6, 3), 3, 6).toFixed(6)), 350);
  });

  test('recusa converter entre grupos diferentes', () => {
    assert.throws(() => Unidades.converter(1, 4, 3), /Não é possível converter/);
  });

  test('recusa unidade inexistente', () => {
    assert.throws(() => Unidades.converter(1, 999, 2), /Unidade inválida/);
  });
});

describe('primariaDe', () => {
  test('leva cada unidade a primaria do seu grupo', () => {
    assert.equal(Unidades.primariaDe(4)?.descricao, 'Quilogramas');
    assert.equal(Unidades.primariaDe(6)?.descricao, 'Litros');
    assert.equal(Unidades.primariaDe(5)?.descricao, 'Metros');
    assert.equal(Unidades.primariaDe(7)?.descricao, 'Unidade');
  });

  test('a primaria de uma primaria e ela mesma', () => {
    assert.equal(Unidades.primariaDe(2)?.id, 2);
  });

  test('toda unidade cadastrada tem primaria', () => {
    for (const unidade of Unidades.listar()) {
      assert.ok(Unidades.primariaDe(unidade.id), `sem primaria: ${unidade.descricao}`);
    }
  });

  test('id desconhecido devolve undefined', () => {
    assert.equal(Unidades.primariaDe(999), undefined);
    assert.equal(Unidades.primariaDe(null), undefined);
  });
});
