import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Text, TextInput } from '../../../components/ui';
import { useTheme } from '../../../theme';

type CategoriaFormModalProps = {
  visivel: boolean;
  onFechar: () => void;
  /** Devolve `true` quando a categoria foi salva, o que fecha o painel. */
  onSalvar: (nome: string) => Promise<boolean>;
};

/**
 * Painel de cadastro de categoria.
 * A tela troca a `key` a cada abertura, entao o estado ja nasce limpo.
 */
export default function CategoriaFormModal({
  visivel,
  onFechar,
  onSalvar,
}: CategoriaFormModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar(nome);
      setSalvando(false);

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo="Nova categoria"
      rolavel={false}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Nome da categoria *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Alimentação"
          value={nome}
          onChangeText={setNome}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={salvar}
        />
      </View>
    </BottomSheet>
  );
}
