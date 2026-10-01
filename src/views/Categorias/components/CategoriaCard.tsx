import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { IconButton, Text } from '../../../components/ui';
import type { Categoria } from '../../../models/categorias';
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

type CategoriaCardProps = {
  categoria: Categoria;
  onDeletar: () => void;
};

/** Cartao de uma categoria cadastrada. */
export default function CategoriaCard({
  categoria,
  onDeletar,
}: CategoriaCardProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
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

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadows.card,
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
    color: colors.textStrong,
  },
}));
