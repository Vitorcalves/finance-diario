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
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteExpenseById, insertExpense, listExpenses, type Expense } from '../models/expenseModel';
import { getMonthlyIncome, saveMonthlyIncome } from '../models/settingsModel';

const todayIso = () => dayjs().format('YYYY-MM-DD');

const toCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const parseMoney = (raw: string) => {
  const normalized = raw.replace(',', '.').replace(/[^\d.-]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

export default function HomeView() {
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('');
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(todayIso());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const [storedIncome, storedExpenses] = await Promise.all([
          getMonthlyIncome(),
          listExpenses(),
        ]);

        if (!mounted) {
          return;
        }

        if (storedIncome > 0) {
          setMonthlyIncomeInput(String(storedIncome));
        }

        setExpenses(storedExpenses);
      } catch (error) {
        console.error('Erro ao inicializar banco de dados', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const monthlyIncome = parseMoney(monthlyIncomeInput);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + item.valor, 0),
    [expenses],
  );

  const currentBalance = monthlyIncome - totalExpenses;

  const expensesByDay = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const item of expenses) {
      grouped.set(item.data, (grouped.get(item.data) ?? 0) + item.valor);
    }

    return [...grouped.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [expenses]);

  const persistMonthlyIncome = async () => {
    try {
      await saveMonthlyIncome(monthlyIncome);
    } catch (error) {
      console.error('Erro ao salvar entrada mensal', error);
    }
  };

  const addExpense = async () => {
    const amount = parseMoney(amountInput);
    const trimmedDescription = description.trim();
    const trimmedDate = dateInput.trim();

    if (!trimmedDescription || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return;
    }

    const newExpense: Expense = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descricao: trimmedDescription,
      valor: amount,
      data: trimmedDate,
      positivo: 0,
      categoria_id: null,
      created_at: new Date().toISOString(),
    };

    try {
      await insertExpense(newExpense);
      setExpenses((prev) => [newExpense, ...prev]);
      setDescription('');
      setAmountInput('');
      setDateInput(todayIso());
    } catch (error) {
      console.error('Erro ao salvar gasto', error);
    }
  };

  const removeExpense = async (id: string) => {
    try {
      await deleteExpenseById(id);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
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

        <View style={styles.card}>
          <Text style={styles.label}>Entrada mensal (R$)</Text>
          <TextInput
            value={monthlyIncomeInput}
            onChangeText={setMonthlyIncomeInput}
            onBlur={persistMonthlyIncome}
            keyboardType="decimal-pad"
            placeholder="Ex.: 5000"
            placeholderTextColor="#7b8a8e"
            style={styles.input}
          />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Gasto total</Text>
            <Text style={styles.summaryValue}>{toCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Saldo atual</Text>
            <Text
              style={[
                styles.summaryValue,
                currentBalance < 0 ? styles.negative : styles.positive,
              ]}
            >
              {toCurrency(currentBalance)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Novo gasto diario</Text>

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

          <Pressable style={styles.button} onPress={addExpense}>
            <Text style={styles.buttonText}>Adicionar gasto</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumo por dia</Text>
          {expensesByDay.length === 0 ? (
            <Text style={styles.emptyText}>Sem gastos cadastrados ainda.</Text>
          ) : (
            expensesByDay.map(([day, total]) => (
              <View style={styles.dayRow} key={day}>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={styles.dayValue}>{toCurrency(total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lancamentos</Text>
          {expenses.length === 0 ? (
            <Text style={styles.emptyText}>Adicione o primeiro gasto para comecar.</Text>
          ) : (
            expenses.map((item) => (
              <View style={styles.expenseRow} key={item.id}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle}>{item.descricao}</Text>
                  <Text style={styles.expenseMeta}>{item.data}</Text>
                </View>

                <View style={styles.expenseActions}>
                  <Text style={styles.expenseAmount}>{toCurrency(item.valor)}</Text>
                  <Pressable onPress={() => removeExpense(item.id)}>
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
  button: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
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
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
  },
  expenseInfo: {
    flex: 1,
    gap: 3,
  },
  expenseActions: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 10,
  },
  expenseTitle: {
    fontSize: 15,
    color: '#17342b',
    fontWeight: '600',
  },
  expenseMeta: {
    fontSize: 12,
    color: '#5b6f67',
  },
  expenseAmount: {
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
