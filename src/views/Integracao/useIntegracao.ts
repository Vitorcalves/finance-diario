import {useCallback, useEffect, useState} from 'react';
import {Alert, Share} from 'react-native';
import {useToast} from '../../components/ui';
import {analisarBackup, BackupInvalidoError, exportarBanco, importarBanco, resumirBackup,} from '../../models/backup';
import {type ApiConfig, getApiConfig, saveApiConfig} from '../../models/settingsModel';
import {escolherArquivoJson, salvarArquivoJson} from './components/arquivoJson';
import {
  consultarIa as consultarIaNaApi,
  enviarParaApi as enviarBancoParaApi,
  MAX_PASSOS_PADRAO,
  SincronizacaoError,
} from '../../models/sincronizacaoApi';
import type {PreviaImportacao, ResultadoConsultaIa, ResultadoEnvioApi, ResultadoExportacao,} from './types';

export type UseIntegracao = {
  exportacao: ResultadoExportacao | null;
  exportando: boolean;
  gerarExportacao: () => Promise<void>;
  compartilharExportacao: () => Promise<void>;
  /** Grava o JSON atual no cache e abre a folha de "salvar em arquivos". */
  salvandoArquivo: boolean;
  salvarArquivoExportacao: () => Promise<void>;

  textoImportacao: string;
  setTextoImportacao: (texto: string) => void;
  previa: PreviaImportacao | null;
  importando: boolean;
  /** Valida o JSON colado e monta a previa; nao escreve no banco. */
  validarImportacao: () => void;
  /** Pede confirmacao e sobrescreve o banco com o JSON validado. */
  confirmarImportacao: (aoConcluir?: () => void) => void;
  limparImportacao: () => void;
  /** Abre o seletor de arquivos e joga o conteudo no campo de importacao. */
  escolherArquivoImportacao: () => Promise<void>;

  apiConfig: ApiConfig;
  /** Atualiza e persiste endereco/chave da API. */
  setApiConfig: (config: ApiConfig) => void;
  envioApi: ResultadoEnvioApi | null;
  enviando: boolean;
  /** Exporta o banco e envia para `POST /sync` da API. So le o banco local. */
  enviarParaApi: () => Promise<void>;

  pergunta: string;
  setPergunta: (pergunta: string) => void;
  /** Liga o modo de raciocinio do modelo (`pensar` no corpo da requisicao). */
  pensar: boolean;
  setPensar: (pensar: boolean) => void;
  consultaIa: ResultadoConsultaIa | null;
  consultando: boolean;
  /** Manda a pergunta para `POST /ia/consultar` da API. Nao toca o banco local. */
  consultarIa: () => Promise<void>;
  limparConsultaIa: () => void;
};

const LIMITE_TEXTO_SEGURO = 60000;

const mensagemDeErro = (error: unknown, fallback: string): string => {
  if (error instanceof BackupInvalidoError || error instanceof SincronizacaoError) {
    return error.message;
  }

  return error instanceof Error ? `${fallback} (${error.message})` : fallback;
};

