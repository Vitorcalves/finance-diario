import Ionicons from '@expo/vector-icons/Ionicons';
import type dayjs from 'dayjs';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../../theme';
import { vibrarSelecao } from '../../../utils/haptics';

type SeletorMesProps = {
  mes: dayjs.Dayjs;
  onTrocarMes: (mes: dayjs.Dayjs) => void;
  /** Mostra o indicador enquanto o mes escolhido carrega. */
  carregando: boolean;
};

/** Barra de navegacao entre os meses (tambem da para arrastar a tela para o lado). */
export default function SeletorMes({
  mes,
  onTrocarMes,
  carregando,
}: SeletorMesProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  const trocar = (passo: number): void => {
    vibrarSelecao();
    onTrocarMes(mes.add(passo, 'month'));
  };

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={(): void => trocar(-1)}
        style={styles.button}
        escala={0.88}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
      >
        <Ionicons name="chevron-back" size={iconSize.sm} color={colors.primary} />
      </PressableScale>

      <View style={styles.centro}>
        <Text style={styles.label}>{mes.format('MMMM')}</Text>
        <View style={styles.anoLinha}>
          <Text style={styles.ano}>{mes.format('YYYY')}</Text>
          {carregando && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <PressableScale
        onPress={(): void => trocar(1)}
        style={styles.button}
        escala={0.88}
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
      >
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
    textTransform: 'capitalize',
  },
  anoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 18,
  },
  ano: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
