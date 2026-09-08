import type { ResumoTabela } from '../../models/backup';

/** Aba ativa da tela de integracao. */
export type ModoIntegracao = 'exportar' | 'importar';

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
