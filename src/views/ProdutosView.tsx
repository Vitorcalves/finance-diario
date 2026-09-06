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
import { type Produto, listProdutos, insertProduto, deleteProdutoById, updateProduto } from '../models/produtos';
import {
  type ProdutoVariantes,
  listProdutoVariantes,
  insertProdutoVariantes,
  deleteProdutoVariantesById,
  updateProdutoVariantes,
} from '../models/produtoVariantes';
import { type Categoria, listCategorias } from '../models/categorias';
import {
  type CategoriaProduto,
  listCategorias as listCategoriaVinculos,
  insertCategoria as insertCategoriaVinculo,
  deleteCategoriaById as deleteCategoriaVinculo,
} from '../models/categoriasProduto';
import { type Marca, listMarcas } from '../models/marcas';
import { type Unidade, listUnidades } from '../models/unidades';
import { type HistoricoPreco, listHistoricoPreco } from '../models/historicoPreco';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

type VarianteFormItem = {
  localId: string;
  id: string | null;
  marcaId: number | null;
  unidadeId: number | null;
  quantidade: string;
  codigoBarras: string;
  preco: string;
};

export default function ProdutosView(): React.ReactNode {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaVinculos, setCategoriaVinculos] = useState<CategoriaProduto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [unidadeId, setUnidadeId] = useState<number | null>(null);

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [categoriaVinculosOriginais, setCategoriaVinculosOriginais] = useState<CategoriaProduto[]>(
    [],
  );
  const [comboCategoriaAberto, setComboCategoriaAberto] = useState(false);
  const [categoriaBusca, setCategoriaBusca] = useState('');

  const [variantesForm, setVariantesForm] = useState<VarianteFormItem[]>([]);
  const [varianteEditIndex, setVarianteEditIndex] = useState<number | null>(null);
  const [varianteMarcaId, setVarianteMarcaId] = useState<number | null>(null);
  const [varianteUnidadeId, setVarianteUnidadeId] = useState<number | null>(null);
  const [varianteQuantidade, setVarianteQuantidade] = useState('');
  const [varianteCodigoBarras, setVarianteCodigoBarras] = useState('');
  const [variantePreco, setVariantePreco] = useState('');
  const [comboVarianteMarcaAberto, setComboVarianteMarcaAberto] = useState(false);
  const [varianteMarcaBusca, setVarianteMarcaBusca] = useState('');

  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [produtoSelecionadoHistorico, setProdutoSelecionadoHistorico] = useState<Produto | null>(
    null,
  );
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const categoriasFiltradas = categorias.filter((categoria) =>
    categoria.nome.toLowerCase().includes(categoriaBusca.trim().toLowerCase()),
  );

  const marcasFiltradas = marcas.filter((marca) =>
    marca.nome.toLowerCase().includes(varianteMarcaBusca.trim().toLowerCase()),
  );

  const nomeUnidade = (id: number | null): string =>
    unidades.find((unidade) => unidade.id === id)?.descricao ?? '';

  const nomeMarca = (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '';

  const carregarProdutos = async (): Promise<void> => {
    try {
      setLoading(true);
      const [produtosDoBanco, variantesDoBanco, vinculosDoBanco] = await Promise.all([
        listProdutos(),
        listProdutoVariantes(),
        listCategoriaVinculos(),
      ]);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setCategoriaVinculos(vinculosDoBanco);
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

  const carregarUnidades = async (): Promise<void> => {
    try {
      const unidadesDoBanco = await listUnidades();
      setUnidades(unidadesDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar unidades:', error);
      Alert.alert('Erro', 'Não foi possível carregar as unidades');
    }
  };

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
      setVarianteCodigoBarras(result.data);
      fecharScanner();
    }
  };

  useEffect((): (() => void) => {
    let active = true;

    void (async (): Promise<void> => {
      if (!active) {
        return;
      }
      await Promise.all([
        carregarProdutos(),
        carregarCategorias(),
        carregarMarcas(),
        carregarUnidades(),
      ]);
    })();

    return (): void => {
      active = false;
    };
  }, []);

  const limparVarianteMiniFormulario = (): void => {
    setVarianteEditIndex(null);
    setVarianteMarcaId(null);
    setVarianteUnidadeId(null);
    setVarianteQuantidade('');
    setVarianteCodigoBarras('');
    setVariantePreco('');
    setVarianteMarcaBusca('');
    setComboVarianteMarcaAberto(false);
  };

  const limparFormulario = (): void => {
    setNome('');
    setPreco('');
    setUnidadeId(null);
    setCategoriasSelecionadas([]);
    setCategoriaVinculosOriginais([]);
    setCategoriaBusca('');
    setComboCategoriaAberto(false);
    setVariantesForm([]);
    limparVarianteMiniFormulario();
    setEditingProduto(null);
  };

  const abrirFormulario = (produto?: Produto): void => {
    if (produto) {
      setEditingProduto(produto);
      setNome(produto.nome);
      setPreco(produto.preco.toFixed(2));
      setUnidadeId(produto.unidade_id);

      const vinculosDoProduto = categoriaVinculos.filter((v) => v.produto_id === produto.id);
      setCategoriaVinculosOriginais(vinculosDoProduto);
      setCategoriasSelecionadas(vinculosDoProduto.map((v) => v.categoria_id));

      const variantesDoProduto = variantes.filter((v) => v.produto_id === produto.id);
      setVariantesForm(
        variantesDoProduto.map((v) => ({
          localId: v.id,
          id: v.id,
          marcaId: v.marca_id,
          unidadeId: v.unidade_id,
          quantidade: v.quantidade !== null ? String(v.quantidade) : '',
          codigoBarras: v.codigo_barras ?? '',
          preco: v.preco.toFixed(2),
        })),
      );
      limparVarianteMiniFormulario();
    } else {
      limparFormulario();
    }
    setShowForm(true);
  };

  const fecharFormulario = (): void => {
    setShowForm(false);
    limparFormulario();
  };

  const toggleCategoriaSelecionada = (categoriaId: string): void => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(categoriaId) ? prev.filter((id) => id !== categoriaId) : [...prev, categoriaId],
    );
  };

  const editarVariante = (index: number): void => {
    const item = variantesForm[index];
    setVarianteEditIndex(index);
    setVarianteMarcaId(item.marcaId);
    setVarianteUnidadeId(item.unidadeId);
    setVarianteQuantidade(item.quantidade);
    setVarianteCodigoBarras(item.codigoBarras);
    setVariantePreco(item.preco);
    setVarianteMarcaBusca('');
    setComboVarianteMarcaAberto(false);
  };

  const removerVariante = (index: number): void => {
    setVariantesForm((prev) => prev.filter((_, i) => i !== index));
    if (varianteEditIndex === index) {
      limparVarianteMiniFormulario();
    }
  };

  const adicionarOuAtualizarVariante = (): void => {
    const precoParsado = Number(variantePreco);
    if (!variantePreco || precoParsado <= 0) {
      Alert.alert('Erro', 'Preço da variante deve ser maior que zero');
      return;
    }

    const item: VarianteFormItem = {
      localId: varianteEditIndex !== null ? variantesForm[varianteEditIndex].localId : uuidv4(),
      id: varianteEditIndex !== null ? variantesForm[varianteEditIndex].id : null,
      marcaId: varianteMarcaId,
      unidadeId: varianteUnidadeId,
      quantidade: varianteQuantidade,
      codigoBarras: varianteCodigoBarras,
      preco: variantePreco,
    };

    setVariantesForm((prev) => {
      if (varianteEditIndex !== null) {
        const copia = [...prev];
        copia[varianteEditIndex] = item;
        return copia;
      }
      return [...prev, item];
    });

    limparVarianteMiniFormulario();
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
      const agora = new Date().toISOString();
      let produtoId: string;

      if (editingProduto) {
        produtoId = editingProduto.id;
        await updateProduto({
          ...editingProduto,
          nome,
          preco: precoParsado,
          unidade_id: unidadeId,
        });
      } else {
        produtoId = uuidv4();
        await insertProduto({
          id: produtoId,
          nome,
          preco: precoParsado,
          unidade_id: unidadeId,
          created_at: agora,
        });
      }

      const idsCategoriasExistentes = categoriaVinculosOriginais.map((v) => v.categoria_id);
      const vinculosParaRemover = categoriaVinculosOriginais.filter(
        (v) => !categoriasSelecionadas.includes(v.categoria_id),
      );
      const categoriasParaAdicionar = categoriasSelecionadas.filter(
        (id) => !idsCategoriasExistentes.includes(id),
      );

      await Promise.all(vinculosParaRemover.map((v) => deleteCategoriaVinculo(v.id)));
      await Promise.all(
        categoriasParaAdicionar.map((categoriaId) =>
          insertCategoriaVinculo({
            id: uuidv4(),
            categoria_id: categoriaId,
            produto_id: produtoId,
            created_at: agora,
          }),
        ),
      );

      const idsVariantesAtuais = variantesForm
        .filter((v) => v.id !== null)
        .map((v) => v.id as string);
      const variantesParaRemover = editingProduto
        ? variantes.filter((v) => v.produto_id === produtoId && !idsVariantesAtuais.includes(v.id))
        : [];

      await Promise.all(variantesParaRemover.map((v) => deleteProdutoVariantesById(v.id)));

      await Promise.all(
        variantesForm.map((v) => {
          const varianteData: ProdutoVariantes = {
            id: v.id ?? uuidv4(),
            produto_id: produtoId,
            marca_id: v.marcaId,
            unidade_id: v.unidadeId,
            quantidade: v.quantidade ? Number(v.quantidade) : null,
            codigo_barras: v.codigoBarras || null,
            preco: Number(v.preco),
            created_at: agora,
          };
          return v.id ? updateProdutoVariantes(varianteData) : insertProdutoVariantes(varianteData);
        }),
      );

      await carregarProdutos();
      fecharFormulario();
      Alert.alert('Sucesso', editingProduto ? 'Produto atualizado!' : 'Produto adicionado!');
    } catch (error: unknown) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
    }
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

  const renderSeletorUnidade = (
    valorSelecionado: number | null,
    onSelecionar: (id: number | null) => void,
  ): React.ReactNode => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unidadeChipsRow}>
      <Pressable
        style={[styles.unidadeChip, valorSelecionado === null && styles.unidadeChipAtivo]}
        onPress={(): void => onSelecionar(null)}
      >
        <Text style={[styles.unidadeChipText, valorSelecionado === null && styles.unidadeChipTextAtivo]}>
          Nenhuma
        </Text>
      </Pressable>
      {unidades.map((unidade) => (
        <Pressable
          key={unidade.id}
          style={[styles.unidadeChip, valorSelecionado === unidade.id && styles.unidadeChipAtivo]}
          onPress={(): void => onSelecionar(unidade.id)}
        >
          <Text
            style={[styles.unidadeChipText, valorSelecionado === unidade.id && styles.unidadeChipTextAtivo]}
          >
            {unidade.descricao}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

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
            );
          })}
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

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharFormulario}>
              <Ionicons name="close" size={32} color="#0b3d2e" />
            </Pressable>
            <Text style={styles.modalTitle}>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</Text>
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
              <Text style={styles.label}>Preço Base *</Text>
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
              <Text style={styles.label}>Unidade</Text>
              {renderSeletorUnidade(unidadeId, setUnidadeId)}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categorias</Text>

              {categoriasSelecionadas.length > 0 && (
                <View style={styles.chipRow}>
                  {categoriasSelecionadas.map((categoriaId) => {
                    const nomeCategoria = categorias.find((c) => c.id === categoriaId)?.nome ?? '';
                    return (
                      <Pressable
                        key={categoriaId}
                        style={styles.chip}
                        onPress={(): void => toggleCategoriaSelecionada(categoriaId)}
                      >
                        <Text style={styles.chipText}>{nomeCategoria}</Text>
                        <Ionicons name="close" size={14} color="#0f7a5b" />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable
                style={styles.comboTrigger}
                onPress={(): void => setComboCategoriaAberto((aberto) => !aberto)}
              >
                <Text style={styles.comboTriggerText}>Adicionar categoria</Text>
                <Ionicons name={comboCategoriaAberto ? 'chevron-up' : 'chevron-down'} size={18} color="#0b3d2e" />
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
                    {categoriasFiltradas.map((categoria) => {
                      const selecionada = categoriasSelecionadas.includes(categoria.id);
                      return (
                        <Pressable
                          key={categoria.id}
                          style={styles.comboItem}
                          onPress={(): void => toggleCategoriaSelecionada(categoria.id)}
                        >
                          <Text style={[styles.comboItemText, selecionada && styles.comboItemTextAtivo]}>
                            {selecionada ? '✓ ' : ''}
                            {categoria.nome}
                          </Text>
                        </Pressable>
                      );
                    })}
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Variantes</Text>

              {variantesForm.length === 0 && (
                <Text style={styles.emptyCategoriasText}>Nenhuma variante adicionada</Text>
              )}

              {variantesForm.map((item, index) => (
                <View key={item.localId} style={styles.varianteCard}>
                  <View style={styles.varianteCardInfo}>
                    <Text style={styles.varianteCardTitulo}>{nomeMarca(item.marcaId) || 'Sem marca'}</Text>
                    <Text style={styles.varianteCardDetalhe}>
                      {toCurrency(Number(item.preco) || 0)}
                      {item.unidadeId !== null ? ` • ${nomeUnidade(item.unidadeId)}` : ''}
                      {item.quantidade ? ` • Qtd: ${item.quantidade}` : ''}
                    </Text>
                    {item.codigoBarras && (
                      <Text style={styles.varianteCardDetalhe}>Código: {item.codigoBarras}</Text>
                    )}
                  </View>
                  <View style={styles.varianteCardActions}>
                    <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      onPress={(): void => editarVariante(index)}
                    >
                      <Ionicons name="pencil" size={18} color="#0f7a5b" />
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={(): void => removerVariante(index)}
                    >
                      <Ionicons name="trash" size={18} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              ))}

              <View style={styles.varianteMiniForm}>
                <Text style={styles.varianteMiniFormTitulo}>
                  {varianteEditIndex !== null ? 'Editar variante' : 'Nova variante'}
                </Text>

                <Text style={styles.label}>Marca</Text>
                <Pressable
                  style={styles.comboTrigger}
                  onPress={(): void => setComboVarianteMarcaAberto((aberto) => !aberto)}
                >
                  <Text style={[styles.comboTriggerText, !nomeMarca(varianteMarcaId) && styles.comboHint]}>
                    {nomeMarca(varianteMarcaId) || 'Sem marca'}
                  </Text>
                  <Ionicons
                    name={comboVarianteMarcaAberto ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#0b3d2e"
                  />
                </Pressable>

                {comboVarianteMarcaAberto && (
                  <View style={styles.comboDropdown}>
                    <TextInput
                      style={styles.comboBuscaInput}
                      placeholder="Buscar marca"
                      value={varianteMarcaBusca}
                      onChangeText={setVarianteMarcaBusca}
                      placeholderTextColor="#8ba29a"
                    />
                    <ScrollView style={styles.comboLista} nestedScrollEnabled>
                      <Pressable
                        style={styles.comboItem}
                        onPress={(): void => {
                          setVarianteMarcaId(null);
                          setVarianteMarcaBusca('');
                          setComboVarianteMarcaAberto(false);
                        }}
                      >
                        <Text style={[styles.comboItemText, varianteMarcaId === null && styles.comboItemTextAtivo]}>
                          Sem marca
                        </Text>
                      </Pressable>
                      {marcasFiltradas.map((marca) => (
                        <Pressable
                          key={marca.id}
                          style={styles.comboItem}
                          onPress={(): void => {
                            setVarianteMarcaId(marca.id);
                            setVarianteMarcaBusca('');
                            setComboVarianteMarcaAberto(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.comboItemText,
                              varianteMarcaId === marca.id && styles.comboItemTextAtivo,
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

                <Text style={styles.label}>Unidade</Text>
                {renderSeletorUnidade(varianteUnidadeId, setVarianteUnidadeId)}

                <Text style={styles.label}>Quantidade</Text>
                <BrazilianIntegerInput
                  style={styles.input}
                  placeholder="Ex: 500"
                  value={varianteQuantidade}
                  onChangeValue={setVarianteQuantidade}
                  decimalScale={0}
                  placeholderTextColor="#ccc"
                />

                <Text style={styles.label}>Código de Barras</Text>
                <View style={styles.codigoBarrasContainer}>
                  <TextInput
                    style={[styles.input, styles.codigoBarrasInput]}
                    placeholder="Ex: 1234567890"
                    value={varianteCodigoBarras}
                    onChangeText={setVarianteCodigoBarras}
                    keyboardType="number-pad"
                    placeholderTextColor="#ccc"
                  />
                  <Pressable style={styles.scanButton} onPress={() => void abrirScanner()}>
                    <Ionicons name="camera" size={20} color="#0f7a5b" />
                  </Pressable>
                </View>

                <Text style={styles.label}>Preço *</Text>
                <BrazilianIntegerInput
                  style={styles.input}
                  placeholder="Ex: 10,50"
                  value={variantePreco}
                  onChangeValue={setVariantePreco}
                  decimalScale={2}
                  fixedDecimalScale
                  placeholderTextColor="#ccc"
                />

                <View style={styles.varianteMiniFormActions}>
                  <Pressable style={styles.secondaryButton} onPress={adicionarOuAtualizarVariante}>
                    <Text style={styles.secondaryButtonText}>
                      {varianteEditIndex !== null ? 'Salvar Variante' : 'Adicionar Variante'}
                    </Text>
                  </Pressable>
                  {varianteEditIndex !== null && (
                    <Pressable style={styles.secondaryButton} onPress={limparVarianteMiniFormulario}>
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
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
    marginBottom: 16,
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
  unidadeChipsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  unidadeChip: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f9fdfb',
  },
  unidadeChipAtivo: {
    backgroundColor: '#0f7a5b',
    borderColor: '#0f7a5b',
  },
  unidadeChipText: {
    fontSize: 13,
    color: '#0b3d2e',
  },
  unidadeChipTextAtivo: {
    color: '#ffffff',
    fontWeight: '700',
  },
  varianteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fdfb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#deebe4',
  },
  varianteCardInfo: {
    flex: 1,
  },
  varianteCardTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 2,
  },
  varianteCardDetalhe: {
    fontSize: 12,
    color: '#8ba29a',
  },
  varianteCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  varianteMiniForm: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f7f4',
  },
  varianteMiniFormTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d2e',
    marginBottom: 12,
  },
  varianteMiniFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
    flex: 1,
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
  historicoRotulo: {
    fontSize: 12,
    color: '#0b3d2e',
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
    marginBottom: 0,
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
