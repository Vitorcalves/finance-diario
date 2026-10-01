import { View } from 'react-native';
import { Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, spacing } from '../../../theme';
import { formatarDiaRelativo, toCurrency } from '../../../utils/format';
import { ehFuturo } from '../useHome';

type CabecalhoDiaProps = {
  dia: string;
  total: number;
};

/** Titulo de cada dia na lista de lancamentos, com o saldo do dia. */
export default function CabecalhoDia({ dia, total }: CabecalhoDiaProps): React.ReactNode {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.dia}>
        {formatarDiaRelativo(dia)}
        {ehFuturo(dia) ? <Text style={styles.futuro}> · a vencer</Text> : null}
      </Text>
      <Text style={[styles.total, total > 0 && styles.totalPositivo]}>{toCurrency(total)}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  dia: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  futuro: {
    fontWeight: fontWeight.regular,
    color: colors.info,
  },
  total: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  totalPositivo: {
    color: colors.success,
  },
}));
