import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { Produto } from '../../models/produtos';
import type { ProdutosStackParamList } from '../../routes/types';
import { sharedStyles } from '../../theme';
import HistoricoProdutoModal from './components/HistoricoProdutoModal';
import ProdutoCard from './components/ProdutoCard';
import { useProdutosList } from './useProdutosList';

type ProdutosListNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutosList'>;

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

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Produtos" onAdd={(): void => navigation.navigate('ProdutoForm')} />

      {loading ? (
        <LoadingState />
      ) : produtos.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          message="Nenhum produto adicionado"
          actionLabel="Adicionar Produto"
          onAction={(): void => navigation.navigate('ProdutoForm')}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {produtos.map((produto) => (
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
