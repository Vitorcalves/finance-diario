import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Fragment } from 'react';
import { View } from 'react-native';
import { Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, radius, shadows, spacing } from '../../../theme';
import MenuItem from './MenuItem';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type MenuGrupoItem = {
  label: string;
  descricao?: string;
  icone: IconName;
  onPress: () => void;
  /** Destaca a acao como destrutiva (ex.: recriar o banco). */
  perigo?: boolean;
};

type MenuGrupoProps = {
  titulo: string;
  itens: MenuGrupoItem[];
};

/** Secao do menu: titulo pequeno e as linhas agrupadas num unico cartao. */
export default function MenuGrupo({ titulo, itens }: MenuGrupoProps): React.ReactNode {
  const styles = useStyles();

  return (
    <View style={styles.secao}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.cartao}>
        {itens.map((item, indice) => (
          <Fragment key={item.label}>
            {indice > 0 && <View style={styles.divisor} />}
            <MenuItem
              label={item.label}
              descricao={item.descricao}
              icone={item.icone}
              perigo={item.perigo}
              onPress={item.onPress}
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  secao: {
    gap: spacing.sm,
  },
  titulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  cartao: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  divisor: {
    height: 1,
    marginLeft: spacing.lg + 36 + spacing.md,
    backgroundColor: colors.divider,
  },
}));
