import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextInput } from './ui';
import { useTheme } from '../theme';

type NomeSimplesFormProps = {
  placeholder: string;
  /** Devolve `true` quando o cadastro foi criado, o que fecha o formulario. */
  onSalvar: (nome: string) => Promise<boolean>;
  onCancelar: () => void;
};

/**
 * Formulario de uma linha usado dentro do `SeletorMultiplo` para criar
 * categorias, marcas e tags sem sair do formulario em que se esta.
 */
export default function NomeSimplesForm({
  placeholder,
  onSalvar,
  onCancelar,
}: NomeSimplesFormProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const [nome, setNome] = useState('');

  const salvar = (): void => {
    void (async (): Promise<void> => {
      if (await onSalvar(nome)) {
        setNome('');
        onCancelar();
      }
    })();
  };

  return (
    <View>
      <TextInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder={placeholder}
        value={nome}
        onChangeText={setNome}
        placeholderTextColor={colors.placeholder}
      />

      <View style={sharedStyles.actionsRow}>
        <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />
        <Button label="Salvar" icon="checkmark" flex onPress={salvar} />
      </View>
    </View>
  );
}
