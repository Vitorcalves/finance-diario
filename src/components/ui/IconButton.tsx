import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import PressableScale from './PressableScale';

export type IconButtonVariant = 'primary' | 'info' | 'danger' | 'neutral';

type IconName = ComponentProps<typeof Ionicons>['name'];

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  /** Lido pelo leitor de tela; o icone sozinho nao diz o que o botao faz. */
  accessibilityLabel?: string;
};

/** Rotulo lido pelo leitor de tela quando a tela nao informa um proprio. */
const ROTULO_PADRAO: Partial<Record<IconName, string>> = {
  pencil: 'Editar',
  trash: 'Excluir',
  'trash-outline': 'Excluir',
  eye: 'Ver histórico',
  'barcode-outline': 'Ler código de barras',
  close: 'Fechar',
  'ellipsis-horizontal': 'Mais ações',
};

/** Botao de icone das listas (visualizar, editar, remover, ler codigo). */
export default function IconButton({
  icon,
  onPress,
  variant = 'primary',
  size = iconSize.md,
  accessibilityLabel,
}: IconButtonProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  const cor: Record<IconButtonVariant, string> = {
    primary: colors.primary,
    info: colors.info,
    danger: colors.danger,
    neutral: colors.textMuted,
  };

  return (
    <PressableScale
      style={[styles.base, styles[variant]]}
      onPress={onPress}
      escala={0.9}
      vibrar
      hitSlop={spacing.xs}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? ROTULO_PADRAO[icon]}
    >
      <Ionicons name={icon} size={size} color={cor[variant]} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primarySoft,
  },
  info: {
    backgroundColor: colors.infoSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
  },
}));
