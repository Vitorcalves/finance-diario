import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from '../components/BrazilianDateInput';
import BrazilianIntegerInput from '../components/BrazilianIntegerInput';
import SeletorMultiplo from '../components/SeletorMultiplo';
import { Button, IconButton, LoadingState, ScreenHeader } from '../components/ui';
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
import { colors, fontSize, fontWeight, iconSize, radius, sharedStyles, spacing } from '../theme';

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
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Orcamento" onBack={(): void => navigation.goBack()} />

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <View style={styles.avisoCard}>
            <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.primary} />
            <Text style={styles.avisoText}>
              Este orcamento nao gera lancamento financeiro. Os precos pesquisados vao para o
              historico de precos e alimentam a comparacao entre mercados.
            </Text>
          </View>

          <View style={sharedStyles.card}>
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

            <Text style={sharedStyles.label}>Data da pesquisa (DD/MM/AAAA)</Text>
            <BrazilianDateInput
              key={dataInputKey}
              defaultValue={dataOrcamento}
              onChangeValue={setDataOrcamento}
              placeholder={dayjs().format('DD/MM/YYYY')}
              placeholderTextColor={colors.placeholder}
              style={sharedStyles.input}
            />
          </View>

          <Text style={sharedStyles.sectionTitle}>Itens do orcamento</Text>

          {itens.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>
              Nenhum item adicionado. Escolha produto, variante e o preco visto na gondola.
            </Text>
          ) : (
            itens.map((item, index) => (
              <View key={item.localId} style={sharedStyles.listCard}>
                <View style={sharedStyles.listCardInfo}>
                  <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
                  <Text style={sharedStyles.listCardDetail}>
                    {`${item.quantidade} x ${toCurrency(item.preco)} = ${toCurrency(
                      item.quantidade * item.preco,
                    )}`}
                  </Text>
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

            <Text style={sharedStyles.label}>Quantidade</Text>
            <BrazilianIntegerInput
              value={itemQuantidade}
              onChangeValue={setItemQuantidade}
              decimalScale={0}
              placeholder="Ex.: 2"
              placeholderTextColor={colors.placeholder}
              style={[sharedStyles.input, sharedStyles.inputSpaced]}
            />

            <Text style={sharedStyles.label}>Preco pesquisado (R$)</Text>
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

          {comparativo.length > 0 && (
            <>
              <Text style={sharedStyles.sectionTitle}>Comparativo entre mercados</Text>
              <Text style={sharedStyles.sectionHint}>
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
                    style={[styles.mercadoCard, isMelhor && sharedStyles.cardHighlight]}
                  >
                    <View style={styles.mercadoInfo}>
                      <View style={styles.mercadoTituloRow}>
                        <Text style={styles.mercadoNome}>{mercado.nome}</Text>
                        {mercado.mercadoDoOrcamento && (
                          <View style={sharedStyles.badge}>
                            <Text style={sharedStyles.badgeText}>Orcamento atual</Text>
                          </View>
                        )}
                        {isMelhor && (
                          <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                            <Text style={sharedStyles.badgeText}>Mais barato</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mercadoDetalhe}>
                        {mercado.completo
                          ? `${itens.length} de ${itens.length} itens com preco`
                          : `${mercado.itensComPreco} de ${itens.length} itens com preco`}
                      </Text>
                    </View>
                    <Text style={[styles.mercadoTotal, isMelhor && sharedStyles.positive]}>
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
        <View style={sharedStyles.footer}>
          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total do orcamento</Text>
            <Text style={sharedStyles.totalValue}>{toCurrency(totalOrcamento)}</Text>
          </View>

          <View style={sharedStyles.actionsRow}>
            <Button
              label="Limpar"
              variant="secondary"
              flex
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
            />

            <Button
              label={salvando ? 'Registrando...' : 'Registrar no historico'}
              disabled={salvando}
              style={styles.registrarButton}
              onPress={(): void => {
                void registrarPrecos();
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avisoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avisoText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.primaryDark,
    lineHeight: 17,
  },
  referenciaBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  referenciaText: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  mercadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  mercadoInfo: {
    flex: 1,
  },
  mercadoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mercadoNome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  mercadoDetalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  mercadoTotal: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  registrarButton: {
    flex: 2,
  },
});