/** Estado da tela de integracao: gerar o JSON, sobrescrever a partir de um JSON e enviar para a API. */
export function useIntegracao(): UseIntegracao {
  const toast = useToast();
  const [exportacao, setExportacao] = useState<ResultadoExportacao | null>(null);
  const [exportando, setExportando] = useState(false);
  const [salvandoArquivo, setSalvandoArquivo] = useState(false);

  const [textoImportacao, setTextoImportacaoState] = useState('');
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [importando, setImportando] = useState(false);

  const [apiConfig, setApiConfigState] = useState<ApiConfig>({url: '', token: ''});
  const [envioApi, setEnvioApi] = useState<ResultadoEnvioApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [pergunta, setPergunta] = useState('');
  const [pensar, setPensar] = useState(true);
  const [consultaIa, setConsultaIa] = useState<ResultadoConsultaIa | null>(null);
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    void getApiConfig().then(setApiConfigState);
  }, []);

  // ---- exportar ----

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
      Alert.alert('Erro', mensagemDeErro(error, 'Não foi possível gerar o JSON'));
    } finally {
      setExportando(false);
    }
  }, []);

  const salvarArquivoExportacao = useCallback(async (): Promise<void> => {
    if (!exportacao) return;

    setSalvandoArquivo(true);
    try {
      const nome = `integracao-${new Date().toISOString().slice(0, 10)}.json`;
      await salvarArquivoJson(nome, exportacao.json);
    } catch (error: unknown) {
      console.error('Erro ao salvar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível salvar o arquivo JSON');
    } finally {
      setSalvandoArquivo(false);
    }
  }, [exportacao]);

  const compartilharExportacao = useCallback(async (): Promise<void> => {
    if (!exportacao) return;

    if (exportacao.json.length > LIMITE_TEXTO_SEGURO) {
      Alert.alert(
        'JSON muito grande',
        'Vários apps de mensagem cortam textos acima de ~60 mil caracteres. ' +
        'Para backups grandes, salve como arquivo.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Salvar arquivo', onPress: (): void => void salvarArquivoExportacao()},
        ],
      );
      return;
    }

    try {
      await Share.share({message: exportacao.json});
    } catch (error: unknown) {
      console.error('Erro ao compartilhar backup:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o JSON');
    }
  }, [exportacao, salvarArquivoExportacao]);

  // ---- importar ----

  const limparImportacao = useCallback((): void => {
    setTextoImportacaoState('');
    setPrevia(null);
  }, []);

  const alterarTextoImportacao = useCallback((texto: string): void => {
    setTextoImportacaoState(texto);
    // Qualquer edicao invalida a previa: ela precisa refletir o texto atual.
    setPrevia(null);
  }, []);

  const escolherArquivoImportacao = useCallback(async (): Promise<void> => {
    try {
      const conteudo = await escolherArquivoJson();
      if (conteudo === null) return;
      setTextoImportacaoState(conteudo);
      setPrevia(null);
    } catch (error: unknown) {
      console.error('Erro ao ler arquivo JSON:', error);
      Alert.alert('Erro', 'Não foi possível ler o arquivo JSON');
    }
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
      Alert.alert('JSON inválido', mensagemDeErro(error, 'Não foi possível ler o JSON'));
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
        toast.mostrar(`Banco restaurado com ${total} ${total === 1 ? 'registro' : 'registros'}`);
        aoConcluir?.();
      } catch (error: unknown) {
        console.error('Erro ao importar banco:', error);
        Alert.alert(
          'Erro',
          mensagemDeErro(error, 'Não foi possível importar o JSON. O banco não foi alterado'),
        );
      } finally {
        setImportando(false);
      }
    },
    [textoImportacao, limparImportacao, toast],
  );

  const confirmarImportacao = useCallback(
    (aoConcluir?: () => void): void => {
      if (!previa) {
        Alert.alert('Atenção', 'Valide o JSON antes de sobrescrever o banco.');
        return;
      }

      Alert.alert(
        'Sobrescrever banco',
        `Todos os dados atuais serão apagados e substituídos por ${previa.totalRegistros} ` +
        'registro(s) do JSON. Esta ação não pode ser desfeita. Deseja continuar?',
        [
          {text: 'Cancelar', style: 'cancel'},
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

  // ---- api ----

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
      Alert.alert('Erro', mensagemDeErro(error, 'Não foi possível enviar para a API'));
    } finally {
      setEnviando(false);
    }
  }, [apiConfig]);

  const consultarIa = useCallback(async (): Promise<void> => {
    setConsultando(true);

    try {
      const resposta = await consultarIaNaApi(apiConfig, {
        pergunta,
        pensar,
        max_passos: MAX_PASSOS_PADRAO,
      });

      setConsultaIa({
        pergunta: pergunta.trim(),
        resposta,
        recebidoEm: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error('Erro ao consultar a IA da API:', error);
      Alert.alert('Erro', mensagemDeErro(error, 'Não foi possível consultar a IA'));
    } finally {
      setConsultando(false);
    }
  }, [apiConfig, pergunta, pensar]);

  const limparConsultaIa = useCallback((): void => {
    setPergunta('');
    setConsultaIa(null);
  }, []);

  return {
    exportacao,
    exportando,
    gerarExportacao,
    compartilharExportacao,
    salvandoArquivo,
    salvarArquivoExportacao,

    textoImportacao,
    setTextoImportacao: alterarTextoImportacao,
    previa,
    importando,
    validarImportacao,
    confirmarImportacao,
    limparImportacao,
    escolherArquivoImportacao,

    apiConfig,
    setApiConfig,
    envioApi,
    enviando,
    enviarParaApi,

    pergunta,
    setPergunta,
    pensar,
    setPensar,
    consultaIa,
    consultando,
    consultarIa,
    limparConsultaIa,
  };
}