import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button } from '../../../components/ui';
import { colors, sharedStyles } from '../../../theme';

type NomeSimplesFormProps = {
  placeholder: string;
  /** Devolve `true` quando o cadastro foi criado, o que fecha o formulario. */
  onSalvar: (nome: string) => Promise<boolean>;
  onCancelar: () => void;
};

/**
 * Formulario de uma linha usado dentro do `SeletorMultiplo` para criar
 * categorias e marcas sem sair da tela de produto.
 */
export default function NomeSimplesForm({
  placeholder,
  onSalvar,
  onCancelar,
}: NomeSimplesFormProps): React.ReactNode {
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
        <Button label="Salvar" variant="secondary" flex onPress={salvar} />
        <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />
      </View>
    </View>
  );
}
