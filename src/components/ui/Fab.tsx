import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { iconSize, makeStyles, radius, shadows, spacing, useTheme } from '../../theme';
import PressableScale from './PressableScale';

type FabProps = {
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
};

/** Botao flutuante da acao principal da tela, fixo no canto inferior direito. */
export default function Fab({
  onPress,
  icon = 'add',
  accessibilityLabel,
}: FabProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <PressableScale
      style={styles.fab}
      onPress={onPress}
      escala={0.9}
      vibrar
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={iconSize.xl} color={colors.onPrimary} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
}));
