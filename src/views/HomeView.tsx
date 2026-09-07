import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteTransacaoById,
  insertTransacao,
  listTransacoes,
  type Transacoes,
} from '../models/transacoesModel';
import {
  deleteItensTransacaoByTransacao,
  insertItemTransacao,
  listItensTransacao,
  totalItemTransacao,
  type ItemTransacao,
} from '../models/itensTransacao';
import { registrarPrecoVariante } from '../models/produtoVariantes';
import { type Empresa, listEmpresas } from '../models/empresas';
import NovoLancamentoForm, { type NovoLancamento } from '../components/NovoLancamentoForm';

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

export default function HomeView(): React.ReactNode {
  const [transacoes, setTransacoes] = useState<Transacoes[]>([]);
  const [itens, setItens] = useState<ItemTransacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = async (): Promise<void> => {
    const [transacoesDoBanco, itensDoBanco, empresasDoBanco] = await Promise.all([
      listTransacoes(),
      listItensTransacao(),
      listEmpresas(),
    ]);

    setTransacoes(transacoesDoBanco);
    setItens(itensDoBanco);
    setEmpresas(empresasDoBanco);
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        await carregarDados();
      } catch (error) {
        console.error('Erro ao inicializar banco de dados', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap().catch((error) => console.error('Erro no bootstrap', error));

    return (): void => {
      mounted = false;
    };
  }, []);

  const totalSaidas = useMemo(
    () => transacoes.reduce((soma, item) => (item.valor < 0 ? soma + item.valor : soma), 0),
    [transacoes],
  );

  const currentBalance = useMemo(
    () => transacoes.reduce((soma, item) => soma + item.valor, 0),
    [transacoes],
  );

  const transacoesByDay = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of transacoes) {
      grouped.set(item.data, (grouped.get(item.data) ?? 0) + item.valor);
    }

    return [...grouped.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transacoes]);

  const itensPorTransacao = useMemo(() => {
    const grouped = new Map<string, ItemTransacao[]>();

    for (const item of itens) {
      const atuais = grouped.get(item.transacao_id) ?? [];
      atuais.push(item);
      grouped.set(item.transacao_id, atuais);
    }

    return grouped;
  }, [itens]);

  const nomeEmpresa = (id?: string | null): string =>
    empresas.find((empresa) => empresa.id === id)?.nome ?? '';

  const handleAddLancamento = async (lancamento: NovoLancamento): Promise<void> => {
    const agora = new Date().toISOString();
    const transacaoId = uuidv4();

    await insertTransacao({
      id: transacaoId,
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      data: lancamento.data,
      empresa_id: lancamento.empresaId,
      created_at: agora,
    });

    for (const item of lancamento.itens) {
      await insertItemTransacao({
        id: uuidv4(),
        transacao_id: transacaoId,
        produto_id: item.produtoId,
        variante_id: item.varianteId,
        descricao: item.descricao,
        valor: item.precoUnitario,
        quantidade: item.quantidade,
        created_at: agora,
      });

      if (item.produtoId && item.varianteId) {
        await registrarPrecoVariante({
          produtoId: item.produtoId,
          varianteId: item.varianteId,
          empresaId: lancamento.empresaId,
          preco: item.precoUnitario,
          data: toDataHistorico(lancamento.data),
        });
      }
    }

    await carregarDados();
  };

  const removeTransacao = (id: string): void => {
    void (async (): Promise<void> => {
      try {
        await deleteItensTransacaoByTransacao(id);
        await deleteTransacaoById(id);
        await carregarDados();
      } catch (error) {
        console.error('Erro ao remover lancamento', error);
      }
    })();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f7a5b" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Finance Diario</Text>
        <Text style={styles.subtitle}>Controle simples dos seus gastos dia apos dia</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Gasto total</Text>
            <Text style={styles.summaryValue}>{toCurrency(totalSaidas)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Saldo atual</Text>
            <Text
              style={[styles.summaryValue, currentBalance < 0 ? styles.negative : styles.positive]}
            >
              {toCurrency(currentBalance)}
            </Text>
          </View>
        </View>

        <NovoLancamentoForm onAddLancamento={handleAddLancamento} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumo por dia</Text>
          {transacoesByDay.length === 0 ? (
            <Text style={styles.emptyText}>Sem gastos cadastrados ainda.</Text>
          ) : (
            transacoesByDay.map(([day, total]) => (
              <View style={styles.dayRow} key={day}>
                <Text style={styles.dayText}>{dayjs(day).format('DD/MM/YYYY')}</Text>
                <Text style={styles.dayValue}>{toCurrency(total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lancamentos</Text>
          {transacoes.length === 0 ? (
            <Text style={styles.emptyText}>Adicione o primeiro gasto para comecar.</Text>
          ) : (
            transacoes.map((transacao) => {
              const itensDaTransacao = itensPorTransacao.get(transacao.id) ?? [];
              const empresa = nomeEmpresa(transacao.empresa_id);

              return (
                <View style={styles.transacaoRow} key={transacao.id}>
                  <View style={styles.transacaoHeader}>
                    <View style={styles.transacaoInfo}>
                      <Text style={styles.transacaoTitle}>{transacao.descricao}</Text>
                      <Text style={styles.transacaoMeta}>
                        {dayjs(transacao.data).format('DD/MM/YYYY')}
                        {empresa ? ` • ${empresa}` : ''}
                      </Text>
                    </View>

                    <View style={styles.transacaoActions}>
                      <Text
                        style={[
                          styles.transacaoAmount,
                          transacao.valor < 0 ? styles.negative : styles.positive,
                        ]}
                      >
                        {toCurrency(transacao.valor)}
                      </Text>
                      <Pressable onPress={(): void => removeTransacao(transacao.id)}>
                        <Text style={styles.removeText}>Remover</Text>
                      </Pressable>
                    </View>
                  </View>

                  {itensDaTransacao.length > 0 && (
                    <View style={styles.itensLista}>
                      {itensDaTransacao.map((item) => (
                        <View style={styles.itemRow} key={item.id}>
                          <Text style={styles.itemDescricao} numberOfLines={1}>
                            {`${item.quantidade}x ${item.descricao}`}
                          </Text>
                          <Text style={styles.itemValor}>
                            {toCurrency(totalItemTransacao(item))}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f4f6f5',
  },
  loadingText: {
    color: '#355148',
    fontSize: 14,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0b3d2e',
  },
  subtitle: {
    fontSize: 15,
    color: '#3e4b46',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123a2d',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#eaf4ef',
    borderRadius: 14,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#355148',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f2c23',
  },
  positive: {
    color: '#0d8f50',
  },
  negative: {
    color: '#c0352b',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
  },
  dayText: {
    color: '#334640',
    fontSize: 14,
  },
  dayValue: {
    color: '#0f2c23',
    fontWeight: '700',
  },
  transacaoRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
    gap: 6,
  },
  transacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transacaoInfo: {
    flex: 1,
    gap: 3,
  },
  transacaoActions: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 10,
  },
  transacaoTitle: {
    fontSize: 15,
    color: '#17342b',
    fontWeight: '600',
  },
  transacaoMeta: {
    fontSize: 12,
    color: '#5b6f67',
  },
  transacaoAmount: {
    fontWeight: '700',
    color: '#193d31',
  },
  removeText: {
    color: '#b23a31',
    fontSize: 12,
    fontWeight: '700',
  },
  itensLista: {
    borderLeftWidth: 2,
    borderLeftColor: '#deebe4',
    paddingLeft: 10,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemDescricao: {
    flex: 1,
    fontSize: 12,
    color: '#5b6f67',
  },
  itemValor: {
    fontSize: 12,
    color: '#193d31',
    fontWeight: '600',
  },
  emptyText: {
    color: '#5c6b66',
    fontSize: 14,
  },
});
