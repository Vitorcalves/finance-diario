import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Text } from '../../../components/ui';
import { fontSize, makeStyles, radius, useTheme } from '../../../theme';
import { toCurrency, toCurrencyCurto } from '../../../utils/format';
import { vibrarSelecao } from '../../../utils/haptics';
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

/** Barras do gasto de cada dia do mes; tocar numa barra abre o detalhe do dia. */
export default function GraficoDiario({
  dias,
  escala,
  diasNoMes,
  diaSelecionado,
  onSelecionarDia,
  maiorDia,
  children,
}: GraficoDiarioProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const [crescimento] = useState(() => new Animated.Value(0));
  const mes = dias[0]?.data ?? '';

  // As barras sobem a partir da base sempre que um mes novo entra na tela.
  useEffect(() => {
    crescimento.setValue(0);
    Animated.timing(crescimento, {
      toValue: 1,
      duration: 550,
      delay: 120,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [mes, crescimento]);

  return (
    <View style={sharedStyles.card}>
      <View style={styles.tituloRow}>
        <Text style={sharedStyles.sectionTitle}>Por dia</Text>
        <Text style={styles.escalaTexto}>{toCurrencyCurto(escala)}</Text>
      </View>

      <Animated.View style={[styles.chartBars, { transform: [{ scaleY: crescimento }] }]}>
        {dias.map((dia) => {
          const selecionado = diaSelecionado === dia.data;

          return (
            <Pressable
              key={dia.data}
              style={styles.chartColumn}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Dia ${dia.dia}: ${toCurrency(dia.gasto)}`}
              onPress={(): void => {
                vibrarSelecao();
                onSelecionarDia(dia.data);
              }}
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
                  selecionado && styles.barraSelecionada,
                  alturaBarra(dia.gasto, escala, ALTURA_POR_DIA),
                ]}
              />
            </Pressable>
          );
        })}
      </Animated.View>

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

const useStyles = makeStyles((colors) => ({
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
    transformOrigin: 'bottom',
  },
  chartColumn: {
    flex: 1,
    height: ALTURA_POR_DIA,
    justifyContent: 'flex-end',
  },
  barra: {
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.primary,
  },
  /** Parcela/assinatura a vencer: mesma escala, peso visual menor. */
  barraComprometida: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  /** Fim de semana: mesmo tom, mais claro, para o ritmo da semana aparecer. */
  barraFimDeSemana: {
    opacity: 0.55,
  },
  barraHoje: {
    backgroundColor: colors.primaryStrong,
    opacity: 1,
  },
  barraSelecionada: {
    backgroundColor: colors.warning,
    opacity: 1,
  },
  destaque: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
