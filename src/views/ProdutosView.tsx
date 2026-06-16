import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import BrazilianIntegerInput from '../components/BrazilianIntegerInput';
import {
  type Produto,
  type ProdutoListagem,
  listProdutos,
  insertProduto,
  deleteProdutoById,
  updateProduto,
} from '../models/produtos';
import {
  type HistoricoPrecoProduto,
  listHistoricoPrecoProdutos,
} from '../models/historicoPrecoProduto';
import { type Categoria, listCategorias } from '../models/categorias';
import { type Marca, listMarcas } from '../models/marcas';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export default function ProdutosView(): React.ReactNode {
  const [produtos, setProdutos] = useState<ProdutoListagem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [comboMarcaAberto, setComboMarcaAberto] = useState(false);
  const [marcaBusca, setMarcaBusca] = useState('');
  const [marcaId, setMarcaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaBusca, setCategoriaBusca] = useState('');
  const [comboCategoriaAberto, setComboCategoriaAberto] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [produtoSelecionadoHistorico, setProdutoSelecionadoHistorico] = useState<Produto | null>(
    null,
  );
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPrecoProduto[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const categoriaSelecionadaNome =
    categorias.find((categoria) => categoria.id === categoriaId)?.nome ?? '';

  const categoriasFiltradas = categorias.filter((categoria) =>
    categoria.nome.toLowerCase().includes(categoriaBusca.trim().toLowerCase()),
  );

  const marcaSelecionadaNome = marcas.find((marca) => marca.id === marcaId)?.nome ?? '';

  const marcasFiltradas = marcas.filter((marca) =>
    marca.nome.toLowerCase().includes(categoriaBusca.trim().toLowerCase()),
  );

  const carregarProdutos = async (): Promise<void> => {
    try {
      setLoading(true);
      const produtosDoBanco = await listProdutos();
      setProdutos(produtosDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const carregarCategorias = async (): Promise<void> => {
    try {
      const categoriasDoBanco = await listCategorias();
      setCategorias(categoriasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const carregarMarcas = async (): Promise<void> => {
    try {
      const marcasDoBanco = await listMarcas();
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as marcas');
    }
  };

  const abrirHistorico = async (produto: ProdutoListagem): Promise<void> => {
    setProdutoSelecionadoHistorico(produto);
    setShowHistoricoModal(true);
    setCarregandoHistorico(true);
    try {
      const historico = await listHistoricoPrecoProdutos();
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

  const abrirScanner = async (): Promise<void> => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setShowScannerModal(true);
  };

  const fecharScanner = (): void => {
    setShowScannerModal(false);
  };

  const handleBarcodeScanned = (result: { data: string }): void => {
    if (result.data && result.data.trim()) {
      setCodigoBarras(result.data);
      fecharScanner();
    }
  };

  useEffect((): (() => void) => {
    let active = true;

    void (async (): Promise<void> => {
      if (!active) {
        return;
      }
      await Promise.all([carregarProdutos(), carregarCategorias(), carregarMarcas()]);
    })();

    return (): void => {
      active = false;
    };
  }, []);

  const limparFormulario = (): void => {
    setNome('');
    setPreco('');
    setCodigoBarras('');
    setCategoriaId('');
    setCategoriaBusca('');
    setComboCategoriaAberto(false);
    setEditingProduto(null);
  };

  const abrirFormulario = (produto?: Produto): void => {
    if (produto) {
      setEditingProduto(produto);
      setNome(produto.nome);
      setPreco(produto.preco.toFixed(2));
      setCodigoBarras(produto.codigo_barras ?? '');
      setCategoriaId(produto.categoria_id ?? '');
      setMarcaId(produto.marca_id ?? null);
      setCategoriaBusca('');
    } else {
      limparFormulario();
    }
    setShowForm(true);
  };

  const fecharFormulario = (): void => {
    setShowForm(false);
    limparFormulario();
  };

  const salvarProduto = async (): Promise<void> => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Nome do produto é obrigatório');
      return;
    }

    const precoParsado = Number(preco);
    if (precoParsado <= 0) {
      Alert.alert('Erro', 'Preço deve ser maior que zero');
      return;
    }

    try {
      if (editingProduto) {
        await updateProduto({
          ...editingProduto,
          nome,
          preco: precoParsado,
          codigo_barras: codigoBarras || undefined,
          categoria_id: categoriaId || undefined,
          marca_id: marcaId || null,
        });
      } else {
        const novoProduto: Produto = {
          id: uuidv4(),
          nome,
          marca_id: marcaId || null,
          preco: precoParsado,
          codigo_barras: codigoBarras || undefined,
          categoria_id: categoriaId || undefined,
          created_at: new Date().toISOString(),
        };
        await insertProduto(novoProduto);
      }

      await carregarProdutos();
      fecharFormulario();
      Alert.alert('Sucesso', editingProduto ? 'Produto atualizado!' : 'Produto adicionado!');
    } catch (error: unknown) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
    }
  };

  const deletarProduto = (produto: ProdutoListagem): void => {
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
        <Pressable style={styles.addButton} onPress={() => abrirFormulario()}>
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
          <Pressable style={styles.primaryButton} onPress={() => abrirFormulario()}>
            <Text style={styles.buttonText}>Adicionar Produto</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {produtos.map((produto) => (
            <View key={produto.id} style={styles.produtoCard}>
              <View style={styles.produtoInfo}>
                <Text style={styles.produtoNome}>{produto.nome}</Text>
                <Text style={styles.produtoPreco}>{toCurrency(produto.preco)}</Text>
                {produto.categoria_nome && (
                  <Text style={styles.categoriaProduto}>Categoria: {produto.categoria_nome}</Text>
                )}
                {produto.codigo_barras && (
                  <Text style={styles.codigoBarras}>Código: {produto.codigo_barras}</Text>
                )}
                {produto.marca_nome && (
                  <Text style={styles.marcaProduto}>Marca: {produto.marca_nome}</Text>
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
                  onPress={() => abrirFormulario(produto)}
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
          ))}
        </ScrollView>
      )}

      <Modal visible={showScannerModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharScanner}>
              <Ionicons name="close" size={32} color="#0b3d2e" />
            </Pressable>
            <Text style={styles.modalTitle}>Escanear Código de Barras</Text>
            <View style={styles.modalSpacer} />
          </View>

          {}
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
            </CameraView>
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="camera-outline" size={64} color="#8ba29a" />
              <Text style={styles.emptyText}>Permissão de câmera negada</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

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
              {historicoPrecos.map((h) => (
                <View key={h.id} style={styles.historicoItem}>
                  <View style={styles.historicoInfo}>
                    <Text style={styles.historicoPreco}>{toCurrency(h.preco)}</Text>
                    <Text style={styles.historicoData}>
                      {new Date(h.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharFormulario}>
              <Ionicons name="close" size={32} color="#0b3d2e" />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome do Produto *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Arroz"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor="#ccc"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Preço *</Text>
              <BrazilianIntegerInput
                style={styles.input}
                placeholder="Ex: 10,50"
                value={preco}
                onChangeValue={setPreco}
                decimalScale={2}
                fixedDecimalScale
                placeholderTextColor="#ccc"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Código de Barras</Text>
              <View style={styles.codigoBarrasContainer}>
                <TextInput
                  style={[styles.input, styles.codigoBarrasInput]}
                  placeholder="Ex: 1234567890"
                  value={codigoBarras}
                  onChangeText={setCodigoBarras}
                  keyboardType="number-pad"
                  placeholderTextColor="#ccc"
                />
                <Pressable style={styles.scanButton} onPress={() => void abrirScanner()}>
                  <Ionicons name="camera" size={20} color="#0f7a5b" />
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Marca</Text>
              <Pressable
                style={styles.comboTrigger}
                onPress={(): void => setComboMarcaAberto((aberto) => !aberto)}
              >
                <Text style={[styles.comboTriggerText, !marcaSelecionadaNome && styles.comboHint]}>
                  {marcaSelecionadaNome || 'Sem marca'}
                </Text>
                <Ionicons
                  name={comboMarcaAberto ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#0b3d2e"
                />
              </Pressable>

              {comboMarcaAberto && (
                <View style={styles.comboDropdown}>
                  <TextInput
                    style={styles.comboBuscaInput}
                    placeholder="Buscar marca"
                    value={marcaBusca}
                    onChangeText={setMarcaBusca}
                    placeholderTextColor="#8ba29a"
                  />
                  <ScrollView style={styles.comboLista} nestedScrollEnabled>
                    <Pressable
                      style={styles.comboItem}
                      onPress={(): void => {
                        setMarcaId(null);
                        setMarcaBusca('');
                        setComboMarcaAberto(false);
                      }}
                    >
                      <Text style={[styles.comboItemText, !marcaId && styles.comboItemTextAtivo]}>
                        Sem marca
                      </Text>
                    </Pressable>
                    {marcasFiltradas.map((marca) => (
                      <Pressable
                        key={marca.id}
                        style={styles.comboItem}
                        onPress={(): void => {
                          setMarcaId(marca.id);
                          setMarcaBusca('');
                          setComboMarcaAberto(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.comboItemText,
                            marcaId === marca.id && styles.comboItemTextAtivo,
                          ]}
                        >
                          {marca.nome}
                        </Text>
                      </Pressable>
                    ))}
                    {marcasFiltradas.length === 0 && (
                      <Text style={styles.emptyCategoriasText}>Nenhuma marca encontrada</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {marcas.length === 0 && (
                <Text style={styles.emptyCategoriasText}>Nenhuma marca cadastrada</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria</Text>
              <Pressable
                style={styles.comboTrigger}
                onPress={(): void => setComboCategoriaAberto((aberto) => !aberto)}
              >
                <Text
                  style={[styles.comboTriggerText, !categoriaSelecionadaNome && styles.comboHint]}
                >
                  {categoriaSelecionadaNome || 'Sem categoria'}
                </Text>
                <Ionicons
                  name={comboCategoriaAberto ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#0b3d2e"
                />
              </Pressable>

              {comboCategoriaAberto && (
                <View style={styles.comboDropdown}>
                  <TextInput
                    style={styles.comboBuscaInput}
                    placeholder="Buscar categoria"
                    value={categoriaBusca}
                    onChangeText={setCategoriaBusca}
                    placeholderTextColor="#8ba29a"
                  />
                  <ScrollView style={styles.comboLista} nestedScrollEnabled>
                    <Pressable
                      style={styles.comboItem}
                      onPress={(): void => {
                        setCategoriaId('');
                        setCategoriaBusca('');
                        setComboCategoriaAberto(false);
                      }}
                    >
                      <Text
                        style={[styles.comboItemText, !categoriaId && styles.comboItemTextAtivo]}
                      >
                        Sem categoria
                      </Text>
                    </Pressable>
                    {categoriasFiltradas.map((categoria) => (
                      <Pressable
                        key={categoria.id}
                        style={styles.comboItem}
                        onPress={(): void => {
                          setCategoriaId(categoria.id);
                          setCategoriaBusca('');
                          setComboCategoriaAberto(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.comboItemText,
                            categoriaId === categoria.id && styles.comboItemTextAtivo,
                          ]}
                        >
                          {categoria.nome}
                        </Text>
                      </Pressable>
                    ))}
                    {categoriasFiltradas.length === 0 && (
                      <Text style={styles.emptyCategoriasText}>Nenhuma categoria encontrada</Text>
                    )}
                  </ScrollView>
                </View>
              )}

              {categorias.length === 0 && (
                <Text style={styles.emptyCategoriasText}>Nenhuma categoria cadastrada</Text>
              )}
            </View>

            <View style={styles.formActions}>
              <Pressable
                style={[styles.primaryButton, styles.formActionPrimary]}
                onPress={(): void => {
                  void salvarProduto();
                }}
              >
                <Text style={styles.buttonText}>Salvar Produto</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, styles.formActionSecondary]}
                onPress={fecharFormulario}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    alignItems: 'center',
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
  codigoBarras: {
    fontSize: 12,
    color: '#8ba29a',
  },
  categoriaProduto: {
    fontSize: 12,
    color: '#0f7a5b',
    marginBottom: 4,
  },
  marcaProduto: {
    fontSize: 12,
    color: '#0f7a5b',
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0b3d2e',
    backgroundColor: '#f9fdfb',
  },
  comboTrigger: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fdfb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboTriggerText: {
    fontSize: 14,
    color: '#0b3d2e',
  },
  comboHint: {
    color: '#8ba29a',
  },
  comboDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  comboBuscaInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0b3d2e',
  },
  comboLista: {
    maxHeight: 170,
  },
  comboItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comboItemText: {
    fontSize: 14,
    color: '#0b3d2e',
  },
  comboItemTextAtivo: {
    color: '#0f7a5b',
    fontWeight: '700',
  },
  emptyCategoriasText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  formActionPrimary: {
    flex: 1,
  },
  formActionSecondary: {
    flex: 1,
    marginLeft: 12,
  },
  primaryButton: {
    backgroundColor: '#0f7a5b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f7f4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#deebe4',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#0b3d2e',
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
  historicoData: {
    fontSize: 12,
    color: '#8ba29a',
  },
  codigoBarrasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codigoBarrasInput: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#e6f4ed',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#0f7a5b',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
});
