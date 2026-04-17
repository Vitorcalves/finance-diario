import BlankView from '../components/BlankView';
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

const diasMes = dayjs().daysInMonth();
export default function Option2View() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>financas mensal</Text>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dia</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Saldo</Text>
          </View>
        </View>
        {Array.from({ length: diasMes }, (_, index) => (
          <View style={styles.row} key={index}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{index + 1}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>teste 2</Text>
            </View>
          </View>
        ))}
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 5,
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
