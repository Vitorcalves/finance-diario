import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deleteProdutoById, listProdutos, type Produto } from '../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../models/produtoVariantes';
import { type Categoria, listCategorias } from '../models/categorias';
import {
  type CategoriaProduto,
  listCategorias as listCategoriaVinculos,
} from '../models/categoriasProduto';
import { listMarcas, type Marca } from '../models/marcas';
import { type HistoricoPreco, listHistoricoPreco } from '../models/historicoPreco';
import { Unidades } from '../utils/unidades';
import type { ProdutosStackParamList } from '../routes/types';
import { EmptyState, IconButton, LoadingState, ScreenHeader } from '../components/ui';
import { colors, fontSize, fontWeight, sharedStyles, spacing } from '../theme';

type ProdutosListNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutosList'>;

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function ProdutosListView(): React.ReactNode {
  const navigation = useNavigation<ProdutosListNavigation>();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaVinculos, setCategoriaVinculos] = useState<CategoriaProduto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const unidades = Unidades.listar();
  const [loading, setLoading] = useState(true);

  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [produtoSelecionadoHistorico, setProdutoSelecionadoHistorico] = useState<Produto | null>(
    null,
  );
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const nomeUnidade = (id: number | null): string =>
    unidades.find((unidade) => unidade.id === id)?.descricao ?? '';

  const nomeMarca = (id: number | null): string =>
    marcas.find((marca) => marca.id === id)?.nome ?? '';

  const carregarProdutos = async (): Promise<void> => {
    try {
      setLoading(true);
      const [produtosDoBanco, variantesDoBanco, vinculosDoBanco, categoriasDoBanco, marcasDoBanco] =
        await Promise.all([
          listProdutos(),
          listProdutoVariantes(),
          listCategoriaVinculos(),
          listCategorias(),
          listMarcas(),
        ]);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setCategoriaVinculos(vinculosDoBanco);
      setCategorias(categoriasDoBanco);
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void carregarProdutos();
    }, []),
  );

  const abrirHistorico = async (produto: Produto): Promise<void> => {
    setProdutoSelecionadoHistorico(produto);
    setShowHistoricoModal(true);
    setCarregandoHistorico(true);
    try {
      const historico = await listHistoricoPreco();
      const historicoDoProducto = historico.filter((h) => h.produto_id === produto.id);
      setHistoricoPrecos(historicoDoProducto);
    } catch (error: unknown) {
      console.error('Erro ao carregar histórico:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de preços');
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharHistorico = (): void => {
    setShowHistoricoModal(false);
    setProdutoSelecionadoHistorico(null);
    setHistoricoPrecos([]);
  };

  const deletarProduto = (produto: Produto): void => {
    Alert.alert('Confirmar exclusão', `Deseja deletar "${produto.nome}"?`, [
      { text: 'Cancelar', onPress: (): void => {}, style: 'cancel' },
      {
        text: 'Deletar',
        onPress: (): void => {
          void (async (): Promise<void> => {
            try {
              await deleteProdutoById(produto.id);
              await carregarProdutos();
              Alert.alert('Sucesso', 'Produto deletado!');
            } catch (error: unknown) {
              console.error('Erro ao deletar produto:', error);
              Alert.alert('Erro', 'Não foi possível deletar o produto');
            }
          })();
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Produtos" onAdd={() => navigation.navigate('ProdutoForm')} />

      {loading ? (
        <LoadingState />
      ) : produtos.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          message="Nenhum produto adicionado"
          actionLabel="Adicionar Produto"
          onAction={() => navigation.navigate('ProdutoForm')}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {produtos.map((produto) => {
            const categoriasDoProduto = categoriaVinculos
              .filter((v) => v.produto_id === produto.id)
              .map((v) => categorias.find((c) => c.id === v.categoria_id)?.nome)
              .filter((n): n is string => Boolean(n));
            const variantesDoProduto = variantes.filter((v) => v.produto_id === produto.id);

            return (
              <View key={produto.id} style={[sharedStyles.listCard, styles.produtoCard]}>
                <View style={sharedStyles.listCardInfo}>
                  <Text style={sharedStyles.listCardTitle}>{produto.nome}</Text>
                  <Text style={styles.produtoPreco}>
                    {toCurrency(produto.preco)}
                    {produto.unidade_id !== null ? ` / ${nomeUnidade(produto.unidade_id)}` : ''}
                  </Text>

                  {categoriasDoProduto.length > 0 && (
                    <View style={styles.categoriaChipRow}>
                      {categoriasDoProduto.map((nomeCategoria) => (
                        <View key={nomeCategoria} style={styles.categoriaChip}>
                          <Text style={styles.categoriaChipText}>{nomeCategoria}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {variantesDoProduto.length === 0 ? (
                    <Text style={sharedStyles.inlineEmptyText}>Nenhuma variante cadastrada</Text>
                  ) : (
                    variantesDoProduto.map((variante) => (
                      <Text key={variante.id} style={sharedStyles.listCardDetail}>
                        {`${nomeMarca(variante.marca_id) || 'Sem marca'} • ${toCurrency(variante.preco)}${
                          variante.codigo_barras ? ` • ${variante.codigo_barras}` : ''
                        }`}
                      </Text>
                    ))
                  )}
                </View>

                <View style={sharedStyles.iconButtonRow}>
                  <IconButton
                    icon="eye"
                    variant="info"
                    onPress={() => void abrirHistorico(produto)}
                  />
                  <IconButton
                    icon="pencil"
                    variant="primary"
                    onPress={() => navigation.navigate('ProdutoForm', { produtoId: produto.id })}
                  />
                  <IconButton
                    icon="trash"
                    variant="danger"
                    onPress={() => deletarProduto(produto)}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showHistoricoModal} animationType="slide" transparent={false}>
        <SafeAreaView style={sharedStyles.screen}>
          <ScreenHeader
            title="Histórico de Preços"
            subtitle={produtoSelecionadoHistorico?.nome}
            backIcon="close"
            onBack={fecharHistorico}
          />

          {carregandoHistorico ? (
            <LoadingState />
          ) : historicoPrecos.length === 0 ? (
            <EmptyState icon="time-outline" message="Nenhum histórico de preço" />
          ) : (
            <ScrollView
              style={sharedStyles.scrollArea}
              contentContainerStyle={sharedStyles.listContent}
            >
              {historicoPrecos.map((h) => {
                const variante = variantes.find((v) => v.id === h.variante_id);
                const rotulo = variante
                  ? nomeMarca(variante.marca_id) || 'Variante sem marca'
                  : 'Preço base';

                return (
                  <View key={h.id} style={sharedStyles.listCard}>
                    <View style={sharedStyles.listCardInfo}>
                      <Text style={styles.historicoPreco}>{toCurrency(h.preco)}</Text>
                      <Text style={sharedStyles.listCardDetail}>{rotulo}</Text>
                      <Text style={styles.historicoData}>
                        {new Date(h.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  produtoCard: {
    alignItems: 'flex-start',
  },
  produtoPreco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  categoriaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoriaChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoriaChipText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  historicoPreco: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  historicoData: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
});
