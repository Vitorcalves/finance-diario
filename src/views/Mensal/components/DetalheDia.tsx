import dayjs from 'dayjs';
import { View } from 'react-native';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { DetalheDoDia } from '../types';
import { Text } from '../../../components/ui';

type DetalheDiaProps = {
  /** `null` quando nenhuma barra esta selecionada. */
  detalhe: DetalheDoDia | null;
  nomeEmpresa: (id?: string | null) => string;
};

/** Lancamentos do dia escolhido no grafico diario. */
export default function DetalheDia({ detalhe, nomeEmpresa }: DetalheDiaProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  if (!detalhe) {
    return <Text style={styles.dica}>Toque em uma barra para ver o dia.</Text>;
  }

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.data}>{dayjs(detalhe.dia.data).format('dddd, DD/MM')}</Text>
        <Text style={styles.total}>{toCurrency(detalhe.dia.gasto)}</Text>
      </View>

      {detalhe.lancamentos.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>Nenhum lançamento neste dia.</Text>
      ) : (
        detalhe.lancamentos.map((lancamento) => {
          const empresa = nomeEmpresa(lancamento.empresa_id);

          return (
            <View key={lancamento.id} style={styles.lancamentoRow}>
              <View style={styles.lancamentoInfo}>
                <Text style={styles.lancamentoDescricao} numberOfLines={1}>
                  {lancamento.descricao}
                </Text>
                {empresa ? <Text style={styles.lancamentoEmpresa}>{empresa}</Text> : null}
              </View>
              <Text
                style={[
                  styles.lancamentoValor,
                  lancamento.valor < 0 ? sharedStyles.negative : sharedStyles.positive,
                ]}
              >
                {toCurrency(lancamento.valor)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  dica: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  box: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  data: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
    textTransform: 'capitalize',
  },
  total: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  lancamentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  lancamentoInfo: {
    flex: 1,
  },
  lancamentoDescricao: {
    fontSize: fontSize.small,
    color: colors.text,
  },
  lancamentoEmpresa: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  lancamentoValor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
}));
