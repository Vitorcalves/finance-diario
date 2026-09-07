import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from '../components/BrazilianDateInput';
import BrazilianIntegerInput from '../components/BrazilianIntegerInput';
import SeletorMultiplo from '../components/SeletorMultiplo';
import { type HistoricoPreco, listHistoricoPreco } from '../models/historicoPreco';
import { listProdutos, type Produto } from '../models/produtos';
import {
  listProdutoVariantes,
  type ProdutoVariantes,
  registrarPrecoVariante,
} from '../models/produtoVariantes';
import { listMarcas, type Marca } from '../models/marcas';
import { type Empresa, listEmpresas } from '../models/empresas';
import { Unidades } from '../utils/unidades';
import type { MenuStackParamList } from '../routes/types';

type OrcamentoNavigation = NativeStackNavigationProp<MenuStackParamList, 'Orcamento'>;

type ItemOrcamento = {
  localId: string;
  produtoId: string;
  varianteId: string;
  descricao: string;
  quantidade: number;
  preco: number;
};

type ComparativoMercado = {
  empresaId: string;
  nome: string;
  total: number;
  itensComPreco: number;
  completo: boolean;
  mercadoDoOrcamento: boolean;
};

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatarData = (data: string): string => dayjs(data).format('DD/MM/YYYY');

/** Ordena do registro mais recente para o mais antigo, usando o created_at como desempate. */
const maisRecentePrimeiro = (a: HistoricoPreco, b: HistoricoPreco): number => {
  const diffData = dayjs(b.data).valueOf() - dayjs(a.data).valueOf();
  return diffData !== 0 ? diffData : b.created_at.localeCompare(a.created_at);
};

