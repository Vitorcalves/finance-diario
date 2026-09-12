import { useCallback, useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import {
  analisarBackup,
  BackupInvalidoError,
  exportarBanco,
  importarBanco,
  resumirBackup,
} from '../../models/backup';
import { getApiConfig, saveApiConfig, type ApiConfig } from '../../models/settingsModel';
import {
  enviarParaApi as enviarBancoParaApi,
  SincronizacaoError,
} from '../../models/sincronizacaoApi';
import type { PreviaImportacao, ResultadoEnvioApi, ResultadoExportacao } from './types';

export type UseIntegracao = {
  exportacao: ResultadoExportacao | null;
  exportando: boolean;
  gerarExportacao: () => Promise<void>;
  compartilharExportacao: () => Promise<void>;

  textoImportacao: string;
  setTextoImportacao: (texto: string) => void;
  previa: PreviaImportacao | null;
  importando: boolean;
  /** Valida o JSON colado e monta a previa; nao escreve no banco. */
  validarImportacao: () => void;
  /** Pede confirmacao e sobrescreve o banco com o JSON validado. */
  confirmarImportacao: (aoConcluir?: () => void) => void;
  limparImportacao: () => void;

  apiConfig: ApiConfig;
  /** Atualiza e persiste endereco/chave da API. */
  setApiConfig: (config: ApiConfig) => void;
  envioApi: ResultadoEnvioApi | null;
  enviando: boolean;
  /** Exporta o banco e envia para `POST /sync` da API. So le o banco local. */
  enviarParaApi: () => Promise<void>;
};

const mensagemDeErro = (error: unknown, fallback: string): string => {
  if (error instanceof BackupInvalidoError || error instanceof SincronizacaoError) {
    return error.message;
  }

  return error instanceof Error ? `${fallback} (${error.message})` : fallback;
};

/** Estado da tela de integracao: gerar o JSON, sobrescrever a partir de um JSON e enviar para a API. */
export function useIntegracao(): UseIntegracao {
  const [exportacao, setExportacao] = useState<ResultadoExportacao | null>(null);
  const [exportando, setExportando] = useState(false);

  const [textoImportacao, setTextoImportacao] = useState('');
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [importando, setImportando] = useState(false);

  const [apiConfig, setApiConfigState] = useState<ApiConfig>({ url: '', token: '' });
  const [envioApi, setEnvioApi] = useState<ResultadoEnvioApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void getApiConfig().then(setApiConfigState);
  }, []);

  const gerarExportacao = useCallback(async (): Promise<void> => {
    setExportando(true);

    try {
      const backup = await exportarBanco();

      setExportacao({
        json: JSON.stringify(backup, null, 2),
        resumo: resumirBackup(backup),
        geradoEm: backup.exportado_em,
      });
    } catch (error: unknown) {
      console.error('Erro ao exportar banco:', error);
      Alert.alert('Erro', mensagemDeErro(error, 'Nao foi possivel exportar o banco'));
    } finally {
      setExportando(false);
    }
  }, []);

  const compartilharExportacao = useCallback(async (): Promise<void> => {
    if (!exportacao) {
      return;
    }

    try {
      await Share.share({ message: exportacao.json });
    } catch (error: unknown) {
      console.error('Erro ao compartilhar backup:', error);
      Alert.alert('Erro', 'Nao foi possivel compartilhar o JSON');
    }
  }, [exportacao]);

  const limparImportacao = useCallback((): void => {
    setTextoImportacao('');
    setPrevia(null);
  }, []);

  const alterarTextoImportacao = useCallback((texto: string): void => {
    setTextoImportacao(texto);
    // Qualquer edicao invalida a previa: ela precisa refletir o texto atual.
    setPrevia(null);
  }, []);

  const validarImportacao = useCallback((): void => {
    try {
      const backup = analisarBackup(textoImportacao);
      const resumo = resumirBackup(backup);

      setPrevia({
        resumo,
        schemaVersion: backup.schema_version,
        exportadoEm: backup.exportado_em,
        totalRegistros: resumo.reduce((total, item) => total + item.registros, 0),
      });
    } catch (error: unknown) {
      setPrevia(null);
      Alert.alert('JSON invalido', mensagemDeErro(error, 'Nao foi possivel ler o JSON'));
    }
  }, [textoImportacao]);

  const executarImportacao = useCallback(
    async (aoConcluir?: () => void): Promise<void> => {
      setImportando(true);

      try {
        const backup = analisarBackup(textoImportacao);
        const resumo = await importarBanco(backup);
        const total = resumo.reduce((soma, item) => soma + item.registros, 0);

        limparImportacao();
        Alert.alert('Sucesso', `Banco sobrescrito com ${total} registro(s).`);
        aoConcluir?.();
      } catch (error: unknown) {
        console.error('Erro ao importar banco:', error);
        Alert.alert(
          'Erro',
          mensagemDeErro(error, 'Nao foi possivel importar o JSON. O banco nao foi alterado'),
        );
      } finally {
        setImportando(false);
      }
    },
    [textoImportacao, limparImportacao],
  );

  const confirmarImportacao = useCallback(
    (aoConcluir?: () => void): void => {
      if (!previa) {
        Alert.alert('Atencao', 'Valide o JSON antes de sobrescrever o banco.');
        return;
      }

      Alert.alert(
        'Sobrescrever banco',
        `Todos os dados atuais serao apagados e substituidos por ${previa.totalRegistros} ` +
          'registro(s) do JSON. Esta acao nao pode ser desfeita. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sobrescrever',
            style: 'destructive',
            onPress: (): void => void executarImportacao(aoConcluir),
          },
        ],
      );
    },
    [previa, executarImportacao],
  );

  const setApiConfig = useCallback((config: ApiConfig): void => {
    setApiConfigState(config);
    void saveApiConfig(config);
  }, []);

  const enviarParaApi = useCallback(async (): Promise<void> => {
    setEnviando(true);

    try {
      const resultado = await enviarBancoParaApi(apiConfig);

      setEnvioApi({
        id: resultado.id,
        recebidoEm: resultado.recebido_em,
        totalRegistros: resultado.registros,
        resumo: resultado.tabelas,
        ignorados: resultado.ignorados,
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar banco para a API:', error);
      Alert.alert('Erro', mensagemDeErro(error, 'Nao foi possivel enviar para a API'));
    } finally {
      setEnviando(false);
    }
  }, [apiConfig]);

  return {
    exportacao,
    exportando,
    gerarExportacao,
    compartilharExportacao,

    textoImportacao,
    setTextoImportacao: alterarTextoImportacao,
    previa,
    importando,
    validarImportacao,
    confirmarImportacao,
    limparImportacao,

    apiConfig,
    setApiConfig,
    envioApi,
    enviando,
    enviarParaApi,
  };
}
