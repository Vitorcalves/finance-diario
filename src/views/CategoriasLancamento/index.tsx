import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CategoriaIcone from '../../components/CategoriaIcone';
import {
  EmptyState,
  IconButton,
  LoadingState,
  PressableScale,
  ScreenHeader,
  Text,
} from '../../components/ui';
import type { CategoriaLancamento } from '../../models/categoriasLancamento';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../theme';
import CategoriaLancamentoForm from './components/CategoriaLancamentoForm';
import { useCategoriasLancamento } from './useCategoriasLancamento';

/** Categorias usadas para classificar os lancamentos (Mercado, Transporte...). */
export default function CategoriasLancamentoView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const { categorias, loading, salvar, excluir } = useCategoriasLancamento();
  const [formAberto, setFormAberto] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce com os dados certos. */
  const [formKey, setFormKey] = useState(0);
  const [editando, setEditando] = useState<CategoriaLancamento | null>(null);

  const abrir = (categoria: CategoriaLancamento | null): void => {
    setEditando(categoria);
    setFormKey((atual) => atual + 1);
    setFormAberto(true);
  };

  const grupo = (titulo: string, lista: CategoriaLancamento[]): React.ReactNode =>
    lista.length > 0 && (
      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>{titulo}</Text>
        <View style={styles.cartao}>
          {lista.map((categoria, indice) => (
            <View key={categoria.id}>
              {indice > 0 && <View style={styles.divisor} />}
              <PressableScale
                style={styles.linha}
                escala={0.98}
                onPress={(): void => abrir(categoria)}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${categoria.nome}`}
              >
                <CategoriaIcone icone={categoria.icone} cor={categoria.cor} />
                <Text style={styles.nome} numberOfLines={1}>
                  {categoria.nome}
                </Text>
                <IconButton
                  icon="trash-outline"
                  variant="danger"
                  size={iconSize.sm}
                  onPress={(): void => excluir(categoria)}
                  accessibilityLabel={`Excluir ${categoria.nome}`}
                />
              </PressableScale>
            </View>
          ))}
        </View>
      </View>
    );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Categorias"
        subtitle="Dos lançamentos · toque para editar"
        onBack={(): void => navigation.goBack()}
        onAdd={(): void => abrir(null)}
      />

      {loading ? (
        <LoadingState />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          message="Nenhuma categoria"
          actionLabel="Criar categoria"
          onAction={(): void => abrir(null)}
        />
      ) : (
        <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.conteudo}>
          {grupo(
            'Saídas',
            categorias.filter((categoria) => categoria.tipo === 'saida'),
          )}
          {grupo(
            'Entradas',
            categorias.filter((categoria) => categoria.tipo === 'entrada'),
          )}
        </ScrollView>
      )}

      <CategoriaLancamentoForm
        key={formKey}
        visivel={formAberto}
        categoria={editando}
        onFechar={(): void => setFormAberto(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  conteudo: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  secao: {
    gap: spacing.sm,
  },
  tituloSecao: {
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
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  nome: {
    flex: 1,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  divisor: {
    height: 1,
    marginLeft: spacing.lg + 40 + spacing.md,
    backgroundColor: colors.divider,
  },
}));
