import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, type StyleProp, View, type ViewStyle } from 'react-native';
import { fontSize, fontWeight, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import PressableScale from './PressableScale';
import Text from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `sm` para acoes secundarias dentro de cartoes. */
  size?: 'md' | 'sm';
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Mostra o indicador no lugar do icone e bloqueia novos toques. */
  loading?: boolean;
  disabled?: boolean;
  /** Ocupa o espaco disponivel quando dentro de uma linha de acoes. */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Botao padrao do app, com resposta ao toque e estado de carregamento. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  flex = false,
  style,
}: ButtonProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const bloqueado = disabled || loading;

  const corConteudo: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    success: colors.onPrimary,
    secondary: colors.text,
    danger: colors.danger,
    ghost: colors.primary,
  };

  const corBloqueada = variant === 'ghost' ? colors.textSubtle : colors.onDisabled;
  // Carregando mantem a cor da variante: so o desabilitado fica cinza.
  const cor = disabled ? corBloqueada : corConteudo[variant];

  return (
    <PressableScale
      disabled={bloqueado}
      onPress={onPress}
      vibrar
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: bloqueado, busy: loading }}
      android_ripple={{ color: colors.overlay, foreground: true }}
      style={[
        styles.base,
        size === 'sm' && styles.pequeno,
        styles[variant],
        flex && styles.flex,
        disabled && variant !== 'ghost' && styles.bloqueado,
        style,
      ]}
    >
      <View style={styles.conteudo}>
        {loading ? (
          <ActivityIndicator size="small" color={cor} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'sm' ? iconSize.sm - 2 : iconSize.sm} color={cor} />
        ) : null}
        <Text
          style={[styles.texto, size === 'sm' && styles.textoPequeno, { color: cor }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    minHeight: 48,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pequeno: {
    minHeight: 36,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  bloqueado: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled,
  },
  texto: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  textoPequeno: {
    fontSize: fontSize.small,
  },
}));
