import React from 'react';
import { View } from 'react-native';
import { fontSize, fontWeight, makeStyles, radius, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { ResumoPlanos as ResumoPlanosModel } from '../types';
import { Text } from '../../../components/ui';

type ResumoPlanosProps = {
  resumo: ResumoPlanosModel;
};

/** Quanto os planos ativos pesam por mes e o que ainda vai vencer. */
export default function ResumoPlanos({ resumo }: ResumoPlanosProps): React.ReactNode {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>Assinaturas por mês</Text>
        <Text style={styles.valor}>{toCurrency(resumo.assinaturasPorMes)}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>A vencer neste mês</Text>
        <Text style={styles.valor}>{toCurrency(resumo.comprometidoNoMes)}</Text>
        <Text style={styles.detalhe}>{`${toCurrency(resumo.parcelasAVencer)} no total`}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  box: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
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
}));