export default function OrcamentoView(): React.ReactNode {
  const navigation = useNavigation<OrcamentoNavigation>();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  const [dataOrcamento, setDataOrcamento] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);

  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  const [itemProdutoId, setItemProdutoId] = useState<string | null>(null);
  const [itemVarianteId, setItemVarianteId] = useState<string | null>(null);
  const [itemQuantidade, setItemQuantidade] = useState('1');
  const [itemPreco, setItemPreco] = useState('');

  const carregarDados = async (): Promise<void> => {
    try {
      setLoading(true);
      const [empresasDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco, historicoDoBanco] =
        await Promise.all([
          listEmpresas(),
          listProdutos(),
          listProdutoVariantes(),
          listMarcas(),
          listHistoricoPreco(),
        ]);

      setEmpresas(empresasDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
      setHistorico(historicoDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do orcamento:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar os dados do orcamento');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, []),
  );

  const nomeProduto = useCallback(
    (id: string): string =>
      produtos.find((produto) => produto.id === id)?.nome ?? 'Produto removido',
    [produtos],
  );

  const nomeEmpresa = useCallback(
    (id: string | null): string =>
      empresas.find((empresa) => empresa.id === id)?.nome ?? 'Sem mercado',
    [empresas],
  );

  const rotuloVariante = useCallback(
    (varianteId: string): string => {
      const variante = variantes.find((v) => v.id === varianteId);

      if (!variante) {
        return 'Variante removida';
      }

      const marca = marcas.find((m) => m.id === variante.marca_id)?.nome ?? 'Sem marca';
      const unidade = Unidades.descricaoPorId(variante.unidade_id);
      const medida =
        variante.quantidade !== null ? `${variante.quantidade}${unidade ? ` ${unidade}` : ''}` : '';

      return [marca, medida].filter(Boolean).join(' • ');
    },
    [variantes, marcas],
  );

  /** Ultimo preco visto para a variante, opcionalmente restrito a um mercado. */
  const ultimoPreco = useCallback(
    (varianteId: string, empresaId: string | null): HistoricoPreco | null => {
      const registros = historico
        .filter(
          (registro) =>
            registro.variante_id === varianteId &&
            (empresaId === null || registro.empresa_id === empresaId),
        )
        .sort(maisRecentePrimeiro);

      return registros[0] ?? null;
    },
    [historico],
  );

  const menorPrecoRegistrado = useCallback(
    (varianteId: string): HistoricoPreco | null => {
      const registros = historico.filter((registro) => registro.variante_id === varianteId);

      if (registros.length === 0) {
        return null;
      }

      return registros.reduce((menor, atual) => (atual.preco < menor.preco ? atual : menor));
    },
    [historico],
  );

  const variantesDoItem = useMemo(
    () => (itemProdutoId ? variantes.filter((v) => v.produto_id === itemProdutoId) : []),
    [variantes, itemProdutoId],
  );

  const totalOrcamento = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade * item.preco, 0),
    [itens],
  );

  /**
   * Simula o total do orcamento em cada mercado: no mercado selecionado usa os precos
   * digitados agora, nos demais usa o preco mais recente ja registrado no historico.
   */
  const comparativo = useMemo((): ComparativoMercado[] => {
    if (itens.length === 0) {
      return [];
    }

    const idsRelevantes = new Set<string>();

    for (const item of itens) {
      for (const registro of historico) {
        if (registro.variante_id === item.varianteId && registro.empresa_id !== null) {
          idsRelevantes.add(registro.empresa_id);
        }
      }
    }

    if (empresaSelecionada) {
      idsRelevantes.add(empresaSelecionada);
    }

    const resultado: ComparativoMercado[] = [];

    for (const empresaId of idsRelevantes) {
      let total = 0;
      let itensComPreco = 0;

      for (const item of itens) {
        const preco =
          empresaId === empresaSelecionada
            ? item.preco
            : (ultimoPreco(item.varianteId, empresaId)?.preco ?? null);

        if (preco === null) {
          continue;
        }

        total += preco * item.quantidade;
        itensComPreco += 1;
      }

      resultado.push({
        empresaId,
        nome: nomeEmpresa(empresaId),
        total,
        itensComPreco,
        completo: itensComPreco === itens.length,
        mercadoDoOrcamento: empresaId === empresaSelecionada,
      });
    }

    return resultado.sort((a, b) => {
      if (a.completo !== b.completo) {
        return a.completo ? -1 : 1;
      }

      if (a.itensComPreco !== b.itensComPreco) {
        return b.itensComPreco - a.itensComPreco;
      }

      return a.total - b.total;
    });
  }, [itens, historico, empresaSelecionada, ultimoPreco, nomeEmpresa]);

  /** So faz sentido eleger o mais barato entre mercados que cobrem todos os itens. */
  const menorTotalCompleto = useMemo(() => {
    const completos = comparativo.filter((mercado) => mercado.completo);
    return completos.length > 1 ? Math.min(...completos.map((mercado) => mercado.total)) : null;
  }, [comparativo]);

  const limparItemForm = (): void => {
    setItemEditIndex(null);
    setItemProdutoId(null);
    setItemVarianteId(null);
    setItemQuantidade('1');
    setItemPreco('');
  };

  const limparOrcamento = (): void => {
    setItens([]);
    setDataOrcamento(todayIso());
    setDataInputKey((prev) => prev + 1);
    limparItemForm();
  };

  const toggleEmpresa = (id: string): void => {
    setEmpresaSelecionada((atual) => (atual === id ? null : id));
  };

  const selecionarProduto = (produtoId: string): void => {
    if (itemProdutoId === produtoId) {
      setItemProdutoId(null);
      setItemVarianteId(null);
      setItemPreco('');
      return;
    }

    setItemProdutoId(produtoId);
    setItemVarianteId(null);
    setItemPreco('');
  };

  const selecionarVariante = (varianteId: string): void => {
    if (itemVarianteId === varianteId) {
      setItemVarianteId(null);
      setItemPreco('');
      return;
    }

    setItemVarianteId(varianteId);

    // Sugere o ultimo preco visto neste mercado; se nao houver, o preco atual da variante.
    const referencia = ultimoPreco(varianteId, empresaSelecionada);
    const variante = variantes.find((v) => v.id === varianteId);
    const sugestao = referencia?.preco ?? variante?.preco ?? null;

    setItemPreco(sugestao !== null ? sugestao.toFixed(2) : '');
  };

  const editarItem = (index: number): void => {
    const item = itens[index];
    setItemEditIndex(index);
    setItemProdutoId(item.produtoId);
    setItemVarianteId(item.varianteId);
    setItemQuantidade(String(item.quantidade));
    setItemPreco(item.preco.toFixed(2));
  };

  const removerItem = (index: number): void => {
    setItens((prev) => prev.filter((_, i) => i !== index));

    if (itemEditIndex === index) {
      limparItemForm();
    }
  };

  const adicionarOuAtualizarItem = (): void => {
    if (!itemProdutoId) {
      Alert.alert('Erro', 'Selecione o produto');
      return;
    }

    if (!itemVarianteId) {
      Alert.alert('Erro', 'Selecione a variante para comparar o mesmo item entre mercados');
      return;
    }

    const quantidade = Number(itemQuantidade);
    const preco = Number(itemPreco);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que zero');
      return;
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      Alert.alert('Erro', 'Preco deve ser maior que zero');
      return;
    }

    const duplicado = itens.findIndex((item) => item.varianteId === itemVarianteId);

    if (duplicado !== -1 && duplicado !== itemEditIndex) {
      Alert.alert('Erro', 'Esta variante ja esta no orcamento. Edite o item existente.');
      return;
    }

    const item: ItemOrcamento = {
      localId: itemEditIndex !== null ? itens[itemEditIndex].localId : uuidv4(),
      produtoId: itemProdutoId,
      varianteId: itemVarianteId,
      descricao: `${nomeProduto(itemProdutoId)} - ${rotuloVariante(itemVarianteId)}`,
      quantidade,
      preco,
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

  const registrarPrecos = async (): Promise<void> => {
    if (!empresaSelecionada) {
      Alert.alert('Erro', 'Selecione o mercado onde os precos foram pesquisados');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataOrcamento)) {
      Alert.alert('Erro', 'Informe uma data valida');
      return;
    }

    if (itens.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um item ao orcamento');
      return;
    }

    try {
      setSalvando(true);

      for (const item of itens) {
        await registrarPrecoVariante({
          produtoId: item.produtoId,
          varianteId: item.varianteId,
          empresaId: empresaSelecionada,
          preco: item.preco,
          data: dataOrcamento,
        });
      }

      limparOrcamento();
      await carregarDados();

      Alert.alert(
        'Precos registrados',
        `${itens.length} preco(s) enviados ao historico de ${nomeEmpresa(empresaSelecionada)}. Nenhum lancamento financeiro foi criado.`,
      );
    } catch (error: unknown) {
      console.error('Erro ao registrar precos do orcamento:', error);
      Alert.alert('Erro', 'Nao foi possivel registrar os precos no historico');
    } finally {
      setSalvando(false);
    }
  };

  const referenciaMercado = itemVarianteId ? ultimoPreco(itemVarianteId, empresaSelecionada) : null;
  const referenciaMenor = itemVarianteId ? menorPrecoRegistrado(itemVarianteId) : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={(): void => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0b3d2e" />
        </Pressable>
        <Text style={styles.title}>Orcamento</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0f7a5b" />
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          <View style={styles.avisoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#0f7a5b" />
            <Text style={styles.avisoText}>
              Este orcamento nao gera lancamento financeiro. Os precos pesquisados vao para o
              historico de precos e alimentam a comparacao entre mercados.
            </Text>
          </View>

          <View style={styles.card}>
            <SeletorMultiplo
              label="Mercado"
              opcoes={empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome }))}
              selecionados={empresaSelecionada ? [empresaSelecionada] : []}
              onToggle={toggleEmpresa}
              placeholderBusca="Buscar mercado"
              textoTrigger={empresaSelecionada ? 'Trocar mercado' : 'Selecionar mercado'}
              textoVazio="Nenhuma empresa cadastrada"
              textoNenhumEncontrado="Nenhuma empresa encontrada"
            />

            <Text style={styles.label}>Data da pesquisa (DD/MM/AAAA)</Text>
            <BrazilianDateInput
              key={dataInputKey}
              defaultValue={dataOrcamento}
              onChangeValue={setDataOrcamento}
              placeholder={dayjs().format('DD/MM/YYYY')}
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />
          </View>

          <Text style={styles.sectionTitle}>Itens do orcamento</Text>

          {itens.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum item adicionado. Escolha produto, variante e o preco visto na gondola.
            </Text>
          ) : (
            itens.map((item, index) => (
              <View key={item.localId} style={styles.itemCard}>
                <View style={styles.itemCardInfo}>
                  <Text style={styles.itemCardTitulo}>{item.descricao}</Text>
                  <Text style={styles.itemCardDetalhe}>
                    {`${item.quantidade} x ${toCurrency(item.preco)} = ${toCurrency(
                      item.quantidade * item.preco,
                    )}`}
                  </Text>
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

          <View style={styles.miniForm}>
            <Text style={styles.miniFormTitulo}>
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
                          {rotuloVariante(variante.id)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {itemVarianteId !== null && (
              <View style={styles.referenciaBox}>
                <Text style={styles.referenciaText}>
                  {referenciaMercado
                    ? `Ultimo preco em ${nomeEmpresa(empresaSelecionada)}: ${toCurrency(
                        referenciaMercado.preco,
                      )} em ${formatarData(referenciaMercado.data)}`
                    : empresaSelecionada
                      ? 'Sem preco registrado neste mercado ainda'
                      : 'Selecione o mercado para ver o preco de referencia'}
                </Text>
                <Text style={styles.referenciaText}>
                  {referenciaMenor
                    ? `Menor preco ja visto: ${toCurrency(referenciaMenor.preco)} em ${nomeEmpresa(
                        referenciaMenor.empresa_id,
                      )}`
                    : 'Nenhum preco no historico para esta variante'}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Quantidade</Text>
            <BrazilianIntegerInput
              value={itemQuantidade}
              onChangeValue={setItemQuantidade}
              decimalScale={0}
              placeholder="Ex.: 2"
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />

            <Text style={styles.label}>Preco pesquisado (R$)</Text>
            <BrazilianIntegerInput
              value={itemPreco}
              onChangeValue={setItemPreco}
              decimalScale={2}
              fixedDecimalScale
              placeholder="Ex.: 43,90"
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />

            <View style={styles.miniFormActions}>
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

          {comparativo.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Comparativo entre mercados</Text>
              <Text style={styles.sectionHint}>
                Mercados diferentes do selecionado usam o ultimo preco registrado no historico.
              </Text>

              {comparativo.map((mercado) => {
                const isMelhor =
                  menorTotalCompleto !== null &&
                  mercado.completo &&
                  mercado.total === menorTotalCompleto;

                return (
                  <View
                    key={mercado.empresaId}
                    style={[styles.mercadoCard, isMelhor && styles.mercadoCardMelhor]}
                  >
                    <View style={styles.mercadoInfo}>
                      <View style={styles.mercadoTituloRow}>
                        <Text style={styles.mercadoNome}>{mercado.nome}</Text>
                        {mercado.mercadoDoOrcamento && (
                          <View style={styles.badgeAtual}>
                            <Text style={styles.badgeAtualText}>Orcamento atual</Text>
                          </View>
                        )}
                        {isMelhor && (
                          <View style={styles.badgeMelhor}>
                            <Text style={styles.badgeMelhorText}>Mais barato</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mercadoDetalhe}>
                        {mercado.completo
                          ? `${itens.length} de ${itens.length} itens com preco`
                          : `${mercado.itensComPreco} de ${itens.length} itens com preco`}
                      </Text>
                    </View>
                    <Text style={[styles.mercadoTotal, isMelhor && styles.mercadoTotalMelhor]}>
                      {toCurrency(mercado.total)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {!loading && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total do orcamento</Text>
            <Text style={styles.totalValue}>{toCurrency(totalOrcamento)}</Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={styles.cancelButton}
              onPress={(): void => {
                if (itens.length === 0) {
                  limparOrcamento();
                  return;
                }

                Alert.alert('Limpar orcamento', 'Deseja descartar os itens deste orcamento?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Limpar', style: 'destructive', onPress: limparOrcamento },
                ]);
              }}
            >
              <Text style={styles.cancelButtonText}>Limpar</Text>
            </Pressable>

            <Pressable
              style={[styles.button, salvando && styles.buttonDisabled]}
              disabled={salvando}
              onPress={(): void => {
                void registrarPrecos();
              }}
            >
              <Text style={styles.buttonText}>
                {salvando ? 'Registrando...' : 'Registrar no historico'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
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
  headerSpacer: {
    width: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  avisoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#e6f4ed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  avisoText: {
    flex: 1,
    fontSize: 12,
    color: '#0b3d2e',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#f9fdfb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#deebe4',
    padding: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6dfdb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#17211d',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d2e',
    marginBottom: 6,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#8ba29a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f7f4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0f7a5b',
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
    color: '#5b6f67',
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
  miniForm: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f7f4',
  },
  miniFormTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d2e',
    marginBottom: 12,
  },
  miniFormActions: {
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
    backgroundColor: '#ffffff',
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
  referenciaBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  referenciaText: {
    fontSize: 12,
    color: '#5b6f67',
  },
  mercadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#f9fdfb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#deebe4',
    padding: 12,
    marginBottom: 8,
  },
  mercadoCardMelhor: {
    backgroundColor: '#e6f4ed',
    borderColor: '#0d8f50',
  },
  mercadoInfo: {
    flex: 1,
  },
  mercadoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mercadoNome: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  mercadoDetalhe: {
    fontSize: 12,
    color: '#8ba29a',
    marginTop: 2,
  },
  mercadoTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  mercadoTotalMelhor: {
    color: '#0d8f50',
  },
  badgeAtual: {
    backgroundColor: '#0f7a5b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeAtualText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  badgeMelhor: {
    backgroundColor: '#0d8f50',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMelhorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#deebe4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#123a2d',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f7a5b',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 2,
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#8ba29a',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
  cancelButtonText: {
    color: '#334640',
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
});
