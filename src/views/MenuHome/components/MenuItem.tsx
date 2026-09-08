import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, fontWeight, iconSize, radius, spacing } from '../../../theme';

type MenuItemProps = {
  label: string;
  onPress: () => void;
  icone?: ComponentProps<typeof Ionicons>['name'];
  /** Destaca a acao como destrutiva (ex.: recriar o banco). */
  perigo?: boolean;
};

/** Linha clicavel do menu de navegacao. */
export default function MenuItem({
  label,
  onPress,
  icone = 'chevron-forward',
  perigo = false,
}: MenuItemProps): React.ReactNode {
  return (
    <Pressable style={[styles.item, perigo && styles.itemPerigo]} onPress={onPress}>
      <Text style={[styles.texto, perigo && styles.textoPerigo]}>{label}</Text>
      <Ionicons
        name={icone}
        size={iconSize.sm}
        color={perigo ? colors.danger : colors.textSubtle}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemPerigo: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerBorder,
  },
  texto: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textBody,
  },
  textoPerigo: {
    color: colors.danger,
  },
});
