import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChipSelector,
  KeyboardAvoidingScreen,
  ScreenHeader,
  type ChipOpcao,
} from '../../components/ui';
import { sharedStyles } from '../../theme';
import ExportarPainel from './components/ExportarPainel';
import ApiPainel from './components/ApiPainel';
import IaPainel from './components/IaPainel';
import ImportarPainel from './components/ImportarPainel';
import type { ModoIntegracao } from './types';
import { useIntegracao } from './useIntegracao';

const MODOS: ChipOpcao<ModoIntegracao>[] = [
  { valor: 'exportar', rotulo: 'Exportar' },
  { valor: 'importar', rotulo: 'Importar' },
  { valor: 'api', rotulo: 'API' },
  { valor: 'ia', rotulo: 'IA' },
];

/** Integracao: extrai o banco como JSON, sobrescreve a partir de um JSON, envia para a API ou pergunta a IA. */
export default function IntegracaoView(): React.ReactNode {
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
      <StatusBar style="dark" />

      <ScreenHeader
        title="Integracao"
        subtitle="Backup do banco em JSON"
        onBack={(): void => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ChipSelector opcoes={MODOS} selecionado={modo} onSelecionar={setModo} />

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
        </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  );
}
