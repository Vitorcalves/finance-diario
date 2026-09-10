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
  /** Estilo mais enxuto, usado dentro de um MenuGrupo ja expandido. */
  compact?: boolean;
};

/** Linha clicavel do menu de navegacao. */
export default function MenuItem({
  label,
  onPress,
  icone = 'chevron-forward',
  perigo = false,
  compact = false,
}: MenuItemProps): React.ReactNode {
  return (
    <Pressable
      style={[
        styles.item,
        compact && styles.itemCompact,
        perigo && (compact ? styles.itemCompactPerigo : styles.itemPerigo),
      ]}
      onPress={onPress}
    >
      <Text style={[styles.texto, compact && styles.textoCompact, perigo && styles.textoPerigo]}>
        {label}
      </Text>
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
  itemCompact: {
    borderWidth: 0,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  itemCompactPerigo: {
    marginTop: 0,
    backgroundColor: colors.dangerSurface,
  },
  texto: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textBody,
  },
  textoCompact: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  textoPerigo: {
    color: colors.danger,
  },
});
