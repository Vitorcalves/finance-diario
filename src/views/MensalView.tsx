import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { listTransacoes, type Transacoes } from '../models/transacoesModel';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { ScreenHeader } from '../components/ui';
import { colors, fontSize, fontWeight, iconSize, radius, sharedStyles, spacing } from '../theme';

dayjs.locale('pt-br');

export type ListDia = {
  valor: number;
  data: string;
};

export default function Option2View(): React.ReactNode {
  const [mesSelecionado, setMesSelecionadoState] = useState(dayjs());
  const [dadosMes, setDadosMes] = useState<ListDia[]>([]);

  const processarMes = (transacoesDoMes: Transacoes[], referenciaMes: dayjs.Dayjs): ListDia[] => {
    const saldoPorDia: ListDia[] = Array.from(
      { length: referenciaMes.daysInMonth() },
      (_, index) => ({
        valor: 0,
        data: referenciaMes.date(index + 1).format('YYYY-MM-DD'),
      }),
    );

    transacoesDoMes.forEach((transacao) => {
      const dia = dayjs(transacao.data).date() - 1;
      if (dia >= 0 && dia < saldoPorDia.length) {
        saldoPorDia[dia].valor += transacao.valor;
      }
    });

    return saldoPorDia;
  };

  const setMesSelecionado = (novoMes: dayjs.Dayjs): void => {
    setMesSelecionadoState(novoMes);
  };

  const proximoMes = (): void => {
    setMesSelecionado(mesSelecionado.add(1, 'month'));
  };

  const mesAnterior = (): void => {
    setMesSelecionado(mesSelecionado.subtract(1, 'month'));
  };

  const setDefaultDate = (): void => {
    setMesSelecionado(dayjs());
  };

  const getSaldoStyle = (valor: number): StyleProp<TextStyle> => {
    if (valor < 0) {
      return styles.negativeValue;
    }

    if (valor === 0) {
      return styles.neutralValue;
    }

    return styles.positiveValue;
  };

  useEffect((): (() => void) => {
    let active = true;

    const loadData = async (): Promise<void> => {
      const start = mesSelecionado.startOf('month').format('YYYY-MM-DD');
      const end = mesSelecionado.endOf('month').format('YYYY-MM-DD');
      const transacoesDoMes = await listTransacoes(start, end);

      if (!active) {
        return;
      }

      setDadosMes(processarMes(transacoesDoMes, mesSelecionado));
    };

    void loadData().catch((error: unknown) => {
      console.error('Erro ao carregar dados do mes:', error);
    });

    return (): void => {
      active = false;
    };
  }, [mesSelecionado]);

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Finanças Mensais"
        right={
          <Pressable onPress={setDefaultDate} style={sharedStyles.headerAction}>
            <Ionicons name="refresh" size={iconSize.lg} color={colors.primary} />
          </Pressable>
        }
      />

      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.scrollContent}
      >
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
              <Text style={[styles.tableCell, styles.colDay]}>
                {dayjs(dadosMes[index].data).date()}
              </Text>
              <Text
                style={[styles.tableCell, styles.colBalance, getSaldoStyle(dadosMes[index].valor)]}
              >
                {dadosMes[index].valor}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: fontSize.title,
    color: colors.primary,
    lineHeight: 30,
    fontWeight: fontWeight.medium,
  },
  monthLabel: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tableHeaderText: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.body,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tableRowAlt: {
    backgroundColor: colors.surfaceAlt,
  },
  tableCell: {
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  colDay: {
    flex: 1,
  },
  colBalance: {
    flex: 2,
    textAlign: 'right',
  },
  negativeValue: {
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  neutralValue: {
    color: colors.textSubtle,
  },
  positiveValue: {
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
});
