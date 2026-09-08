import type { HistoricoPreco } from '../../models/historicoPreco';

/** Como os registros de preco sao agrupados na lista. */
export type Agrupamento = 'variante' | 'produto';

export type Ordenacao = 'menorPreco' | 'recente' | 'nome';

export type GrupoPreco = {
  /** Id da variante ou do produto, conforme o agrupamento. */
  chave: string;
  titulo: string;
  subtitulo: string;
  /** Registros do grupo, do mais recente para o mais antigo. */
  registros: HistoricoPreco[];
  atual: number;
  menor: number;
  maior: number;
  media: number;
  registroMenor: HistoricoPreco;
  registroAtual: HistoricoPreco;
};
