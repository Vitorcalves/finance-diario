import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { ResumoPlanos as ResumoPlanosModel } from '../types';

type ResumoPlanosProps = {
  resumo: ResumoPlanosModel;
};

/** Quanto os planos ativos pesam por mes e o que ainda vai vencer. */
export default function ResumoPlanos({ resumo }: ResumoPlanosProps): React.ReactNode {
  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>Assinaturas por mes</Text>
        <Text style={styles.valor}>{toCurrency(resumo.assinaturasPorMes)}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>A vencer neste mes</Text>
        <Text style={styles.valor}>{toCurrency(resumo.comprometidoNoMes)}</Text>
        <Text style={styles.detalhe}>{`${toCurrency(resumo.parcelasAVencer)} no total`}</Text>
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
  detalhe: {
    marginTop: 2,
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
});
