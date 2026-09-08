import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { colors, fontSize, radius, spacing } from '../../../theme';

type CaixaJsonProps = {
  valor: string;
  /** Somente leitura quando ausente: a caixa vira area de copia. */
  onChangeText?: (texto: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Area de texto monoespacada para o JSON.
 *
 * Sem `onChangeText` fica somente leitura, mas continua selecionavel para o
 * usuario copiar o conteudo com o gesto nativo de selecao.
 */
export default function CaixaJson({
  valor,
  onChangeText,
  placeholder,
  style,
}: CaixaJsonProps): React.ReactNode {
  const somenteLeitura = !onChangeText;

  return (
    <TextInput
      style={[styles.caixa, style]}
      value={valor}
      onChangeText={onChangeText}
      editable={!somenteLeitura}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      multiline
      scrollEnabled
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      textAlignVertical="top"
    />
  );
}

const styles = StyleSheet.create({
  caixa: {
    height: 260,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    fontSize: fontSize.caption,
    fontFamily: 'monospace',
    color: colors.textBody,
  },
});
