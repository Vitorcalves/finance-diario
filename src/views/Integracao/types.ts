import type { ResumoTabela } from '../../models/backup';

/** Aba ativa da tela de integracao. */
export type ModoIntegracao = 'exportar' | 'importar' | 'api';

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
