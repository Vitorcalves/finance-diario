import Ionicons from '@expo/vector-icons/Ionicons';
import type dayjs from 'dayjs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, iconSize, radius, spacing } from '../../../theme';

type SeletorMesProps = {
  mes: dayjs.Dayjs;
  onTrocarMes: (mes: dayjs.Dayjs) => void;
};

/** Barra de navegacao entre os meses. */
export default function SeletorMes({ mes, onTrocarMes }: SeletorMesProps): React.ReactNode {
  return (
    <View style={styles.row}>
      <Pressable onPress={(): void => onTrocarMes(mes.subtract(1, 'month'))} style={styles.button}>
        <Ionicons name="chevron-back" size={iconSize.sm} color={colors.primary} />
      </Pressable>

      <Text style={styles.label}>{mes.format('MMMM YYYY')}</Text>

      <Pressable onPress={(): void => onTrocarMes(mes.add(1, 'month'))} style={styles.button}>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
});
