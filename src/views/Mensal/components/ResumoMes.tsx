import Ionicons from '@expo/vector-icons/Ionicons';
import type dayjs from 'dayjs';
import { View } from 'react-native';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { ComparativoMes, ResumoMes as ResumoMesModel } from '../types';
import { Text } from '../../../components/ui';

type ResumoMesProps = {
  resumo: ResumoMesModel;
  comparativo: ComparativoMes;
  mes: dayjs.Dayjs;
  mesCorrente: boolean;
  mesFuturo: boolean;
  diasDecorridos: number;
};

/** Cartao com o gasto do mes, a variacao contra o mes passado e as medias. */
export default function ResumoMes({
  resumo,
  comparativo,
  mes,
  mesCorrente,
  mesFuturo,
  diasDecorridos,
}: ResumoMesProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  return (
    <View style={sharedStyles.card}>
      <Text style={styles.label}>{mesCorrente ? 'Gasto até hoje' : 'Gasto no mês'}</Text>
      <Text style={styles.valor}>{toCurrency(resumo.gastoTotal)}</Text>
      <Text style={styles.periodo}>
        {mesFuturo
          ? `${resumo.diasComGasto} dia(s) com gasto já lançado`
          : `1 a ${diasDecorridos} de ${mes.format('MMMM')} - ${resumo.diasComGasto} dia(s) com gasto`}
      </Text>

      {comparativo.variacao !== null && (
        <View style={styles.variacaoRow}>
          <Ionicons
            name={comparativo.variacao >= 0 ? 'trending-up' : 'trending-down'}
            size={iconSize.sm}
            color={comparativo.variacao >= 0 ? colors.danger : colors.success}
          />
          <Text
            style={[
              styles.variacaoTexto,
              comparativo.variacao >= 0 ? sharedStyles.negative : sharedStyles.positive,
            ]}
          >
            {`${comparativo.variacao >= 0 ? '+' : ''}${comparativo.variacao.toFixed(0)}%`}
          </Text>
          <Text style={styles.variacaoDetalhe}>
            {`vs. ${toCurrency(comparativo.ateMesmoDia)} no mesmo período do mês passado`}
          </Text>
        </View>
      )}

      {resumo.comprometido > 0 && (
        <Text style={styles.comprometido}>
          {`+ ${toCurrency(resumo.comprometido)} em parcelas e assinaturas a vencer neste mês`}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Média por dia</Text>
          <Text style={styles.statValue}>{toCurrency(resumo.mediaDiaria)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>
            {mesCorrente || mesFuturo ? 'Projeção do mês' : 'Entradas'}
          </Text>
          <Text style={styles.statValue}>
            {toCurrency(mesCorrente || mesFuturo ? resumo.projecao : resumo.entradaTotal)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valor: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  periodo: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  comprometido: {
    fontSize: fontSize.caption,
    color: colors.info,
  },
  variacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  variacaoTexto: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  variacaoDetalhe: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  statValue: {
    marginTop: 2,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
}));
