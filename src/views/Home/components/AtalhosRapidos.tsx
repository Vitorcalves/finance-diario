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
  shadows,
  spacing,
  useTheme,
} from '../../../theme';

export type Atalho = {
  rotulo: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

type AtalhosRapidosProps = {
  atalhos: Atalho[];
};

/** Linha de atalhos para as telas mais usadas no mercado, a um toque da Home. */
export default function AtalhosRapidos({ atalhos }: AtalhosRapidosProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.linha}>
      {atalhos.map((atalho) => (
        <PressableScale
          key={atalho.rotulo}
          style={styles.atalho}
          onPress={atalho.onPress}
          escala={0.95}
          vibrar
          accessibilityRole="button"
          accessibilityLabel={atalho.rotulo}
        >
          <View style={styles.icone}>
            <Ionicons name={atalho.icone} size={iconSize.md} color={colors.primary} />
          </View>
          <Text style={styles.rotulo} numberOfLines={1}>
            {atalho.rotulo}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  atalho: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
}));
