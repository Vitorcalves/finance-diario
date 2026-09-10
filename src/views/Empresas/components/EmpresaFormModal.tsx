import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, KeyboardAvoidingScreen, ScreenHeader } from '../../../components/ui';
import type { Empresa } from '../../../models/empresas';
import { colors, sharedStyles } from '../../../theme';
import type { DadosEmpresa } from '../useEmpresas';

type EmpresaFormModalProps = {
  /** Empresa em edicao; `null` abre o formulario em branco. */
  empresa: Empresa | null;
  onFechar: () => void;
  /** Devolve `true` quando a empresa foi salva, o que fecha o modal. */
  onSalvar: (dados: DadosEmpresa, empresa: Empresa | null) => Promise<boolean>;
};

/** Modal de cadastro e edicao de empresa. */
export default function EmpresaFormModal({
  empresa,
  onFechar,
  onSalvar,
}: EmpresaFormModalProps): React.ReactNode {
  const [nome, setNome] = useState(empresa?.nome ?? '');
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? '');
  const [observacao, setObservacao] = useState(empresa?.observacao ?? '');

  const salvar = (): void => {
    void (async (): Promise<void> => {
      if (await onSalvar({ nome, cnpj, observacao }, empresa)) {
        onFechar();
      }
    })();
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader
          title={empresa ? 'Editar Empresa' : 'Nova Empresa'}
          backIcon="close"
          onBack={onFechar}
        />

        <KeyboardAvoidingScreen>
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Nome da Empresa *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: Mercado Central"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>CNPJ</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: 00.000.000/0001-00"
                value={cnpj}
                onChangeText={setCnpj}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Observacao</Text>
              <TextInput
                style={[sharedStyles.input, sharedStyles.inputMultiline]}
                placeholder="Anotacoes sobre a empresa"
                value={observacao}
                onChangeText={setObservacao}
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button
                label={empresa ? 'Salvar Alteracoes' : 'Salvar Empresa'}
                flex
                onPress={salvar}
              />
              <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
            </View>
          </ScrollView>
        </KeyboardAvoidingScreen>
      </SafeAreaView>
    </Modal>
  );
}
