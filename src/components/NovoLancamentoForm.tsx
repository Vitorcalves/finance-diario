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
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from './BrazilianDateInput';
import BrazilianIntegerInput from './BrazilianIntegerInput';
import SeletorMultiplo from './SeletorMultiplo';
import { Button, IconButton } from './ui';
import { type Empresa, listEmpresas } from '../models/empresas';
import { listProdutos, type Produto } from '../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../models/produtoVariantes';
import { listMarcas, type Marca } from '../models/marcas';
import { Unidades } from '../utils/unidades';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  shadows,
  sharedStyles,
  spacing,
} from '../theme';

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
      <Button label="Novo lancamento" onPress={abrirModal} />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />

          <View style={styles.card}>
            <Text style={sharedStyles.sectionTitle}>Novo lancamento</Text>

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

              <Text style={sharedStyles.label}>Descricao</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex.: Mercado"
                placeholderTextColor={colors.placeholder}
                style={[sharedStyles.input, sharedStyles.inputSpaced]}
              />

              <Text style={sharedStyles.label}>Data (DD/MM/AAAA)</Text>
              <BrazilianDateInput
                key={dataInputKey}
                defaultValue={dataInput}
                onChangeValue={setDataInput}
                placeholder={dayjs().format('DD/MM/YYYY')}
                placeholderTextColor={colors.placeholder}
                style={[sharedStyles.input, sharedStyles.inputSpaced]}
              />

              <Text style={sharedStyles.label}>Itens</Text>

              {itens.length === 0 ? (
                <Text style={sharedStyles.inlineEmptyText}>
                  Nenhum item adicionado. Use o valor abaixo para um lancamento sem produtos.
                </Text>
              ) : (
                itens.map((item, index) => (
                  <View key={item.localId} style={sharedStyles.listCard}>
                    <View style={sharedStyles.listCardInfo}>
                      <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
                      <Text style={sharedStyles.listCardDetail}>
                        {`${item.quantidade} x ${toCurrency(item.precoUnitario)} = ${toCurrency(
                          item.quantidade * item.precoUnitario,
                        )}`}
                      </Text>
                      {item.varianteId === null && item.produtoId !== null && (
                        <Text style={sharedStyles.listCardDetail}>Sem variante selecionada</Text>
                      )}
                    </View>
                    <View style={sharedStyles.iconButtonRow}>
                      <IconButton
                        icon="pencil"
                        variant="primary"
                        size={iconSize.sm}
                        onPress={(): void => editarItem(index)}
                      />
                      <IconButton
                        icon="trash"
                        variant="danger"
                        size={iconSize.sm}
                        onPress={(): void => removerItem(index)}
                      />
                    </View>
                  </View>
                ))
              )}

              <View style={sharedStyles.subForm}>
                <Text style={sharedStyles.subFormTitle}>
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
                    <Text style={sharedStyles.label}>Variante</Text>
                    {variantesDoItem.length === 0 ? (
                      <Text style={sharedStyles.inlineEmptyText}>
                        Este produto ainda nao possui variantes cadastradas
                      </Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={sharedStyles.chipScrollRow}
                      >
                        {variantesDoItem.map((variante) => (
                          <Pressable
                            key={variante.id}
                            style={[
                              sharedStyles.chip,
                              sharedStyles.chipSpaced,
                              itemVarianteId === variante.id && sharedStyles.chipActive,
                            ]}
                            onPress={(): void => selecionarVariante(variante.id)}
                          >
                            <Text
                              style={[
                                sharedStyles.chipText,
                                itemVarianteId === variante.id && sharedStyles.chipTextActive,
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

                <Text style={sharedStyles.label}>Descricao do item</Text>
                <TextInput
                  value={itemDescricao}
                  onChangeText={setItemDescricao}
                  placeholder="Ex.: Arroz 5kg"
                  placeholderTextColor={colors.placeholder}
                  style={[sharedStyles.input, sharedStyles.inputSpaced]}
                />

                <Text style={sharedStyles.label}>Quantidade</Text>
                <BrazilianIntegerInput
                  value={itemQuantidade}
                  onChangeValue={setItemQuantidade}
                  decimalScale={0}
                  placeholder="Ex.: 2"
                  placeholderTextColor={colors.placeholder}
                  style={[sharedStyles.input, sharedStyles.inputSpaced]}
                />

                <Text style={sharedStyles.label}>Preco unitario (R$)</Text>
                <BrazilianIntegerInput
                  value={itemPreco}
                  onChangeValue={setItemPreco}
                  decimalScale={2}
                  fixedDecimalScale
                  placeholder="Ex.: 43,90"
                  placeholderTextColor={colors.placeholder}
                  style={[sharedStyles.input, sharedStyles.inputSpaced]}
                />

                <View style={sharedStyles.actionsRow}>
                  <Button
                    label={itemEditIndex !== null ? 'Salvar item' : 'Adicionar item'}
                    variant="secondary"
                    flex
                    onPress={adicionarOuAtualizarItem}
                  />
                  {itemEditIndex !== null && (
                    <Button label="Cancelar" variant="secondary" flex onPress={limparItemForm} />
                  )}
                </View>
              </View>

              {itens.length === 0 && (
                <>
                  <Text style={sharedStyles.label}>Valor (R$)</Text>
                  <BrazilianIntegerInput
                    value={valorManual}
                    onChangeValue={setValorManual}
                    decimalScale={2}
                    fixedDecimalScale
                    placeholder="Ex.: 43,90"
                    placeholderTextColor={colors.placeholder}
                    style={[sharedStyles.input, sharedStyles.inputSpaced]}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.totalRow}>
              <Text style={sharedStyles.totalLabel}>Total</Text>
              <Text
                style={[
                  sharedStyles.totalValue,
                  tipoTransacao === 'saida' ? sharedStyles.negative : sharedStyles.positive,
                ]}
              >
                {toCurrency(tipoTransacao === 'saida' ? -totalLancamento : totalLancamento)}
              </Text>
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button label="Cancelar" variant="secondary" flex onPress={closeModal} />

              <Button
                label={tipoTransacao === 'saida' ? 'Adicionar saida' : 'Adicionar entrada'}
                flex
                style={tipoTransacao === 'entrada' ? styles.buttonEntrada : undefined}
                onPress={(): void => {
                  void salvarLancamento();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '90%',
    ...shadows.floating,
  },
  cardScroll: {
    flexGrow: 0,
  },
  tipoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  tipoButtonActiveSaida: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  tipoButtonActiveEntrada: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  tipoButtonText: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  tipoButtonTextActive: {
    color: colors.textInverse,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  buttonEntrada: {
    backgroundColor: colors.success,
  },
});
