import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChipSelector,
  type ChipOpcao,
  EmptyState,
  LoadingState,
  MenuAcoes,
  ScreenHeader,
  TextInput,
} from '../../components/ui';
import HistoricoProdutoModal from '../../components/HistoricoProdutoModal';
import type { Produto } from '../../models/produtos';
import type { ProdutosStackParamList } from '../../routes/types';
import { fontSize, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { correspondeBusca } from '../../utils/busca';
import ProdutoCard from './components/ProdutoCard';
import { useProdutosList } from './useProdutosList';

type ProdutosListNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutosList'>;

type Filtro = 'frequentes' | 'eventuais' | 'todos';

/** Lista de produtos cadastrados. */
export default function ProdutosListView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<ProdutosListNavigation>();
  const {
    produtos,
    variantes,
    marcas,
    loading,
    atualizando,
    atualizar,
    categoriasDoProduto,
    variantesDoProduto,
    nomeUnidade,
    nomeMarca,
    deletar,
  } = useProdutosList();

  const [produtoHistorico, setProdutoHistorico] = useState<Produto | null>(null);
  /** Continua preenchido durante a animacao de saida do menu. */
  const [produtoAcoes, setProdutoAcoes] = useState<Produto | null>(null);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('frequentes');

  const termo = busca.trim();

  /** Ja vem em ordem alfabetica do model; aqui so filtra. */
  const produtosFiltrados = useMemo(
    () =>
      produtos.filter((produto) => {
        const eventual = produto.eventual === 1;

        // Com busca, "Frequentes" tambem acha os eventuais: e assim que se
        // reencontra o mouse comprado ha 3 anos.
        if (filtro === 'frequentes' && eventual && !termo) {
          return false;
        }

        if (filtro === 'eventuais' && !eventual) {
          return false;
        }

        return correspondeBusca(produto.nome, termo);
      }),
    [produtos, termo, filtro],
  );

  const opcoesFiltro = useMemo((): ChipOpcao<Filtro>[] => {
    const eventuais = produtos.filter((produto) => produto.eventual === 1).length;

    return [
      { valor: 'frequentes', rotulo: 'Frequentes', contador: produtos.length - eventuais },
      { valor: 'eventuais', rotulo: 'Eventuais', contador: eventuais },
      { valor: 'todos', rotulo: 'Todos', contador: produtos.length },
    ];
  }, [produtos]);

  const editar = useCallback(
    (produto: Produto): void => navigation.navigate('ProdutoForm', { produtoId: produto.id }),
    [navigation],
  );

  const renderProduto = ({ item }: { item: Produto }): React.ReactElement => (
    <ProdutoCard
      produto={item}
      categorias={categoriasDoProduto(item.id)}
      variantes={variantesDoProduto(item.id)}
      nomeUnidade={nomeUnidade}
      nomeMarca={nomeMarca}
      onAbrirAcoes={(): void => {
        setProdutoAcoes(item);
        setMenuVisivel(true);
      }}
    />
  );

  const renderConteudo = (): React.ReactNode => {
    if (loading) {
      return <LoadingState />;
    }

    if (produtos.length === 0) {
      return (
        <EmptyState
          icon="cube-outline"
          message="Nenhum produto cadastrado"
          hint="Cadastre os produtos que você compra para acompanhar os preços."
          actionLabel="Adicionar produto"
          onAction={(): void => navigation.navigate('ProdutoForm')}
        />
      );
    }

    return (
      <FlatList
        data={produtosFiltrados}
        keyExtractor={(produto): string => produto.id}
        renderItem={renderProduto}
        contentContainerStyle={sharedStyles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            message={
              termo
                ? `Nenhum produto encontrado para "${busca.trim()}"`
                : 'Nenhum produto neste filtro'
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Produtos"
        subtitle={
          produtos.length > 0
            ? `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`
            : undefined
        }
        onAdd={(): void => navigation.navigate('ProdutoForm')}
      />

      {!loading && produtos.length > 0 && (
        <View style={styles.filtros}>
          <View style={styles.buscaContainer}>
            <Ionicons name="search" size={iconSize.sm} color={colors.textSubtle} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar produto"
              value={busca}
              onChangeText={setBusca}
              returnKeyType="search"
            />
            {busca.length > 0 && (
              <Pressable
                onPress={(): void => setBusca('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
              >
                <Ionicons name="close-circle" size={iconSize.sm} color={colors.textSubtle} />
              </Pressable>
            )}
          </View>

          <ChipSelector
            opcoes={opcoesFiltro}
            selecionado={filtro}
            onSelecionar={setFiltro}
            scroll
          />
        </View>
      )}

      {renderConteudo()}

      <MenuAcoes
        visivel={menuVisivel}
        titulo={produtoAcoes?.nome ?? ''}
        onFechar={(): void => setMenuVisivel(false)}
        acoes={
          produtoAcoes
            ? [
                {
                  rotulo: 'Ver histórico de preços',
                  icone: 'time-outline',
                  onPress: (): void => setProdutoHistorico(produtoAcoes),
                },
                {
                  rotulo: 'Editar',
                  icone: 'pencil-outline',
                  onPress: (): void => editar(produtoAcoes),
                },
                {
                  rotulo: 'Excluir',
                  icone: 'trash-outline',
                  perigo: true,
                  onPress: (): void => deletar(produtoAcoes),
                },
              ]
            : []
        }
      />

      {produtoHistorico && (
        <HistoricoProdutoModal
          produtoId={produtoHistorico.id}
          subtitulo={produtoHistorico.nome}
          variantes={variantes}
          marcas={marcas}
          onFechar={(): void => setProdutoHistorico(null)}
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  buscaInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
  },
}));
