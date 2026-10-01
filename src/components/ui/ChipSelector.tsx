import { ScrollView, View } from 'react-native';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../theme';
import { vibrarSelecao } from '../../utils/haptics';
import PressableScale from './PressableScale';
import Text from './Text';

export type ChipOpcao<T extends string | number> = {
  valor: T;
  rotulo: string;
  /** Numero exibido ao lado do rotulo (ex.: quantos itens o filtro mostra). */
  contador?: number;
};

type ChipSelectorProps<T extends string | number> = {
  opcoes: ChipOpcao<T>[];
  selecionado: T | null;
  onSelecionar: (valor: T) => void;
  /** `true` rola na horizontal; `false` (padrao) quebra em varias linhas. */
  scroll?: boolean;
};

/**
 * Lista de chips com no maximo uma opcao ativa.
 * Usada nos filtros e na escolha de variante/agrupamento.
 */
export default function ChipSelector<T extends string | number>({
  opcoes,
  selecionado,
  onSelecionar,
  scroll = false,
}: ChipSelectorProps<T>): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();

  const chips = opcoes.map((opcao) => {
    const ativo = selecionado === opcao.valor;

    return (
      <PressableScale
        key={opcao.valor}
        escala={0.94}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
        style={[
          sharedStyles.chip,
          scroll && sharedStyles.chipSpaced,
          ativo && sharedStyles.chipActive,
        ]}
        onPress={(): void => {
          if (!ativo) {
            vibrarSelecao();
          }

          onSelecionar(opcao.valor);
        }}
      >
        <Text style={[sharedStyles.chipText, ativo && sharedStyles.chipTextActive]}>
          {opcao.rotulo}
        </Text>
        {opcao.contador !== undefined && (
          <View style={[styles.contador, ativo && styles.contadorAtivo]}>
            <Text style={[styles.contadorTexto, ativo && styles.contadorTextoAtivo]}>
              {opcao.contador}
            </Text>
          </View>
        )}
      </PressableScale>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sharedStyles.chipScrollRow}
        keyboardShouldPersistTaps="handled"
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={sharedStyles.chipRow}>{chips}</View>;
}

const useStyles = makeStyles((colors) => ({
  contador: {
    minWidth: 20,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  contadorAtivo: {
    backgroundColor: colors.onPrimary,
  },
  contadorTexto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  contadorTextoAtivo: {
    color: colors.primary,
  },
}));
