import dayjs from 'dayjs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, sharedStyles } from '../../../theme';
import { toCurrency, toCurrencyCurto } from '../../../utils/format';
import { ALTURA_POR_DIA, alturaBarra } from '../charts';
import type { DiaDoMes } from '../types';
import EixoDias from './EixoDias';

type GraficoDiarioProps = {
  dias: DiaDoMes[];
  escala: number;
  diasNoMes: number;
  diaSelecionado: string | null;
  onSelecionarDia: (data: string) => void;
  maiorDia: DiaDoMes | null;
  /** Detalhe do dia selecionado, renderizado abaixo do grafico. */
  children?: React.ReactNode;
};

/** Barras do gasto de cada dia do mes. */
export default function GraficoDiario({
  dias,
  escala,
  diasNoMes,
  diaSelecionado,
  onSelecionarDia,
  maiorDia,
  children,
}: GraficoDiarioProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <View style={styles.tituloRow}>
        <Text style={sharedStyles.sectionTitle}>Por dia</Text>
        <Text style={styles.escalaTexto}>{toCurrencyCurto(escala)}</Text>
      </View>

      <View style={styles.chartBars}>
        {dias.map((dia) => (
          <Pressable
            key={dia.data}
            style={styles.chartColumn}
            onPress={(): void => onSelecionarDia(dia.data)}
          >
            {dia.comprometido > 0 && (
              <View
                style={[
                  styles.barra,
                  styles.barraComprometida,
                  alturaBarra(dia.comprometido, escala, ALTURA_POR_DIA),
                ]}
              />
            )}
            <View
              style={[
                styles.barra,
                dia.fimDeSemana && styles.barraFimDeSemana,
                dia.hoje && styles.barraHoje,
                diaSelecionado === dia.data && styles.barraSelecionada,
                alturaBarra(dia.gasto, escala, ALTURA_POR_DIA),
              ]}
            />
          </Pressable>
        ))}
      </View>

      <EixoDias diasNoMes={diasNoMes} />

      {maiorDia !== null && maiorDia.gasto > 0 && (
        <Text style={styles.destaque}>
          {`Maior dia: ${dayjs(maiorDia.data).format('DD/MM (ddd)')} - ${toCurrency(maiorDia.gasto)}`}
        </Text>
      )}

      {children}
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
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTURA_POR_DIA,
    gap: 2,
  },
  chartColumn: {
    flex: 1,
    height: ALTURA_POR_DIA,
    justifyContent: 'flex-end',
  },
  barra: {
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  /** Parcela/assinatura a vencer: mesma escala, peso visual menor. */
  barraComprometida: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barraFimDeSemana: {
    backgroundColor: colors.textSubtle,
  },
  barraHoje: {
    backgroundColor: colors.primaryDark,
  },
  barraSelecionada: {
    backgroundColor: colors.warning,
  },
  destaque: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
