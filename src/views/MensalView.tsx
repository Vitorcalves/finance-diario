import BlankView from '../components/BlankView';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  listTransacoes,
  type Transacoes,
} from '../models/transacoesModel';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
require('dayjs/locale/pt-br');

export type ListDia = {
  valor: number;
  data: string;
};

export default function Option2View() {
  const [mesSelecionado, setMesSelecionadoState] = useState(dayjs());
  const [transacoes, setTransacoes] = useState<Transacoes[]>([]);
  const [dadosMes, setDadosMes] = useState<ListDia[]>([]);
  const diasMes = mesSelecionado.daysInMonth();
  
  const processarMes = () => {
    const saldoPorDia: ListDia[] = Array.from({ length: diasMes }, (_, index) => ({
      valor: 0,
      data: mesSelecionado.date(index + 1).format('YYYY-MM-DD'),
    }));

    transacoes.forEach((transacao) => {
      const dia = dayjs(transacao.data).date() - 1;
      if (dia >= 0 && dia < diasMes) {
        saldoPorDia[dia].valor += transacao.contabilizado_saldo ? transacao.valor : -transacao.valor;
      }
    });

    setDadosMes(saldoPorDia);
    console.log('Dados do mês processados:', saldoPorDia);
  };

  const loadData = async () => {
    const start = mesSelecionado.startOf('month').format('YYYY-MM-DD');
    const end = mesSelecionado.endOf('month').format('YYYY-MM-DD');
    const transacoes = await listTransacoes(start, end);
    setTransacoes(transacoes);
    processarMes();
  }

  const setMesSelecionado = (novoMes: dayjs.Dayjs) => {
    setMesSelecionadoState(novoMes);
    loadData();
  }
  const proximoMes = () => {
    setMesSelecionado(mesSelecionado.add(1, 'month'));
  };

  const mesAnterior = () => {
    setMesSelecionado(mesSelecionado.subtract(1, 'month'));
  };

  const setDefaultDate = () => {
    setMesSelecionado(dayjs());
  };


  useEffect(() => {
    setDefaultDate();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Finanças Mensais</Text>
          <Pressable onPress={setDefaultDate} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#0f7a5b" />
          </Pressable>
        </View>

        <View style={styles.navRow}>
          <Pressable onPress={mesAnterior} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>
            {mesSelecionado.locale('pt-br').format('MMMM YYYY')}
          </Text>
          <Pressable onPress={proximoMes} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDay]}>Dia</Text>
            <Text style={[styles.tableHeaderText, styles.colBalance]}>Saldo</Text>
          </View>
          {Array.from(dadosMes, (_, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.colDay]}>{dayjs(dadosMes[index].data).date()}</Text>
              <Text style={[styles.tableCell, styles.colBalance, {color: dadosMes[index].valor < 0 ? 'red' : (dadosMes[index].valor === 0 ? 'orange' : 'green')}]}>{dadosMes[index].valor}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f2',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    width: 'auto',
    color: '#0b3d2e',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5ef',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f5ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#0f7a5b',
    lineHeight: 30,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b3d2e',
    textTransform: 'capitalize',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ef',
  },
  tableRowAlt: {
    backgroundColor: '#f8fbfa',
  },
  tableCell: {
    fontSize: 14,
  },
  colDay: {
    flex: 1,
  },
  colBalance: {
    flex: 2,
    textAlign: 'right',
  },
});
