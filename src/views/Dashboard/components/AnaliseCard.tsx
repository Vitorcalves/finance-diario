import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  sharedStyles,
  spacing,
} from '../../../theme';

type AnaliseCardProps = {
  titulo: string;
  descricao: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

/** Atalho de uma analise no hub do dashboard. */
export default function AnaliseCard({
  titulo,
  descricao,
  icone,
  onPress,
}: AnaliseCardProps): React.ReactNode {
  return (
    <Pressable style={[sharedStyles.card, styles.card]} onPress={onPress}>
      <View style={styles.iconeBadge}>
        <Ionicons name={icone} size={iconSize.lg} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.md} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconeBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
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
    color: colors.primaryDark,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
