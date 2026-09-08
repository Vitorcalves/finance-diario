import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, sharedStyles, spacing } from '../../../theme';
import { toCurrencyCurto } from '../../../utils/format';
import { ALTURA_ACUMULADO, TRACOS_REFERENCIA, alturaBarra, posicaoLinha } from '../charts';
import type { DiaDoMes } from '../types';
import EixoDias from './EixoDias';

type GraficoAcumuladoProps = {
  dias: DiaDoMes[];
  /** Projecao do acumulado por dia; posicoes sem projecao vem como 0. */
  projecaoPorDia: number[];
  escala: number;
  /** Total fechado do mes anterior, desenhado como linha de referencia. */
  totalMesAnterior: number;
  mesCorrente: boolean;
  diasNoMes: number;
};

/** Area do gasto acumulado do dia 1 ate o fim do mes. */
export default function GraficoAcumulado({
  dias,
  projecaoPorDia,
  escala,
  totalMesAnterior,
  mesCorrente,
  diasNoMes,
}: GraficoAcumuladoProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <View style={styles.tituloRow}>
        <Text style={sharedStyles.sectionTitle}>Acumulado</Text>
        <Text style={styles.escalaTexto}>{toCurrencyCurto(escala)}</Text>
      </View>

      <View style={styles.chartArea}>
        <View style={styles.chartBars}>
          {dias.map((dia, index) => (
            <View key={dia.data} style={styles.chartColumn}>
              {projecaoPorDia[index] > 0 && (
                <View
                  style={[
                    styles.areaProjetada,
                    alturaBarra(projecaoPorDia[index], escala, ALTURA_ACUMULADO),
                  ]}
                />
              )}
              {!dia.futuro && (
                <View
                  style={[
                    styles.areaAcumulada,
                    alturaBarra(dia.acumulado, escala, ALTURA_ACUMULADO),
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {totalMesAnterior > 0 && (
          <View
            style={[
              styles.linhaReferencia,
              posicaoLinha(totalMesAnterior, escala, ALTURA_ACUMULADO),
            ]}
          >
            {Array.from({ length: TRACOS_REFERENCIA }, (_, index) => (
              <View key={index} style={styles.traco} />
            ))}
          </View>
        )}
      </View>

      <EixoDias diasNoMes={diasNoMes} />

      <View style={styles.legendaRow}>
        <View style={styles.legendaItem}>
          <View style={styles.legendaAcumulado} />
          <Text style={styles.legendaTexto}>Gasto realizado</Text>
        </View>

        {mesCorrente && (
          <View style={styles.legendaItem}>
            <View style={styles.legendaProjecao} />
            <Text style={styles.legendaTexto}>Projecao</Text>
          </View>
        )}

        {totalMesAnterior > 0 && (
          <View style={styles.legendaItem}>
            <View style={styles.legendaLinha} />
            <Text style={styles.legendaTexto}>
              {`Mes passado fechou em ${toCurrencyCurto(totalMesAnterior)}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  escalaTexto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  chartArea: {
    position: 'relative',
    height: ALTURA_ACUMULADO,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTURA_ACUMULADO,
  },
  /** Colunas coladas: a serie acumulada deve ser lida como area, nao como barras. */
  chartColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  areaAcumulada: {
    backgroundColor: colors.primary,
  },
  areaProjetada: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primarySoft,
  },
  linhaReferencia: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traco: {
    width: 4,
    height: 1,
    backgroundColor: colors.textSubtle,
  },
  legendaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendaAcumulado: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  legendaProjecao: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendaLinha: {
    width: 10,
    height: 1,
    backgroundColor: colors.textSubtle,
  },
  legendaTexto: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
});
