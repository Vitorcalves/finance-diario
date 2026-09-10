import { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ChipSelector,
  type ChipOpcao,
  EmptyState,
  LoadingState,
  ScreenHeader,
} from '../../components/ui';
import type { Produto } from '../../models/produtos';
import type { ProdutosStackParamList } from '../../routes/types';
import { colors, fontSize, iconSize, radius, sharedStyles, spacing } from '../../theme';
import HistoricoProdutoModal from './components/HistoricoProdutoModal';
import ProdutoCard from './components/ProdutoCard';
import { useProdutosList } from './useProdutosList';

type ProdutosListNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutosList'>;

type Ordenacao = 'recentes' | 'nome' | 'menor-preco' | 'maior-preco';

const ORDENACAO_OPCOES: ChipOpcao<Ordenacao>[] = [
  { valor: 'recentes', rotulo: 'Recentes' },
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'maior-preco', rotulo: 'Maior preço' },
];

/** Lista de produtos cadastrados. */
export default function ProdutosListView(): React.ReactNode {
  const navigation = useNavigation<ProdutosListNavigation>();
  const {
    produtos,
    variantes,
    loading,
    categoriasDoProduto,
    variantesDoProduto,
    nomeUnidade,
    nomeMarca,
    deletar,
  } = useProdutosList();

  const [produtoHistorico, setProdutoHistorico] = useState<Produto | null>(null);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes');

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = termo
      ? produtos.filter((produto) => produto.nome.toLowerCase().includes(termo))
      : produtos;

    const ordenados = [...filtrados];
    switch (ordenacao) {
      case 'nome':
        ordenados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        break;
      case 'menor-preco':
        ordenados.sort((a, b) => a.preco - b.preco);
        break;
      case 'maior-preco':
        ordenados.sort((a, b) => b.preco - a.preco);
        break;
      case 'recentes':
      default:
        break;
    }

    return ordenados;
  }, [produtos, busca, ordenacao]);

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Produtos" onAdd={(): void => navigation.navigate('ProdutoForm')} />

      {!loading && produtos.length > 0 && (
        <View style={styles.filtros}>
          <View style={styles.buscaContainer}>
            <Ionicons name="search" size={iconSize.sm} color={colors.textSubtle} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar produto"
              placeholderTextColor={colors.placeholder}
              value={busca}
              onChangeText={setBusca}
            />
            {busca.length > 0 && (
              <Pressable onPress={(): void => setBusca('')} hitSlop={8}>
                <Ionicons name="close-circle" size={iconSize.sm} color={colors.textSubtle} />
              </Pressable>
            )}
          </View>

          <ChipSelector
            opcoes={ORDENACAO_OPCOES}
            selecionado={ordenacao}
            onSelecionar={setOrdenacao}
            scroll
          />
        </View>
      )}

      {loading ? (
        <LoadingState />
      ) : produtos.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          message="Nenhum produto adicionado"
          actionLabel="Adicionar Produto"
          onAction={(): void => navigation.navigate('ProdutoForm')}
        />
      ) : produtosFiltrados.length === 0 ? (
        <EmptyState icon="search" message={`Nenhum produto encontrado para "${busca}"`} />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={[sharedStyles.listContent, styles.listContent]}
        >
          {produtosFiltrados.map((produto) => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              categorias={categoriasDoProduto(produto.id)}
              variantes={variantesDoProduto(produto.id)}
              nomeUnidade={nomeUnidade}
              nomeMarca={nomeMarca}
              onVerHistorico={(): void => setProdutoHistorico(produto)}
              onEditar={(): void => navigation.navigate('ProdutoForm', { produtoId: produto.id })}
              onDeletar={(): void => deletar(produto)}
            />
          ))}
        </ScrollView>
      )}

      {produtoHistorico && (
        <HistoricoProdutoModal
          produto={produtoHistorico}
          variantes={variantes}
          nomeMarca={nomeMarca}
          onFechar={(): void => setProdutoHistorico(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  buscaInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  listContent: {
    gap: spacing.sm,
  },
});
