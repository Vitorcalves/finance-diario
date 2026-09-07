import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deleteProdutoById, listProdutos, type Produto } from '../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../models/produtoVariantes';
import { type Categoria, listCategorias } from '../models/categorias';
import { type CategoriaProduto, listCategorias as listCategoriaVinculos } from '../models/categoriasProduto';
import { listMarcas, type Marca } from '../models/marcas';
import { type HistoricoPreco, listHistoricoPreco } from '../models/historicoPreco';
import { Unidades } from '../utils/unidades';
import type { ProdutosStackParamList } from '../routes/types';

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

  const nomeMarca = (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '';

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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Produtos</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('ProdutoForm')}>
          <Ionicons name="add-circle" size={32} color="#0f7a5b" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0f7a5b" />
        </View>
      ) : produtos.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="cube-outline" size={64} color="#8ba29a" />
          <Text style={styles.emptyText}>Nenhum produto adicionado</Text>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('ProdutoForm')}>
            <Text style={styles.buttonText}>Adicionar Produto</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {produtos.map((produto) => {
            const categoriasDoProduto = categoriaVinculos
              .filter((v) => v.produto_id === produto.id)
              .map((v) => categorias.find((c) => c.id === v.categoria_id)?.nome)
              .filter((n): n is string => Boolean(n));
            const variantesDoProduto = variantes.filter((v) => v.produto_id === produto.id);

            return (
              <View key={produto.id} style={styles.produtoCard}>
                <View style={styles.produtoInfo}>
                  <Text style={styles.produtoNome}>{produto.nome}</Text>
                  <Text style={styles.produtoPreco}>
                    {toCurrency(produto.preco)}
                    {produto.unidade_id !== null ? ` / ${nomeUnidade(produto.unidade_id)}` : ''}
                  </Text>

                  {categoriasDoProduto.length > 0 && (
                    <View style={styles.chipRow}>
                      {categoriasDoProduto.map((nomeCategoria) => (
                        <View key={nomeCategoria} style={styles.chip}>
                          <Text style={styles.chipText}>{nomeCategoria}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {variantesDoProduto.length === 0 ? (
                    <Text style={styles.emptyCategoriasText}>Nenhuma variante cadastrada</Text>
                  ) : (
                    variantesDoProduto.map((variante) => (
                      <Text key={variante.id} style={styles.varianteResumo}>
                        {`${nomeMarca(variante.marca_id) || 'Sem marca'} • ${toCurrency(variante.preco)}${
                          variante.codigo_barras ? ` • ${variante.codigo_barras}` : ''
                        }`}
                      </Text>
                    ))
                  )}
                </View>

                <View style={styles.actionsContainer}>
                  <Pressable
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => void abrirHistorico(produto)}
                  >
                    <Ionicons name="eye" size={20} color="#0f7a5b" />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => navigation.navigate('ProdutoForm', { produtoId: produto.id })}
                  >
                    <Ionicons name="pencil" size={20} color="#0f7a5b" />
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deletarProduto(produto)}
                  >
                    <Ionicons name="trash" size={20} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showHistoricoModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharHistorico}>
              <Ionicons name="close" size={32} color="#0b3d2e" />
            </Pressable>
            <Text style={styles.modalTitle}>Histórico de Preços</Text>
            <View style={styles.modalSpacer} />
          </View>

          {carregandoHistorico ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#0f7a5b" />
            </View>
          ) : historicoPrecos.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="time-outline" size={64} color="#8ba29a" />
              <Text style={styles.emptyText}>Nenhum histórico de preço</Text>
            </View>
          ) : (
            <ScrollView style={styles.historicoListContainer}>
              {produtoSelecionadoHistorico && (
                <View style={styles.produtoHeader}>
                  <Text style={styles.produtoNomeTitulo}>{produtoSelecionadoHistorico.nome}</Text>
                </View>
              )}
              {historicoPrecos.map((h) => {
                const variante = variantes.find((v) => v.id === h.variante_id);
                const rotulo = variante ? nomeMarca(variante.marca_id) || 'Variante sem marca' : 'Preço base';

                return (
                  <View key={h.id} style={styles.historicoItem}>
                    <View style={styles.historicoInfo}>
                      <Text style={styles.historicoPreco}>{toCurrency(h.preco)}</Text>
                      <Text style={styles.historicoRotulo}>{rotulo}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  addButton: {
    padding: 8,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  produtoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f0f7f4',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0f7a5b',
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 4,
  },
  produtoPreco: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f7a5b',
    marginBottom: 4,
  },
  varianteResumo: {
    fontSize: 12,
    color: '#0b3d2e',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewButton: {
    backgroundColor: '#e0f2fe',
  },
  editButton: {
    backgroundColor: '#e6f4ed',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8ba29a',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  modalSpacer: {
    width: 32,
  },
  emptyCategoriasText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f4ed',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#0f7a5b',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0f7a5b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  historicoListContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  produtoHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f7f4',
    borderRadius: 8,
    marginBottom: 12,
  },
  produtoNomeTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  historicoItem: {
    backgroundColor: '#f9fdfb',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0f7a5b',
  },
  historicoInfo: {
    gap: 4,
  },
  historicoPreco: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f7a5b',
  },
  historicoRotulo: {
    fontSize: 12,
    color: '#0b3d2e',
  },
  historicoData: {
    fontSize: 12,
    color: '#8ba29a',
  },
});
