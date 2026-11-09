import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Text, TextInput } from '../../../components/ui';
import { TAMANHO_MAXIMO_NOME_TAG, type Tag } from '../../../models/tags';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';
import type { DadosFormTag } from '../useTags';

type TagFormModalProps = {
  visivel: boolean;
  /** Tag em edicao; `null` cria uma nova. Troque a `key` para abrir outra. */
  tag: Tag | null;
  onFechar: () => void;
  onSalvar: (dados: DadosFormTag, editando: Tag | null) => Promise<boolean>;
};

/** Painel de cadastro da tag: nome e uma anotacao opcional sobre o evento. */
export default function TagFormModal({
  visivel,
  tag,
  onFechar,
  onSalvar,
}: TagFormModalProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [nome, setNome] = useState(tag?.nome ?? '');
  const [descricao, setDescricao] = useState(tag?.descricao ?? '');
  const [salvando, setSalvando] = useState(false);

  const salvar = (): void => {
    if (salvando) {
      return;
    }

    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar({ nome, descricao }, tag);
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
      titulo={tag ? 'Editar tag' : 'Nova tag'}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <Text style={sharedStyles.label}>Nome *</Text>
      <TextInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder="Ex.: Viagem julho"
        value={nome}
        onChangeText={setNome}
        maxLength={TAMANHO_MAXIMO_NOME_TAG}
        placeholderTextColor={colors.placeholder}
      />

      <Text style={sharedStyles.label}>Anotação</Text>
      <TextInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder="Opcional. Ex.: Salvador, 3 a 18 de julho"
        value={descricao}
        onChangeText={setDescricao}
        placeholderTextColor={colors.placeholder}
      />

      <Text style={styles.dica}>
        Marque os lançamentos do evento com esta tag (no formulário ou arrastando o lançamento na
        lista) para ver quanto ele custou, somando todas as categorias.
      </Text>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  dica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
  },
}));
