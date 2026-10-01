import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { PressableScale, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type MenuItemProps = {
  label: string;
  /** Linha de apoio abaixo do rotulo. */
  descricao?: string;
  icone: IconName;
  onPress: () => void;
  /** Destaca a acao como destrutiva (ex.: recriar o banco). */
  perigo?: boolean;
};

/** Linha tocavel do menu, no estilo da tela de ajustes do celular. */
export default function MenuItem({
  label,
  descricao,
  icone,
  onPress,
  perigo = false,
}: MenuItemProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <PressableScale
      style={styles.item}
      onPress={onPress}
      escala={0.98}
      vibrar
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.overlay, foreground: true }}
    >
      <View style={[styles.icone, perigo && styles.iconePerigo]}>
        <Ionicons name={icone} size={iconSize.sm} color={perigo ? colors.danger : colors.primary} />
      </View>

      <View style={styles.textos}>
        <Text style={[styles.texto, perigo && styles.textoPerigo]}>{label}</Text>
        {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textSubtle} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  icone: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconePerigo: {
    backgroundColor: colors.dangerSoft,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  texto: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  textoPerigo: {
    color: colors.danger,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
