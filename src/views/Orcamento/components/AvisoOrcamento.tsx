import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { fontSize, iconSize, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { Text } from '../../../components/ui';

/** Explica que o orcamento nao gera lancamento financeiro. */
export default function AvisoOrcamento(): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.primary} />
      <Text style={styles.texto}>
        Este orçamento não gera lançamento financeiro. Os preços pesquisados vão para o histórico de
        preços e alimentam a comparação entre mercados.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  texto: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textStrong,
    lineHeight: 17,
  },
}));
