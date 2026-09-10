import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  sharedStyles,
  spacing,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import React from 'react';

type ResumoTotaisProps = {
  /** Media diaria de gastos do mes corrente, com base nos dias ja decorridos. */
  mediaDiariaGastos: number;
  /** Projecao do gasto do mes inteiro, mantido o ritmo diario atual. */
  projecaoGastoMes: number;
  saldoAtual: number;
  /** Parcelas e assinaturas ja lancadas que ainda vao vencer (valor negativo). */
  comprometidoFuturo: number;
};

/** Par de caixas com a media diaria do mes e o saldo atual, mais projecao e comprometido. */
export default function ResumoTotais({
  mediaDiariaGastos,
  projecaoGastoMes,
  saldoAtual,
  comprometidoFuturo,
}: ResumoTotaisProps): React.ReactNode {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.box}>
          <Text style={styles.label}>Media diaria (mes)</Text>
          <Text style={styles.valor}>{toCurrency(mediaDiariaGastos)}</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Saldo atual</Text>
          <Text
            style={[styles.valor, saldoAtual < 0 ? sharedStyles.negative : sharedStyles.positive]}
          >
            {toCurrency(saldoAtual)}
          </Text>
        </View>
      </View>

      {projecaoGastoMes < 0 && (
        <View style={styles.comprometidoRow}>
          <Ionicons name="trending-up-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.comprometidoTexto}>
            {`Nesse ritmo, o mes fecha com ${toCurrency(Math.abs(projecaoGastoMes))} em gastos`}
          </Text>
        </View>
      )}

      {comprometidoFuturo < 0 && (
        <View style={styles.comprometidoRow}>
          <Ionicons name="calendar-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.comprometidoTexto}>
            {`${toCurrency(Math.abs(comprometidoFuturo))} ja comprometidos em parcelas e assinaturas a vencer`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  box: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  label: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valor: {
    marginTop: spacing.xs,
    fontSize: fontSize.section,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  comprometidoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  comprometidoTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
