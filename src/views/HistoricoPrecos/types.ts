import type { HistoricoPreco } from '../../models/historicoPreco';
import type { PrecoPorUnidade } from '../../utils/variantes';

/** Como os registros de preco sao agrupados na lista. */
export type Agrupamento = 'variante' | 'produto';

export type Ordenacao = 'menorPreco' | 'recente' | 'nome';

/** Registro do historico ja com o preco reduzido a unidade primaria. */
export type RegistroPreco = {
  registro: HistoricoPreco;
  /** `null` quando a variante nao tem quantidade e unidade cadastradas. */
  unitario: PrecoPorUnidade | null;
};

export type MetricasUnitarias = {
  /** Unidade primaria em que as metricas estao expressas. */
  unidadeId: number;
  sigla: string;
  atual: number;
  menor: number;
  maior: number;
  media: number;
  registroAtual: HistoricoPreco;
  registroMenor: HistoricoPreco;
  /** Registros deixados de fora por nao terem medida cadastrada. */
  semMedida: number;
};

/**
 * Comparacao por unidade primaria do grupo.
 *
 * `semMedida`: nenhum registro tem quantidade/unidade na variante.
 * `unidadesIncompativeis`: o grupo mistura medidas de grupos diferentes
 * (ex.: uma variante em gramas e outra avulsa), entao nao ha base comum.
 */
export type Normalizacao =
  | ({ status: 'ok' } & MetricasUnitarias)
  | { status: 'semMedida' }
  | { status: 'unidadesIncompativeis' };

/**
 * Escala usada para comparar grupos entre si: `unitario` quando todos os grupos
 * reduzem a mesma unidade primaria, `bruto` (preco da embalagem) caso contrario.
 */
export type BaseComparacao = 'unitario' | 'bruto';

export type GrupoPreco = {
  /** Id da variante ou do produto, conforme o agrupamento. */
  chave: string;
  titulo: string;
  subtitulo: string;
  /** Registros do grupo, do mais recente para o mais antigo. */
  registros: RegistroPreco[];
  atual: number;
  menor: number;
  maior: number;
  media: number;
  registroMenor: HistoricoPreco;
  registroAtual: HistoricoPreco;
  /** Mesmas metricas por unidade primaria, para comparar embalagens diferentes. */
  normalizado: Normalizacao;
};
