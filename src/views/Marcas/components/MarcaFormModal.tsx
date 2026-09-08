import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import { colors, sharedStyles } from '../../../theme';

type MarcaFormModalProps = {
  /** Marca em edicao; `null` abre o formulario em branco. */
  marca: Marca | null;
  onFechar: () => void;
  /** Devolve `true` quando a marca foi salva, o que fecha o modal. */
  onSalvar: (nome: string, marca: Marca | null) => Promise<boolean>;
};

/** Modal de cadastro e edicao de marca. */
export default function MarcaFormModal({
  marca,
  onFechar,
  onSalvar,
}: MarcaFormModalProps): React.ReactNode {
  const [nome, setNome] = useState(marca?.nome ?? '');

  const salvar = (): void => {
    void (async (): Promise<void> => {
      if (await onSalvar(nome, marca)) {
        onFechar();
      }
    })();
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader
          title={marca ? 'Editar Marca' : 'Nova Marca'}
          backIcon="close"
          onBack={onFechar}
        />

        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.formContent}
        >
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Nome da Marca *</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Ex: Mercado Central"
              value={nome}
              onChangeText={setNome}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={sharedStyles.actionsRow}>
            <Button label={marca ? 'Salvar Alteracoes' : 'Salvar Marca'} flex onPress={salvar} />
            <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
