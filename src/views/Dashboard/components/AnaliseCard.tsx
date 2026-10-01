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

type AnaliseCardProps = {
  titulo: string;
  descricao: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  /** Cor de destaque do icone; padrao e a cor da marca. */
  tom?: 'primary' | 'info' | 'warning';
  onPress: () => void;
};

/** Atalho de uma analise no hub da aba Analises. */
export default function AnaliseCard({
  titulo,
  descricao,
  icone,
  tom = 'primary',
  onPress,
}: AnaliseCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();

  const cores = {
    primary: { fundo: colors.primarySoft, icone: colors.primary },
    info: { fundo: colors.infoSoft, icone: colors.info },
    warning: { fundo: colors.warningSoft, icone: colors.warning },
  }[tom];

  return (
    <PressableScale
      style={[sharedStyles.card, styles.card]}
      onPress={onPress}
      escala={0.98}
      vibrar
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <View style={[styles.iconeBadge, { backgroundColor: cores.fundo }]}>
        <Ionicons name={icone} size={iconSize.lg} color={cores.icone} />
      </View>
      <View style={styles.info}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.md} color={colors.textSubtle} />
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconeBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
