import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
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
import MenuItem from './MenuItem';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type MenuGrupoItem = {
  label: string;
  onPress: () => void;
  icone?: IconName;
  /** Destaca a acao como destrutiva (ex.: recriar o banco). */
  perigo?: boolean;
};

type MenuGrupoProps = {
  titulo: string;
  icone: IconName;
  itens: MenuGrupoItem[];
  /** Comeca expandido; usado no grupo de acesso mais frequente. */
  aberturaInicial?: boolean;
};

/** Secao em sanfona do menu: cabecalho tocavel que expande a lista de atalhos. */
export default function MenuGrupo({
  titulo,
  icone,
  itens,
  aberturaInicial = false,
}: MenuGrupoProps): React.ReactNode {
  const [aberto, setAberto] = useState(aberturaInicial);

  return (
    <View style={sharedStyles.card}>
      <Pressable style={styles.header} onPress={(): void => setAberto((atual) => !atual)}>
        <View style={styles.headerInfo}>
          <View style={styles.iconeBadge}>
            <Ionicons name={icone} size={iconSize.md} color={colors.primary} />
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={iconSize.md}
          color={colors.primaryDark}
        />
      </Pressable>

      {aberto && (
        <View style={styles.lista}>
          {itens.map((item) => (
            <MenuItem
              key={item.label}
              label={item.label}
              icone={item.icone}
              perigo={item.perigo}
              onPress={item.onPress}
              compact
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconeBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  lista: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
