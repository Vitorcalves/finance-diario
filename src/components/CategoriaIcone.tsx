import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { makeStyles, radius, useTheme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type CategoriaIconeProps = {
  /** Nome do icone gravado na categoria; sem ele mostra o de "sem categoria". */
  icone?: string | null;
  /** Chave da cor da categoria (`verde`, `azul`...). */
  cor?: string | null;
  tamanho?: number;
};

/** Circulo com o icone da categoria sobre um fundo claro da cor dela. */
export default function CategoriaIcone({
  icone,
  cor,
  tamanho = 40,
}: CategoriaIconeProps): React.ReactNode {
  const { corCategoria } = useTheme();
  const styles = useStyles();
  const tinta = corCategoria(cor);

  return (
    <View
      style={[
        styles.circulo,
        // 15% da cor da categoria: o icone continua sendo o destaque.
        { width: tamanho, height: tamanho, backgroundColor: `${tinta}26` },
      ]}
    >
      <Ionicons
        name={(icone ?? 'pricetag-outline') as IconName}
        size={Math.round(tamanho * 0.48)}
        color={tinta}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  circulo: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
