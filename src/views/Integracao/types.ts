import type { ResumoTabela } from '../../models/backup';
import type { RespostaIa } from '../../models/sincronizacaoApi';

/** Aba ativa da tela de integracao. */
export type ModoIntegracao = 'exportar' | 'importar' | 'api' | 'ia';

export type ResultadoExportacao = {
  json: string;
  /** Contagem de registros por tabela, mostrada acima do JSON. */
  resumo: ResumoTabela[];
  geradoEm: string;
};

/** Previa do JSON colado, antes de confirmar a sobrescrita. */
export type PreviaImportacao = {
  resumo: ResumoTabela[];
  schemaVersion: number;
  exportadoEm: string;
  totalRegistros: number;
};

/** Ultimo envio bem-sucedido para a API, mostrado na aba API. */
export type ResultadoEnvioApi = {
  id: number;
  recebidoEm: string;
  totalRegistros: number;
  resumo: ResumoTabela[];
  ignorados: string[];
};

/** Ultima resposta do modelo, mostrada na aba IA junto com a pergunta que a gerou. */
export type ResultadoConsultaIa = {
  pergunta: string;
  resposta: RespostaIa;
  /** Momento em que a resposta chegou, em ISO. */
  recebidoEm: string;
};
