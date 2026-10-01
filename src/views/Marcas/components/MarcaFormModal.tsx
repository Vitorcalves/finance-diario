import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Text, TextInput } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import { useTheme } from '../../../theme';

type MarcaFormModalProps = {
  visivel: boolean;
  /** Marca em edicao; `null` abre o formulario em branco. */
  marca: Marca | null;
  onFechar: () => void;
  /** Devolve `true` quando a marca foi salva, o que fecha o painel. */
  onSalvar: (nome: string, marca: Marca | null) => Promise<boolean>;
};

/** Painel de cadastro e edicao de marca. */
export default function MarcaFormModal({
  visivel,
  marca,
  onFechar,
  onSalvar,
}: MarcaFormModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const [nome, setNome] = useState(marca?.nome ?? '');
  const [salvando, setSalvando] = useState(false);

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar(nome, marca);
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
      titulo={marca ? 'Editar marca' : 'Nova marca'}
      rolavel={false}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Nome da marca *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Camil"
          value={nome}
          onChangeText={setNome}
          autoFocus={!marca}
          returnKeyType="done"
          onSubmitEditing={salvar}
        />
      </View>
    </BottomSheet>
  );
}
