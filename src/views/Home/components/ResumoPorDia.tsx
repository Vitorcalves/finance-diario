import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, fontWeight, sharedStyles, spacing} from '../../../theme';
import {formatarData, toCurrency} from '../../../utils/format';
import React from "react";

type ResumoPorDiaProps = {
  /** Pares `[data, total]` ja ordenados. */
  totaisPorDia: [string, number][];
};

/** Cartao com o total lancado em cada dia. */
export default function ResumoPorDia({totaisPorDia}: ResumoPorDiaProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Resumo por dia</Text>

      {totaisPorDia.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>Sem gastos cadastrados ainda.</Text>
      ) : (
        totaisPorDia.map(([dia, total]) => (
          <View key={dia} style={styles.row}>
            <Text style={styles.data}>{formatarData(dia)}</Text>
            <Text style={styles.valor}>{toCurrency(total)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  data: {
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
});
