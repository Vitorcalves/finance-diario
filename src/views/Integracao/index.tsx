import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingScreen,
  type OpcaoSegmento,
  ScreenHeader,
  ScrollComTeclado,
  SegmentedControl,
} from '../../components/ui';
import { useTheme } from '../../theme';
import ExportarPainel from './components/ExportarPainel';
import ApiPainel from './components/ApiPainel';
import IaPainel from './components/IaPainel';
import ImportarPainel from './components/ImportarPainel';
import type { ModoIntegracao } from './types';
import { useIntegracao } from './useIntegracao';

const MODOS: OpcaoSegmento<ModoIntegracao>[] = [
  { valor: 'exportar', rotulo: 'Exportar' },
  { valor: 'importar', rotulo: 'Importar' },
  { valor: 'api', rotulo: 'API' },
  { valor: 'ia', rotulo: 'IA' },
];

/** Integracao: extrai o banco como JSON, sobrescreve a partir de um JSON, envia para a API ou pergunta a IA. */
export default function IntegracaoView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const navigation = useNavigation();
  const [modo, setModo] = useState<ModoIntegracao>('exportar');
  const {
    exportacao,
    exportando,
    gerarExportacao,
    compartilharExportacao,
    textoImportacao,
    setTextoImportacao,
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
    pergunta,
    setPergunta,
    pensar,
    setPensar,
    consultaIa,
    consultando,
    consultarIa,
    limparConsultaIa,
  } = useIntegracao();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Integração"
        subtitle="Backup, API e perguntas sobre seus dados"
        onBack={(): void => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <ScrollComTeclado
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <SegmentedControl opcoes={MODOS} valor={modo} onChange={setModo} />

          {modo === 'exportar' ? (
            <ExportarPainel
              exportacao={exportacao}
              carregando={exportando}
              onGerar={(): void => void gerarExportacao()}
              onCompartilhar={(): void => void compartilharExportacao()}
            />
          ) : modo === 'api' ? (
            <ApiPainel
              config={apiConfig}
              onChangeConfig={setApiConfig}
              resultado={envioApi}
              carregando={enviando}
              onEnviar={(): void => void enviarParaApi()}
            />
          ) : modo === 'ia' ? (
            <IaPainel
              configurada={apiConfig.url.trim().length > 0}
              pergunta={pergunta}
              onChangePergunta={setPergunta}
              pensar={pensar}
              onChangePensar={setPensar}
              resultado={consultaIa}
              carregando={consultando}
              onConsultar={(): void => void consultarIa()}
              onLimpar={limparConsultaIa}
            />
          ) : (
            <ImportarPainel
              texto={textoImportacao}
              onChangeTexto={setTextoImportacao}
              previa={previa}
              carregando={importando}
              onValidar={validarImportacao}
              onImportar={(): void => confirmarImportacao()}
              onLimpar={limparImportacao}
            />
          )}
        </ScrollComTeclado>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  );
}
