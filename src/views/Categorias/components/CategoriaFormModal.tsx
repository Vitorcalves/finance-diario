import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, KeyboardAvoidingScreen, ScreenHeader } from '../../../components/ui';
import { colors, sharedStyles } from '../../../theme';

type CategoriaFormModalProps = {
  onFechar: () => void;
  /** Devolve `true` quando a categoria foi salva, o que fecha o modal. */
  onSalvar: (nome: string) => Promise<boolean>;
};

/**
 * Modal de cadastro de categoria.
 * A tela monta o componente apenas enquanto o formulario esta aberto, entao o
 * estado ja nasce limpo a cada abertura.
 */
export default function CategoriaFormModal({
  onFechar,
  onSalvar,
}: CategoriaFormModalProps): React.ReactNode {
  const [nome, setNome] = useState('');

  const salvar = (): void => {
    void (async (): Promise<void> => {
      if (await onSalvar(nome)) {
        onFechar();
      }
    })();
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader title="Nova Categoria" backIcon="close" onBack={onFechar} />

        <KeyboardAvoidingScreen>
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Nome da Categoria *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: Alimentacao"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button label="Salvar Categoria" flex onPress={salvar} />
              <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
            </View>
          </ScrollView>
        </KeyboardAvoidingScreen>
      </SafeAreaView>
    </Modal>
  );
}
