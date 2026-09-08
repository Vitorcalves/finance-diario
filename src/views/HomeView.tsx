import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { IconButton, LoadingState, ScreenHeader } from '../components/ui';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../theme';

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
      <SafeAreaView style={sharedStyles.screen}>
        <StatusBar style="dark" />
        <LoadingState message="Carregando dados..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Finance Diario"
        subtitle="Controle simples dos seus gastos dia apos dia"
      />

      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.scrollContent}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Gasto total</Text>
            <Text style={styles.summaryValue}>{toCurrency(totalSaidas)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Saldo atual</Text>
            <Text
              style={[
                styles.summaryValue,
                currentBalance < 0 ? sharedStyles.negative : sharedStyles.positive,
              ]}
            >
              {toCurrency(currentBalance)}
            </Text>
          </View>
        </View>

        <NovoLancamentoForm onAddLancamento={handleAddLancamento} />

        <View style={sharedStyles.card}>
          <Text style={sharedStyles.sectionTitle}>Resumo por dia</Text>
          {transacoesByDay.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>Sem gastos cadastrados ainda.</Text>
          ) : (
            transacoesByDay.map(([day, total]) => (
              <View style={styles.dayRow} key={day}>
                <Text style={styles.dayText}>{dayjs(day).format('DD/MM/YYYY')}</Text>
                <Text style={styles.dayValue}>{toCurrency(total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={sharedStyles.card}>
          <Text style={sharedStyles.sectionTitle}>Lancamentos</Text>
          {transacoes.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>
              Adicione o primeiro gasto para comecar.
            </Text>
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
                          transacao.valor < 0 ? sharedStyles.negative : sharedStyles.positive,
                        ]}
                      >
                        {toCurrency(transacao.valor)}
                      </Text>
                      <IconButton
                        icon="trash"
                        variant="danger"
                        onPress={(): void => removeTransacao(transacao.id)}
                      />
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.section,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dayText: {
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  dayValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  transacaoRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  transacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  transacaoInfo: {
    flex: 1,
    gap: 2,
  },
  transacaoActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  transacaoTitle: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  transacaoMeta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  transacaoAmount: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  itensLista: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemDescricao: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  itemValor: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primaryDark,
  },
});
