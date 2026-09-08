import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, iconSize, radius, spacing } from '../../../theme';

/** Explica que o orcamento nao gera lancamento financeiro. */
export default function AvisoOrcamento(): React.ReactNode {
  return (
    <View style={styles.card}>
      <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.primary} />
      <Text style={styles.texto}>
        Este orcamento nao gera lancamento financeiro. Os precos pesquisados vao para o historico de
        precos e alimentam a comparacao entre mercados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  texto: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.primaryDark,
    lineHeight: 17,
  },
});
