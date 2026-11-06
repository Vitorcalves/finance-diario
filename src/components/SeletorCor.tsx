import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import {
  CORES_CATEGORIA,
  type CorCategoria,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../theme';
import { vibrarSelecao } from '../utils/haptics';
import { PressableScale } from './ui';

type SeletorCorProps = {
  /** Chave escolhida (`azul`...); `null` ou valor fora da paleta deixa nenhuma marcada. */
  valor: string | null;
  onChange: (cor: CorCategoria) => void;
};

/** Grade com a paleta de cores do app, usada nas categorias e nas contas. */
export default function SeletorCor({ valor, onChange }: SeletorCorProps): React.ReactNode {
  const { colors, corCategoria } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.grade}>
      {CORES_CATEGORIA.map((chave) => {
        const ativa = chave === valor;

        return (
          <PressableScale
            key={chave}
            escala={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Cor ${chave}`}
            accessibilityState={{ selected: ativa }}
            style={[styles.cor, { backgroundColor: corCategoria(chave) }, ativa && styles.corAtiva]}
            onPress={(): void => {
              vibrarSelecao();
              onChange(chave);
            }}
          >
            {ativa && <Ionicons name="checkmark" size={iconSize.sm} color={colors.onHero} />}
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cor: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corAtiva: {
    borderWidth: 3,
    borderColor: colors.surface,
    // Anel externo para a cor escolhida se destacar das outras.
    outlineWidth: 2,
    outlineColor: colors.textStrong,
  },
}));
