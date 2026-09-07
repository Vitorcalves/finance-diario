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
import SeletorMultiplo from '../components/SeletorMultiplo';
import { type HistoricoPreco, listHistoricoPreco } from '../models/historicoPreco';
import { listProdutos, type Produto } from '../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../models/produtoVariantes';
import { listMarcas, type Marca } from '../models/marcas';
import { type Empresa, listEmpresas } from '../models/empresas';
import { Unidades } from '../utils/unidades';
import type { MenuStackParamList } from '../routes/types';

type HistoricoPrecosNavigation = NativeStackNavigationProp<MenuStackParamList, 'HistoricoPrecos'>;

type Agrupamento = 'variante' | 'produto';
type Ordenacao = 'menorPreco' | 'recente' | 'nome';

type GrupoPreco = {
  chave: string;
  titulo: string;
  subtitulo: string;
  registros: HistoricoPreco[];
  atual: number;
  menor: number;
  maior: number;
  media: number;
  registroMenor: HistoricoPreco;
  registroAtual: HistoricoPreco;
};

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const toPercent = (value: number): string =>
  `${value > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)}%`;

const toTimestamp = (data: string): number => dayjs(data).valueOf();

const formatarData = (data: string): string => dayjs(data).format('DD/MM/YYYY');

export default function HistoricoPrecosView(): React.ReactNode {
  const navigation = useNavigation<HistoricoPrecosNavigation>();

  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const [produtoFiltro, setProdutoFiltro] = useState<string | null>(null);
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('variante');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('menorPreco');
  const [expandidos, setExpandidos] = useState<string[]>([]);

  const carregarDados = async (): Promise<void> => {
    try {
      setLoading(true);
      const [historicoDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco, empresasDoBanco] =
        await Promise.all([
          listHistoricoPreco(),
          listProdutos(),
          listProdutoVariantes(),
          listMarcas(),
          listEmpresas(),
        ]);

      setHistorico(historicoDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
      setEmpresas(empresasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar historico de precos:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar o historico de precos');
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

  const nomeEmpresa = (id: string | null): string =>
    empresas.find((empresa) => empresa.id === id)?.nome ?? 'Sem empresa';

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

  const grupos = useMemo((): GrupoPreco[] => {
    const filtrado = produtoFiltro
      ? historico.filter((registro) => registro.produto_id === produtoFiltro)
      : historico;

    const agrupado = new Map<string, HistoricoPreco[]>();

    for (const registro of filtrado) {
      const chave = agrupamento === 'variante' ? registro.variante_id : registro.produto_id;
      const atuais = agrupado.get(chave) ?? [];
      atuais.push(registro);
      agrupado.set(chave, atuais);
    }

    const resultado: GrupoPreco[] = [];

    for (const [chave, registrosDoGrupo] of agrupado) {
      const registros = [...registrosDoGrupo].sort(
        (a, b) => toTimestamp(b.data) - toTimestamp(a.data),
      );
      const precos = registros.map((registro) => registro.preco);
      const menor = Math.min(...precos);
      const registroMenor = registros.find((registro) => registro.preco === menor) ?? registros[0];
      const produtoDoGrupo = registros[0].produto_id;

      resultado.push({
        chave,
        titulo: agrupamento === 'variante' ? rotuloVariante(chave) : nomeProduto(produtoDoGrupo),
        subtitulo:
          agrupamento === 'variante'
            ? nomeProduto(produtoDoGrupo)
            : `${registros.length} registro(s) de preco`,
        registros,
        atual: registros[0].preco,
        menor,
        maior: Math.max(...precos),
        media: precos.reduce((soma, preco) => soma + preco, 0) / precos.length,
        registroMenor,
        registroAtual: registros[0],
      });
    }

    return resultado.sort((a, b) => {
      if (ordenacao === 'menorPreco') {
        return a.atual - b.atual;
      }

      if (ordenacao === 'recente') {
        return toTimestamp(b.registroAtual.data) - toTimestamp(a.registroAtual.data);
      }

      return a.titulo.localeCompare(b.titulo, 'pt-BR');
    });
  }, [historico, nomeProduto, rotuloVariante, produtoFiltro, agrupamento, ordenacao]);

  const melhorPreco = useMemo(
    () => (grupos.length > 1 ? Math.min(...grupos.map((grupo) => grupo.atual)) : null),
    [grupos],
  );

  const toggleExpandido = (chave: string): void => {
    setExpandidos((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave],
    );
  };

  const toggleProdutoFiltro = (id: string): void => {
    setProdutoFiltro((atual) => (atual === id ? null : id));
    setExpandidos([]);
  };

  const renderChips = <T extends string>(
    opcoes: { valor: T; rotulo: string }[],
    selecionado: T,
    onSelecionar: (valor: T) => void,
  ): React.ReactNode => (
    <View style={styles.chipsRow}>
      {opcoes.map((opcao) => (
        <Pressable
          key={opcao.valor}
          style={[styles.chip, selecionado === opcao.valor && styles.chipAtivo]}
          onPress={(): void => onSelecionar(opcao.valor)}
        >
          <Text style={[styles.chipText, selecionado === opcao.valor && styles.chipTextAtivo]}>
            {opcao.rotulo}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={(): void => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#0b3d2e" />
        </Pressable>
        <Text style={styles.title}>Historico de Precos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0f7a5b" />
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          <View style={styles.filtrosCard}>
            <SeletorMultiplo
              label="Produto"
              opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
              selecionados={produtoFiltro ? [produtoFiltro] : []}
              onToggle={toggleProdutoFiltro}
              placeholderBusca="Buscar produto"
              textoTrigger={produtoFiltro ? 'Trocar produto' : 'Todos os produtos'}
              textoVazio="Nenhum produto cadastrado"
              textoNenhumEncontrado="Nenhum produto encontrado"
            />

            <Text style={styles.label}>Comparar por</Text>
            {renderChips(
              [
                { valor: 'variante' as Agrupamento, rotulo: 'Variante' },
                { valor: 'produto' as Agrupamento, rotulo: 'Produto' },
              ],
              agrupamento,
              (valor): void => {
                setAgrupamento(valor);
                setExpandidos([]);
              },
            )}

            <Text style={styles.label}>Ordenar por</Text>
            {renderChips(
              [
                { valor: 'menorPreco' as Ordenacao, rotulo: 'Menor preco atual' },
                { valor: 'recente' as Ordenacao, rotulo: 'Mais recente' },
                { valor: 'nome' as Ordenacao, rotulo: 'Nome' },
              ],
              ordenacao,
              setOrdenacao,
            )}
          </View>

          {grupos.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="time-outline" size={64} color="#8ba29a" />
              <Text style={styles.emptyText}>
                {produtoFiltro
                  ? 'Nenhum preco registrado para este produto'
                  : 'Nenhum preco registrado ainda'}
              </Text>
              <Text style={styles.emptyHint}>
                Os precos sao registrados ao lancar itens com variante na tela inicial.
              </Text>
            </View>
          ) : (
            grupos.map((grupo) => {
              const expandido = expandidos.includes(grupo.chave);
              const variacao =
                grupo.menor > 0 ? ((grupo.atual - grupo.menor) / grupo.menor) * 100 : 0;
              const isMelhor = melhorPreco !== null && grupo.atual === melhorPreco;

              return (
                <View
                  key={grupo.chave}
                  style={[styles.grupoCard, isMelhor && styles.grupoCardMelhor]}
                >
                  <Pressable
                    style={styles.grupoHeader}
                    onPress={(): void => toggleExpandido(grupo.chave)}
                  >
                    <View style={styles.grupoInfo}>
                      <View style={styles.grupoTituloRow}>
                        <Text style={styles.grupoTitulo}>{grupo.titulo}</Text>
                        {isMelhor && (
                          <View style={styles.badgeMelhor}>
                            <Text style={styles.badgeMelhorText}>Melhor preco</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.grupoSubtitulo}>{grupo.subtitulo}</Text>
                    </View>
                    <Ionicons
                      name={expandido ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#0b3d2e"
                    />
                  </Pressable>

                  <View style={styles.metricasRow}>
                    <View style={styles.metrica}>
                      <Text style={styles.metricaLabel}>Atual</Text>
                      <Text style={styles.metricaValorDestaque}>{toCurrency(grupo.atual)}</Text>
                      <Text style={styles.metricaDetalhe}>
                        {formatarData(grupo.registroAtual.data)}
                      </Text>
                    </View>
                    <View style={styles.metrica}>
                      <Text style={styles.metricaLabel}>Menor</Text>
                      <Text style={styles.metricaValor}>{toCurrency(grupo.menor)}</Text>
                      <Text style={styles.metricaDetalhe} numberOfLines={1}>
                        {nomeEmpresa(grupo.registroMenor.empresa_id)}
                      </Text>
                    </View>
                    <View style={styles.metrica}>
                      <Text style={styles.metricaLabel}>Maior</Text>
                      <Text style={styles.metricaValor}>{toCurrency(grupo.maior)}</Text>
                      <Text style={styles.metricaDetalhe}>Media {toCurrency(grupo.media)}</Text>
                    </View>
                  </View>

                  {grupo.registros.length > 1 && (
                    <Text
                      style={[
                        styles.variacaoText,
                        variacao > 0 ? styles.variacaoAlta : styles.variacaoBaixa,
                      ]}
                    >
                      {variacao > 0
                        ? `${toPercent(variacao)} acima do menor preco ja pago`
                        : 'Esta no menor preco ja registrado'}
                    </Text>
                  )}

                  {expandido && (
                    <View style={styles.registrosLista}>
                      {grupo.registros.map((registro) => (
                        <View key={registro.id} style={styles.registroRow}>
                          <View style={styles.registroInfo}>
                            <Text style={styles.registroData}>{formatarData(registro.data)}</Text>
                            <Text style={styles.registroEmpresa} numberOfLines={1}>
                              {nomeEmpresa(registro.empresa_id)}
                              {agrupamento === 'produto'
                                ? ` • ${rotuloVariante(registro.variante_id)}`
                                : ''}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.registroPreco,
                              registro.preco === grupo.menor && styles.registroPrecoMenor,
                            ]}
                          >
                            {toCurrency(registro.preco)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#3e4b46',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: '#8ba29a',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  filtrosCard: {
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  chipAtivo: {
    backgroundColor: '#0f7a5b',
    borderColor: '#0f7a5b',
  },
  chipText: {
    fontSize: 13,
    color: '#0b3d2e',
  },
  chipTextAtivo: {
    color: '#ffffff',
    fontWeight: '700',
  },
  grupoCard: {
    backgroundColor: '#f0f7f4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0f7a5b',
  },
  grupoCardMelhor: {
    backgroundColor: '#e6f4ed',
    borderLeftColor: '#0d8f50',
  },
  grupoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  grupoInfo: {
    flex: 1,
  },
  grupoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  grupoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  grupoSubtitulo: {
    fontSize: 12,
    color: '#5b6f67',
    marginTop: 2,
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
  metricasRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  metrica: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
  },
  metricaLabel: {
    fontSize: 11,
    color: '#5b6f67',
  },
  metricaValor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b3d2e',
    marginTop: 2,
  },
  metricaValorDestaque: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f7a5b',
    marginTop: 2,
  },
  metricaDetalhe: {
    fontSize: 11,
    color: '#8ba29a',
    marginTop: 2,
  },
  variacaoText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  variacaoAlta: {
    color: '#c0352b',
  },
  variacaoBaixa: {
    color: '#0d8f50',
  },
  registrosLista: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#deebe4',
    paddingTop: 8,
    gap: 6,
  },
  registroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  registroInfo: {
    flex: 1,
  },
  registroData: {
    fontSize: 13,
    color: '#0b3d2e',
    fontWeight: '600',
  },
  registroEmpresa: {
    fontSize: 12,
    color: '#8ba29a',
  },
  registroPreco: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  registroPrecoMenor: {
    color: '#0d8f50',
  },
});
