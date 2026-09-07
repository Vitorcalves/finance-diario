import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from './BrazilianDateInput';
import BrazilianIntegerInput from './BrazilianIntegerInput';
import SeletorMultiplo from './SeletorMultiplo';
import { type Empresa, listEmpresas } from '../models/empresas';
import { listProdutos, type Produto } from '../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../models/produtoVariantes';
import { listMarcas, type Marca } from '../models/marcas';
import { Unidades } from '../utils/unidades';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export type ItemLancamento = {
  localId: string;
  produtoId: string | null;
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
};

export type NovoLancamento = {
  tipo: 'saida' | 'entrada';
  descricao: string;
  data: string;
  empresaId: string | null;
  /** Valor ja com sinal: negativo para saida, positivo para entrada. */
  valor: number;
  itens: ItemLancamento[];
};

interface NovoLancamentoFormProps {
  onAddLancamento: (lancamento: NovoLancamento) => Promise<void>;
}

export default function NovoLancamentoForm({
  onAddLancamento,
}: NovoLancamentoFormProps): React.ReactNode {
  const [modalVisible, setModalVisible] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  const [tipoTransacao, setTipoTransacao] = useState<'saida' | 'entrada'>('saida');
  const [empresaSelected, setEmpresaSelected] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [dataInput, setDataInput] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);
  const [valorManual, setValorManual] = useState('');

  const [itens, setItens] = useState<ItemLancamento[]>([]);
  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  const [itemProdutoId, setItemProdutoId] = useState<string | null>(null);
  const [itemVarianteId, setItemVarianteId] = useState<string | null>(null);
  const [itemDescricao, setItemDescricao] = useState('');
  const [itemQuantidade, setItemQuantidade] = useState('1');
  const [itemPreco, setItemPreco] = useState('');

  const nomeMarca = (id: number | null): string =>
    marcas.find((marca) => marca.id === id)?.nome ?? '';

  const rotuloVariante = (variante: ProdutoVariantes): string => {
    const marca = nomeMarca(variante.marca_id) || 'Sem marca';
    const unidade = Unidades.descricaoPorId(variante.unidade_id);
    const medida =
      variante.quantidade !== null ? `${variante.quantidade}${unidade ? ` ${unidade}` : ''}` : '';

    return [marca, medida].filter(Boolean).join(' • ');
  };

  const variantesDoItem = useMemo(
    () => (itemProdutoId ? variantes.filter((v) => v.produto_id === itemProdutoId) : []),
    [variantes, itemProdutoId],
  );

  const totalItens = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
    [itens],
  );

  const totalLancamento = itens.length > 0 ? totalItens : Number(valorManual) || 0;

  const carregarDados = async (): Promise<void> => {
    try {
      const [empresasDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco] = await Promise.all(
        [listEmpresas(), listProdutos(), listProdutoVariantes(), listMarcas()],
      );

      setEmpresas(empresasDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do lancamento', error);
    }
  };

  const abrirModal = (): void => {
    void carregarDados();
    setModalVisible(true);
  };

  const limparItemForm = (): void => {
    setItemEditIndex(null);
    setItemProdutoId(null);
    setItemVarianteId(null);
    setItemDescricao('');
    setItemQuantidade('1');
    setItemPreco('');
  };

  const limparFormulario = (): void => {
    setTipoTransacao('saida');
    setEmpresaSelected(null);
    setDescricao('');
    setDataInput(todayIso());
    setDataInputKey((prev) => prev + 1);
    setValorManual('');
    setItens([]);
    limparItemForm();
  };

  const closeModal = (): void => {
    setModalVisible(false);
  };

  const toggleEmpresa = (id: string): void => {
    setEmpresaSelected((atual) => (atual === id ? null : id));
  };

  const selecionarProduto = (produtoId: string): void => {
    if (itemProdutoId === produtoId) {
      setItemProdutoId(null);
      setItemVarianteId(null);
      return;
    }

    const produto = produtos.find((p) => p.id === produtoId);
    setItemProdutoId(produtoId);
    setItemVarianteId(null);
    setItemDescricao(produto?.nome ?? '');
    setItemPreco(produto ? produto.preco.toFixed(2) : '');
  };

  const selecionarVariante = (varianteId: string): void => {
    if (itemVarianteId === varianteId) {
      setItemVarianteId(null);
      return;
    }

    const variante = variantes.find((v) => v.id === varianteId);
    if (!variante) {
      return;
    }

    const produto = produtos.find((p) => p.id === variante.produto_id);
    setItemVarianteId(varianteId);
    setItemDescricao(`${produto?.nome ?? ''} - ${rotuloVariante(variante)}`.trim());
    setItemPreco(variante.preco.toFixed(2));
  };

  const editarItem = (index: number): void => {
    const item = itens[index];
    setItemEditIndex(index);
    setItemProdutoId(item.produtoId);
    setItemVarianteId(item.varianteId);
    setItemDescricao(item.descricao);
    setItemQuantidade(String(item.quantidade));
    setItemPreco(item.precoUnitario.toFixed(2));
  };

  const removerItem = (index: number): void => {
    setItens((prev) => prev.filter((_, i) => i !== index));
    if (itemEditIndex === index) {
      limparItemForm();
    }
  };

  const adicionarOuAtualizarItem = (): void => {
    const quantidade = Number(itemQuantidade);
    const precoUnitario = Number(itemPreco);
    const descricaoItem = itemDescricao.trim();

    if (!descricaoItem) {
      Alert.alert('Erro', 'Informe a descricao do item ou selecione um produto');
      return;
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      Alert.alert('Erro', 'Quantidade do item deve ser maior que zero');
      return;
    }

    if (!Number.isFinite(precoUnitario) || precoUnitario <= 0) {
      Alert.alert('Erro', 'Preco unitario do item deve ser maior que zero');
      return;
    }

    const item: ItemLancamento = {
      localId: itemEditIndex !== null ? itens[itemEditIndex].localId : uuidv4(),
      produtoId: itemProdutoId,
      varianteId: itemVarianteId,
      descricao: descricaoItem,
      quantidade,
      precoUnitario,
    };

    setItens((prev) => {
      if (itemEditIndex !== null) {
        const copia = [...prev];
        copia[itemEditIndex] = item;
        return copia;
      }
      return [...prev, item];
    });

    limparItemForm();
  };

  const salvarLancamento = async (): Promise<void> => {
    const descricaoFinal = descricao.trim() || itens[0]?.descricao || '';
    const dataFinal = dataInput.trim();

    if (!descricaoFinal) {
      Alert.alert('Erro', 'Descricao do lancamento e obrigatoria');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
      Alert.alert('Erro', 'Informe uma data valida');
      return;
    }

    if (totalLancamento <= 0) {
      Alert.alert('Erro', 'Adicione ao menos um item ou informe o valor do lancamento');
      return;
    }

    try {
      await onAddLancamento({
        tipo: tipoTransacao,
        descricao: descricaoFinal,
        data: dataFinal,
        empresaId: empresaSelected,
        valor: tipoTransacao === 'saida' ? -totalLancamento : totalLancamento,
        itens,
      });

      limparFormulario();
      closeModal();
    } catch (error: unknown) {
      console.error('Erro ao adicionar lancamento', error);
      Alert.alert('Erro', 'Nao foi possivel salvar o lancamento');
    }
  };

  return (
    <>
      <Pressable style={styles.openButton} onPress={abrirModal}>
        <Text style={styles.openButtonText}>Novo lancamento</Text>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Novo lancamento</Text>

            <ScrollView style={styles.cardScroll} nestedScrollEnabled>
              <View style={styles.tipoRow}>
                <Pressable
                  style={[
                    styles.tipoButton,
                    tipoTransacao === 'saida' && styles.tipoButtonActiveSaida,
                  ]}
                  onPress={(): void => setTipoTransacao('saida')}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      tipoTransacao === 'saida' && styles.tipoButtonTextActive,
                    ]}
                  >
                    Saida
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.tipoButton,
                    tipoTransacao === 'entrada' && styles.tipoButtonActiveEntrada,
                  ]}
                  onPress={(): void => setTipoTransacao('entrada')}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      tipoTransacao === 'entrada' && styles.tipoButtonTextActive,
                    ]}
                  >
                    Entrada
                  </Text>
                </Pressable>
              </View>

              <SeletorMultiplo
                label="Empresa"
                opcoes={empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome }))}
                selecionados={empresaSelected ? [empresaSelected] : []}
                onToggle={toggleEmpresa}
                placeholderBusca="Buscar empresa"
                textoTrigger="Selecionar empresa"
                textoVazio="Nenhuma empresa cadastrada"
                textoNenhumEncontrado="Nenhuma empresa encontrada"
              />

              <Text style={styles.label}>Descricao</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex.: Mercado"
                placeholderTextColor="#7b8a8e"
                style={styles.input}
              />

              <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
              <BrazilianDateInput
                key={dataInputKey}
                defaultValue={dataInput}
                onChangeValue={setDataInput}
                placeholder={dayjs().format('DD/MM/YYYY')}
                placeholderTextColor="#7b8a8e"
                style={styles.input}
              />

              <Text style={styles.label}>Itens</Text>

              {itens.length === 0 ? (
                <Text style={styles.emptyText}>
                  Nenhum item adicionado. Use o valor abaixo para um lancamento sem produtos.
                </Text>
              ) : (
                itens.map((item, index) => (
                  <View key={item.localId} style={styles.itemCard}>
                    <View style={styles.itemCardInfo}>
                      <Text style={styles.itemCardTitulo}>{item.descricao}</Text>
                      <Text style={styles.itemCardDetalhe}>
                        {`${item.quantidade} x ${toCurrency(item.precoUnitario)} = ${toCurrency(
                          item.quantidade * item.precoUnitario,
                        )}`}
                      </Text>
                      {item.varianteId === null && item.produtoId !== null && (
                        <Text style={styles.itemCardDetalhe}>Sem variante selecionada</Text>
                      )}
                    </View>
                    <View style={styles.itemCardActions}>
                      <Pressable
                        style={[styles.actionButton, styles.editButton]}
                        onPress={(): void => editarItem(index)}
                      >
                        <Ionicons name="pencil" size={18} color="#0f7a5b" />
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={(): void => removerItem(index)}
                      >
                        <Ionicons name="trash" size={18} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <View style={styles.itemMiniForm}>
                <Text style={styles.itemMiniFormTitulo}>
                  {itemEditIndex !== null ? 'Editar item' : 'Novo item'}
                </Text>

                <SeletorMultiplo
                  label="Produto"
                  opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
                  selecionados={itemProdutoId ? [itemProdutoId] : []}
                  onToggle={selecionarProduto}
                  placeholderBusca="Buscar produto"
                  textoTrigger="Selecionar produto"
                  textoVazio="Nenhum produto cadastrado"
                  textoNenhumEncontrado="Nenhum produto encontrado"
                />

                {itemProdutoId !== null && (
                  <>
                    <Text style={styles.label}>Variante</Text>
                    {variantesDoItem.length === 0 ? (
                      <Text style={styles.emptyText}>
                        Este produto ainda nao possui variantes cadastradas
                      </Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.varianteChipsRow}
                      >
                        {variantesDoItem.map((variante) => (
                          <Pressable
                            key={variante.id}
                            style={[
                              styles.varianteChip,
                              itemVarianteId === variante.id && styles.varianteChipAtivo,
                            ]}
                            onPress={(): void => selecionarVariante(variante.id)}
                          >
                            <Text
                              style={[
                                styles.varianteChipText,
                                itemVarianteId === variante.id && styles.varianteChipTextAtivo,
                              ]}
                            >
                              {`${rotuloVariante(variante)} • ${toCurrency(variante.preco)}`}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                <Text style={styles.label}>Descricao do item</Text>
                <TextInput
                  value={itemDescricao}
                  onChangeText={setItemDescricao}
                  placeholder="Ex.: Arroz 5kg"
                  placeholderTextColor="#7b8a8e"
                  style={styles.input}
                />

                <Text style={styles.label}>Quantidade</Text>
                <BrazilianIntegerInput
                  value={itemQuantidade}
                  onChangeValue={setItemQuantidade}
                  decimalScale={0}
                  placeholder="Ex.: 2"
                  placeholderTextColor="#7b8a8e"
                  style={styles.input}
                />

                <Text style={styles.label}>Preco unitario (R$)</Text>
                <BrazilianIntegerInput
                  value={itemPreco}
                  onChangeValue={setItemPreco}
                  decimalScale={2}
                  fixedDecimalScale
                  placeholder="Ex.: 43,90"
                  placeholderTextColor="#7b8a8e"
                  style={styles.input}
                />

                <View style={styles.itemMiniFormActions}>
                  <Pressable style={styles.secondaryButton} onPress={adicionarOuAtualizarItem}>
                    <Text style={styles.secondaryButtonText}>
                      {itemEditIndex !== null ? 'Salvar item' : 'Adicionar item'}
                    </Text>
                  </Pressable>
                  {itemEditIndex !== null && (
                    <Pressable style={styles.secondaryButton} onPress={limparItemForm}>
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {itens.length === 0 && (
                <>
                  <Text style={styles.label}>Valor (R$)</Text>
                  <BrazilianIntegerInput
                    value={valorManual}
                    onChangeValue={setValorManual}
                    decimalScale={2}
                    fixedDecimalScale
                    placeholder="Ex.: 43,90"
                    placeholderTextColor="#7b8a8e"
                    style={styles.input}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text
                style={[
                  styles.totalValue,
                  tipoTransacao === 'saida' ? styles.negative : styles.positive,
                ]}
              >
                {toCurrency(tipoTransacao === 'saida' ? -totalLancamento : totalLancamento)}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, tipoTransacao === 'entrada' && styles.buttonEntrada]}
                onPress={(): void => {
                  void salvarLancamento();
                }}
              >
                <Text style={styles.buttonText}>
                  {tipoTransacao === 'saida' ? 'Adicionar saida' : 'Adicionar entrada'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardScroll: {
    flexGrow: 0,
  },
  label: {
    fontSize: 13,
    color: '#2d3e38',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6dfdb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#17211d',
    backgroundColor: '#f8fbfa',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123a2d',
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6dfdb',
    alignItems: 'center',
    backgroundColor: '#f8fbfa',
  },
  tipoButtonActiveSaida: {
    backgroundColor: '#c0352b',
    borderColor: '#c0352b',
  },
  tipoButtonActiveEntrada: {
    backgroundColor: '#0d8f50',
    borderColor: '#0d8f50',
  },
  tipoButtonText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#334640',
  },
  tipoButtonTextActive: {
    color: '#ffffff',
  },
  itemCard: {
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
  itemCardInfo: {
    flex: 1,
  },
  itemCardTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 2,
  },
  itemCardDetalhe: {
    fontSize: 12,
    color: '#8ba29a',
  },
  itemCardActions: {
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
  itemMiniForm: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f7f4',
  },
  itemMiniFormTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d2e',
    marginBottom: 12,
  },
  itemMiniFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  varianteChipsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  varianteChip: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f9fdfb',
  },
  varianteChipAtivo: {
    backgroundColor: '#0f7a5b',
    borderColor: '#0f7a5b',
  },
  varianteChipText: {
    fontSize: 13,
    color: '#0b3d2e',
  },
  varianteChipTextAtivo: {
    color: '#ffffff',
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#edf2ef',
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#123a2d',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  positive: {
    color: '#0d8f50',
  },
  negative: {
    color: '#c0352b',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonEntrada: {
    backgroundColor: '#0d8f50',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6dfdb',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fbfa',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButtonText: {
    color: '#334640',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#deebe4',
  },
  secondaryButtonText: {
    color: '#0b3d2e',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
