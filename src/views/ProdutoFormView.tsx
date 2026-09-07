import React, {useEffect, useState} from 'react';
import {StatusBar} from 'expo-status-bar';
import {CameraView, useCameraPermissions} from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import {ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {v4 as uuidv4} from 'uuid';
import BrazilianIntegerInput from '../components/BrazilianIntegerInput';
import SeletorMultiplo from '../components/SeletorMultiplo';
import {getProdutoById, insertProduto, updateProduto} from '../models/produtos';
import {
  deleteProdutoVariantesById,
  insertProdutoVariantes,
  listProdutoVariantes,
  type ProdutoVariantes,
  updateProdutoVariantes,
} from '../models/produtoVariantes';
import {type Categoria, insertCategoria, listCategorias} from '../models/categorias';
import {
  type CategoriaProduto,
  deleteCategoriaById as deleteCategoriaVinculo,
  insertCategoria as insertCategoriaVinculo,
  listCategorias as listCategoriaVinculos,
} from '../models/categoriasProduto';
import {insertMarca, listMarcas, type Marca} from '../models/marcas';
import {Unidades} from '../utils/unidades';
import type {ProdutosStackParamList} from '../routes/types';

type ProdutoFormNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutoForm'>;
type ProdutoFormRoute = RouteProp<ProdutosStackParamList, 'ProdutoForm'>;

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

export default function ProdutoFormView(): React.ReactNode {
  const navigation = useNavigation<ProdutoFormNavigation>();
  const route = useRoute<ProdutoFormRoute>();
  const produtoId = route.params?.produtoId;
  const editando = Boolean(produtoId);

  const [carregandoProduto, setCarregandoProduto] = useState(editando);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const unidades = Unidades.listar();

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [unidadeId, setUnidadeId] = useState<number | null>(null);

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [categoriaVinculosOriginais, setCategoriaVinculosOriginais] = useState<CategoriaProduto[]>(
    [],
  );
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');

  const [variantesOriginais, setVariantesOriginais] = useState<ProdutoVariantes[]>([]);
  const [variantesForm, setVariantesForm] = useState<VarianteFormItem[]>([]);
  const [varianteEditIndex, setVarianteEditIndex] = useState<number | null>(null);
  const [varianteMarcaId, setVarianteMarcaId] = useState<number | null>(null);
  const [varianteUnidadeId, setVarianteUnidadeId] = useState<number | null>(null);
  const [varianteQuantidade, setVarianteQuantidade] = useState('');
  const [varianteCodigoBarras, setVarianteCodigoBarras] = useState('');
  const [variantePreco, setVariantePreco] = useState('');
  const [novaMarcaNome, setNovaMarcaNome] = useState('');

  const [showScannerModal, setShowScannerModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const nomeUnidade = (id: number | null): string =>
    unidades.find((unidade) => unidade.id === id)?.descricao ?? '';

  const nomeMarca = (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '';

  const filterUnidades = (primitivo: boolean = false) => {
    if (primitivo) {
      return unidades.filter((unidade) => unidade.primario === primitivo);
    }
    return unidades;
  };

  useEffect((): (() => void) => {
    let active = true;

    void (async (): Promise<void> => {
      try {
        const [categoriasDoBanco, marcasDoBanco] = await Promise.all([
          listCategorias(),
          listMarcas(),
        ]);
        if (!active) {
          return;
        }
        setCategorias(categoriasDoBanco);
        setMarcas(marcasDoBanco);

        if (produtoId) {
          const [produto, todasVariantes, todosVinculos] = await Promise.all([
            getProdutoById(produtoId),
            listProdutoVariantes(),
            listCategoriaVinculos(),
          ]);
          if (!active || !produto) {
            return;
          }

          setNome(produto.nome);
          setPreco(produto.preco.toFixed(2));
          setUnidadeId(produto.unidade_id);

          const vinculosDoProduto = todosVinculos.filter((v) => v.produto_id === produtoId);
          setCategoriaVinculosOriginais(vinculosDoProduto);
          setCategoriasSelecionadas(vinculosDoProduto.map((v) => v.categoria_id));

          const variantesDoProduto = todasVariantes.filter((v) => v.produto_id === produtoId);
          setVariantesOriginais(variantesDoProduto);
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
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar dados do produto:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do produto');
      } finally {
        if (active) {
          setCarregandoProduto(false);
        }
      }
    })();

    return (): void => {
      active = false;
    };
  }, [produtoId]);

  const limparVarianteMiniFormulario = (): void => {
    setVarianteEditIndex(null);
    setVarianteMarcaId(null);
    setVarianteUnidadeId(null);
    setVarianteQuantidade('');
    setVarianteCodigoBarras('');
    setVariantePreco('');
  };

  const toggleCategoriaSelecionada = (categoriaId: string): void => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(categoriaId) ? prev.filter((id) => id !== categoriaId) : [...prev, categoriaId],
    );
  };

  const salvarNovaCategoria = async (fechar: () => void): Promise<void> => {
    if (!novaCategoriaNome.trim()) {
      Alert.alert('Erro', 'Nome da categoria é obrigatório');
      return;
    }

    try {
      const novaCategoria: Categoria = {
        id: uuidv4(),
        nome: novaCategoriaNome.trim(),
        created_at: new Date().toISOString(),
      };
      await insertCategoria(novaCategoria);
      const categoriasAtualizadas = await listCategorias();
      setCategorias(categoriasAtualizadas);
      setCategoriasSelecionadas((prev) => [...prev, novaCategoria.id]);
      setNovaCategoriaNome('');
      fechar();
    } catch (error: unknown) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    }
  };

  const toggleVarianteMarcaSelecionada = (id: string): void => {
    setVarianteMarcaId((atual) => (atual === Number(id) ? null : Number(id)));
  };

  const salvarNovaMarca = async (fechar: () => void): Promise<void> => {
    if (!novaMarcaNome.trim()) {
      Alert.alert('Erro', 'Nome da marca é obrigatório');
      return;
    }

    try {
      const nomeParaCriar = novaMarcaNome.trim();
      await insertMarca({ nome: nomeParaCriar, created_at: new Date().toISOString() });
      const marcasAtualizadas = await listMarcas();
      setMarcas(marcasAtualizadas);
      const marcaCriada = marcasAtualizadas.find((marca) => marca.nome === nomeParaCriar);
      if (marcaCriada) {
        setVarianteMarcaId(marcaCriada.id);
      }
      setNovaMarcaNome('');
      fechar();
    } catch (error: unknown) {
      console.error('Erro ao criar marca:', error);
      Alert.alert('Erro', 'Não foi possível criar a marca');
    }
  };

  const editarVariante = (index: number): void => {
    const item = variantesForm[index];
    setVarianteEditIndex(index);
    setVarianteMarcaId(item.marcaId);
    setVarianteUnidadeId(item.unidadeId);
    setVarianteQuantidade(item.quantidade);
    setVarianteCodigoBarras(item.codigoBarras);
    setVariantePreco(item.preco);
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
      let idDoProduto: string;

      if (produtoId) {
        idDoProduto = produtoId;
        await updateProduto({
          id: produtoId,
          nome,
          preco: precoParsado,
          unidade_id: unidadeId,
          created_at: agora,
        });
      } else {
        idDoProduto = uuidv4();
        await insertProduto({
          id: idDoProduto,
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
            produto_id: idDoProduto,
            created_at: agora,
          }),
        ),
      );

      const idsVariantesAtuais = variantesForm
        .filter((v) => v.id !== null)
        .map((v) => v.id as string);
      const variantesParaRemover = variantesOriginais.filter(
        (v) => !idsVariantesAtuais.includes(v.id),
      );

      await Promise.all(variantesParaRemover.map((v) => deleteProdutoVariantesById(v.id)));

      await Promise.all(
        variantesForm.map((v) => {
          const varianteData: ProdutoVariantes = {
            id: v.id ?? uuidv4(),
            produto_id: idDoProduto,
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

      Alert.alert('Sucesso', produtoId ? 'Produto atualizado!' : 'Produto adicionado!');
      navigation.goBack();
    } catch (error: unknown) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
    }
  };

  const renderSeletorUnidade = (
    valorSelecionado: number | null,
    onSelecionar: (id: number | null) => void,
    primitivo: boolean = false,
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
      {filterUnidades(primitivo).map((unidade) => (
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

  if (carregandoProduto) {
    return (
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar style="dark"/>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0f7a5b"/>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.modalContainer}>
      <StatusBar style="dark"/>

      <View style={styles.modalHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0b3d2e"/>
        </Pressable>
        <Text style={styles.modalTitle}>{editando ? 'Editar Produto' : 'Novo Produto'}</Text>
        <View style={styles.modalSpacer}/>
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
          {renderSeletorUnidade(unidadeId, setUnidadeId, true)}
        </View>

        <SeletorMultiplo
          label="Categorias"
          opcoes={categorias.map((categoria) => ({id: categoria.id, nome: categoria.nome}))}
          selecionados={categoriasSelecionadas}
          onToggle={toggleCategoriaSelecionada}
          placeholderBusca="Buscar categoria"
          textoTrigger="Adicionar categoria"
          textoVazio="Nenhuma categoria cadastrada"
          textoNenhumEncontrado="Nenhuma categoria encontrada"
          add
          textoAdicionar="Nova categoria"
          formAdicionar={(fechar): React.ReactNode => (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Nome da categoria"
                value={novaCategoriaNome}
                onChangeText={setNovaCategoriaNome}
                placeholderTextColor="#ccc"
              />
              <View style={styles.varianteMiniFormActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => void salvarNovaCategoria(fechar)}
                >
                  <Text style={styles.secondaryButtonText}>Salvar</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={fechar}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          )}
        />

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
                  <Ionicons name="pencil" size={18} color="#0f7a5b"/>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={(): void => removerVariante(index)}
                >
                  <Ionicons name="trash" size={18} color="#dc2626"/>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.varianteMiniForm}>
            <Text style={styles.varianteMiniFormTitulo}>
              {varianteEditIndex !== null ? 'Editar variante' : 'Nova variante'}
            </Text>

            <SeletorMultiplo
              label="Marca"
              opcoes={marcas.map((marca) => ({ id: String(marca.id), nome: marca.nome }))}
              selecionados={varianteMarcaId !== null ? [String(varianteMarcaId)] : []}
              onToggle={toggleVarianteMarcaSelecionada}
              placeholderBusca="Buscar marca"
              textoTrigger="Selecionar marca"
              textoVazio="Nenhuma marca cadastrada"
              textoNenhumEncontrado="Nenhuma marca encontrada"
              add
              textoAdicionar="Nova marca"
              formAdicionar={(fechar): React.ReactNode => (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da marca"
                    value={novaMarcaNome}
                    onChangeText={setNovaMarcaNome}
                    placeholderTextColor="#ccc"
                  />
                  <View style={styles.varianteMiniFormActions}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => void salvarNovaMarca(fechar)}
                    >
                      <Text style={styles.secondaryButtonText}>Salvar</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={fechar}>
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />

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
                <Ionicons name="camera" size={20} color="#0f7a5b"/>
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
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showScannerModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharScanner}>
              <Ionicons name="close" size={32} color="#0b3d2e"/>
            </Pressable>
            <Text style={styles.modalTitle}>Escanear Código de Barras</Text>
            <View style={styles.modalSpacer}/>
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
                <View style={styles.scannerFrame}/>
              </View>
            </CameraView>
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="camera-outline" size={64} color="#8ba29a"/>
              <Text style={styles.emptyText}>Permissão de câmera negada</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    width: 28,
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
  emptyCategoriasText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#e6f4ed',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
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
