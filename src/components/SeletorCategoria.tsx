import { ScrollView, View } from 'react-native';
import type { CategoriaLancamento, TipoCategoriaLancamento } from '../models/categoriasLancamento';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../theme';
import { vibrarSelecao } from '../utils/haptics';
import CategoriaIcone from './CategoriaIcone';
import { PressableScale, Text } from './ui';

type SeletorCategoriaProps = {
  categorias: CategoriaLancamento[];
  /** So mostra as categorias deste tipo (saida ou entrada). */
  tipo: TipoCategoriaLancamento;
  selecionada: string | null;
  /** Tocar na categoria ja escolhida a desmarca (`null`). */
  onSelecionar: (categoriaId: string | null) => void;
};

/** Faixa horizontal de categorias com icone e cor, para escolher uma. */
export default function SeletorCategoria({
  categorias,
  tipo,
  selecionada,
  onSelecionar,
}: SeletorCategoriaProps): React.ReactNode {
  const { corCategoria } = useTheme();
  const styles = useStyles();
  const doTipo = categorias.filter((categoria) => categoria.tipo === tipo);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.linha}
    >
      {doTipo.map((categoria) => {
        const ativa = categoria.id === selecionada;

        return (
          <PressableScale
            key={categoria.id}
            escala={0.94}
            accessibilityRole="button"
            accessibilityState={{ selected: ativa }}
            accessibilityLabel={categoria.nome}
            style={[
              styles.opcao,
              ativa && { borderColor: corCategoria(categoria.cor) },
              ativa && styles.opcaoAtiva,
            ]}
            onPress={(): void => {
              vibrarSelecao();
              onSelecionar(ativa ? null : categoria.id);
            }}
          >
            <CategoriaIcone icone={categoria.icone} cor={categoria.cor} tamanho={36} />
            <View style={styles.textoArea}>
              <Text style={[styles.texto, ativa && styles.textoAtivo]} numberOfLines={2}>
                {categoria.nome}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  opcao: {
    width: 84,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
  },
  opcaoAtiva: {
    backgroundColor: colors.surface,
  },
  textoArea: {
    minHeight: 30,
    justifyContent: 'center',
  },
  texto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  textoAtivo: {
    color: colors.textStrong,
    fontWeight: fontWeight.bold,
  },
}));
