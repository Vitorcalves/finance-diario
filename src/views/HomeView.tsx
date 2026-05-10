import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteTransacaoById,
  insertTransacao,
  listTransacoes,
  type Transacoes,
} from '../models/transacoesModel';
import { insertItemTransacao } from '../models/itensTransacao';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const parseMoney = (raw: string): number => {
  const normalized = raw.replace(',', '.').replace(/[^\d.-]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

export default function HomeView(): React.ReactNode {
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(todayIso());
  const [tipoTransacao, setTipoTransacao] = useState<'saida' | 'entrada'>('saida');
  const [transacoes, setTransacoes] = useState<Transacoes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        const storedTransacoes = await listTransacoes();

        if (!mounted) {
          return;
        }

        setTransacoes(storedTransacoes);
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

  const totalTransacoes = useMemo(
    () => transacoes.reduce((sum, item) => sum + item.valor, 0),
    [transacoes],
  );

  const currentBalance = totalTransacoes;

  const transacoesByDay = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of transacoes) {
      grouped.set(item.data, (grouped.get(item.data) ?? 0) + item.valor);
    }

    return [...grouped.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transacoes]);

  const addTrasacao = (): void => {
    const amount = parseMoney(amountInput);
    const trimmedDescription = description.trim();
    const trimmedDate = dateInput.trim();

    if (!trimmedDescription || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return;
    }

    const valorFinal = tipoTransacao === 'saida' ? -amount : amount;
    promisseAdd(trimmedDescription, valorFinal, trimmedDate).catch((error) =>
      console.error('Erro ao adicionar transacao', error),
    );
  };

  const promisseAdd = async (
    trimmedDescription: string,
    valorFinal: number,
    trimmedDate: string,
  ): Promise<void> => {
    const newTransacao: Transacoes = {
      id: uuidv4(),
      descricao: trimmedDescription,
      valor: valorFinal,
      data: trimmedDate,
      contabilizado_saldo: false,
      categoria_id: null,
      created_at: new Date().toISOString(),
    };

    try {
      await insertTransacao(newTransacao);
      await listTransacoes().then((updatedTransacoes) => setTransacoes(updatedTransacoes));
      setDescription('');
      setAmountInput('');
      setDateInput(todayIso());
    } catch (error) {
      console.error('Erro ao salvar gasto', error);
    }
  };

  const removeTransacao = (id: string): void => {
    try {
      deleteTransacaoById(id).catch((error) =>
        console.error('Erro ao remover gasto do banco', error),
      );
      setTransacoes((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Erro ao remover gasto', error);
    }
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
            <Text style={styles.summaryValue}>{toCurrency(totalTransacoes)}</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Novo lancamento</Text>

          <View style={styles.tipoRow}>
            <Pressable
              style={[styles.tipoButton, tipoTransacao === 'saida' && styles.tipoButtonActiveSaida]}
              onPress={() => setTipoTransacao('saida')}
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
              onPress={() => setTipoTransacao('entrada')}
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

          <Text style={styles.label}>Descricao</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: Mercado"
            placeholderTextColor="#7b8a8e"
            style={styles.input}
          />

          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="Ex.: 43,90"
            placeholderTextColor="#7b8a8e"
            style={styles.input}
          />

          <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
          <TextInput
            value={dateInput}
            onChangeText={setDateInput}
            placeholder={todayIso()}
            placeholderTextColor="#7b8a8e"
            style={styles.input}
          />

          <Pressable
            style={[styles.button, tipoTransacao === 'entrada' && styles.buttonEntrada]}
            onPress={addTrasacao}
          >
            <Text style={styles.buttonText}>
              {tipoTransacao === 'saida' ? 'Adicionar saida' : 'Adicionar entrada'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumo por dia</Text>
          {transacoesByDay.length === 0 ? (
            <Text style={styles.emptyText}>Sem gastos cadastrados ainda.</Text>
          ) : (
            transacoesByDay.map(([day, total]) => (
              <View style={styles.dayRow} key={day}>
                <Text style={styles.dayText}>{day}</Text>
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
            transacoes.map((item) => (
              <View style={styles.transacaoRow} key={item.id}>
                <View style={styles.transacaoInfo}>
                  <Text style={styles.transacaoTitle}>{item.descricao}</Text>
                  <Text style={styles.transacaoMeta}>{item.data}</Text>
                </View>

                <View style={styles.transacaoActions}>
                  <Text
                    style={[
                      styles.transacaoAmount,
                      item.valor < 0 ? styles.negative : styles.positive,
                    ]}
                  >
                    {toCurrency(item.valor)}
                  </Text>
                  <Pressable onPress={() => removeTransacao(item.id)}>
                    <Text style={styles.removeText}>Remover</Text>
                  </Pressable>
                </View>
              </View>
            ))
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
  label: {
    fontSize: 13,
    color: '#2d3e38',
    fontWeight: '600',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123a2d',
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 10,
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
  button: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonEntrada: {
    backgroundColor: '#0d8f50',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
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
  emptyText: {
    color: '#5c6b66',
    fontSize: 14,
  },
});
