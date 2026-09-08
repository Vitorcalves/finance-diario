import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, fontWeight, radius, sharedStyles, spacing} from '../../../theme';
import {toCurrency} from '../../../utils/format';
import React from "react";

type ResumoTotaisProps = {
  totalSaidas: number;
  saldoAtual: number;
};

/** Par de caixas com o gasto total e o saldo atual. */
export default function ResumoTotais({
                                       totalSaidas,
                                       saldoAtual,
                                     }: ResumoTotaisProps): React.ReactNode {
  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>Gasto total</Text>
        <Text style={styles.valor}>{toCurrency(totalSaidas)}</Text>
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
  );
}

const styles = StyleSheet.create({
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
});
