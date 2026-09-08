import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelector, ScreenHeader, type ChipOpcao } from '../../components/ui';
import { sharedStyles } from '../../theme';
import ExportarPainel from './components/ExportarPainel';
import ImportarPainel from './components/ImportarPainel';
import type { ModoIntegracao } from './types';
import { useIntegracao } from './useIntegracao';

const MODOS: ChipOpcao<ModoIntegracao>[] = [
  { valor: 'exportar', rotulo: 'Exportar' },
  { valor: 'importar', rotulo: 'Importar' },
];

/** Integracao: extrai o banco como JSON ou sobrescreve o banco a partir de um JSON. */
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
  } = useIntegracao();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Integracao"
        subtitle="Backup do banco em JSON"
        onBack={(): void => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={sharedStyles.scrollArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
