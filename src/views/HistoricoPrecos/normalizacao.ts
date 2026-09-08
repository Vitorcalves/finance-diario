import type { PrecoPorUnidade } from '../../utils/variantes';
import type { BaseComparacao, GrupoPreco, Normalizacao, RegistroPreco } from './types';

/**
 * Reducao dos precos de um grupo a unidade primaria.
 *
 * E o que permite escolher entre alternativas: dois registros de R$ 24,99 nao
 * dizem nada quando um e de 5 kg e o outro de 1 kg, mas R$ 5,00/kg contra
 * R$ 24,99/kg diz.
 */

type RegistroComMedida = RegistroPreco & { unitario: PrecoPorUnidade };

const temMedida = (item: RegistroPreco): item is RegistroComMedida => item.unitario !== null;

/**
 * Registros sem medida ficam de fora em vez de derrubar a comparacao inteira;
 * ja medidas de grupos diferentes (massa x avulso) nao tem base comum e
 * invalidam a normalizacao.
 *
 * Espera `registros` do mais recente para o mais antigo, como monta o hook.
 */
export const normalizarGrupo = (registros: RegistroPreco[]): Normalizacao => {
  const comMedida = registros.filter(temMedida);

  if (comMedida.length === 0) {
    return { status: 'semMedida' };
  }

  const { unidadeId, sigla } = comMedida[0].unitario;

  if (comMedida.some((item) => item.unitario.unidadeId !== unidadeId)) {
    return { status: 'unidadesIncompativeis' };
  }

  const valores = comMedida.map((item) => item.unitario.valor);
  const menor = Math.min(...valores);

  return {
    status: 'ok',
    unidadeId,
    sigla,
    atual: comMedida[0].unitario.valor,
    menor,
    maior: Math.max(...valores),
    media: valores.reduce((soma, valor) => soma + valor, 0) / valores.length,
    registroAtual: comMedida[0].registro,
    registroMenor: (comMedida.find((item) => item.unitario.valor === menor) ?? comMedida[0])
      .registro,
    semMedida: registros.length - comMedida.length,
  };
};

/** Valor de um grupo na escala em que os grupos estao sendo comparados. */
export const valorComparavel = (grupo: GrupoPreco, base: BaseComparacao): number =>
  base === 'unitario' && grupo.normalizado.status === 'ok' ? grupo.normalizado.atual : grupo.atual;

/**
 * So compara por unidade quando todo grupo reduz a mesma unidade primaria.
 * Misturar R$/kg com R$ da embalagem produziria um "melhor preco" sem sentido.
 */
export const definirBaseComparacao = (grupos: GrupoPreco[]): BaseComparacao => {
  const unidades = grupos.map((grupo) =>
    grupo.normalizado.status === 'ok' ? grupo.normalizado.unidadeId : null,
  );

  const primeira = unidades[0];

  return primeira !== null && primeira !== undefined && unidades.every((id) => id === primeira)
    ? 'unitario'
    : 'bruto';
};
