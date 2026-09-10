import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../../components/ui';
import type { Categoria } from '../../../models/categorias';
import { colors, fontSize, fontWeight, iconSize, radius, spacing } from '../../../theme';

type CategoriaCardProps = {
  categoria: Categoria;
  onDeletar: () => void;
};

/** Cartao de uma categoria cadastrada. */
export default function CategoriaCard({
  categoria,
  onDeletar,
}: CategoriaCardProps): React.ReactNode {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <View style={styles.iconeBadge}>
          <Ionicons name="pricetag-outline" size={iconSize.md} color={colors.primary} />
        </View>
        <Text style={styles.nome} numberOfLines={1}>
          {categoria.nome}
        </Text>
      </View>

      <IconButton icon="trash" variant="danger" onPress={onDeletar} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconeBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: {
    flexShrink: 1,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
});
