import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Text } from '../../../components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { toCurrencyCurto } from '../../../utils/format';
import {
  ALTURA_ACUMULADO,
  alturaProporcional,
  caminhoArea,
  caminhoSuave,
  type PontoGrafico,
} from '../charts';
import type { DiaDoMes } from '../types';
import EixoDias from './EixoDias';

/** Folga acima e abaixo do desenho, para a linha e o ponto de hoje nao serem cortados. */
const FOLGA = 6;

type GraficoAcumuladoProps = {
  dias: DiaDoMes[];
  /** Projecao do acumulado por dia; posicoes sem projecao vem como 0. */
  projecaoPorDia: number[];
  escala: number;
  /** Acumulado do mes anterior em cada dia do mes exibido: a curva de fundo. */
  acumuladoAnterior: number[];
  /** Total do mes anterior; sem gasto la, a curva de fundo nao aparece. */
  totalMesAnterior: number;
  mesCorrente: boolean;
  diasNoMes: number;
};

/**
 * Curva do gasto acumulado do dia 1 ate o fim do mes, com a projecao tracejada
 * e, ao fundo, a curva do mes anterior para comparar o ritmo dia a dia.
 */
export default function GraficoAcumulado({
  dias,
  projecaoPorDia,
  escala,
  acumuladoAnterior,
  totalMesAnterior,
  mesCorrente,
  diasNoMes,
}: GraficoAcumuladoProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [largura, setLargura] = useState(0);
  const [crescimento] = useState(() => new Animated.Value(0));
  const mes = dias[0]?.data ?? '';

  // A curva "cresce" a partir da base sempre que um mes novo entra na tela.
  useEffect(() => {
    crescimento.setValue(0);
    Animated.timing(crescimento, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mes, crescimento]);

  const xDoDia = (dia: number): number =>
    diasNoMes > 1 ? ((dia - 1) / (diasNoMes - 1)) * largura : 0;
  const yDoValor = (valor: number): number =>
    ALTURA_ACUMULADO - alturaProporcional(valor, escala, ALTURA_ACUMULADO);

  const realizados: PontoGrafico[] = dias
    .filter((dia) => !dia.futuro)
    .map((dia) => ({ x: xDoDia(dia.dia), y: yDoValor(dia.acumulado) }));

  const ultimoRealizado = realizados[realizados.length - 1];

  const projetados: PontoGrafico[] =
    mesCorrente && ultimoRealizado
      ? [
          ultimoRealizado,
          ...dias
            .filter((dia) => dia.futuro)
            .map((dia) => ({ x: xDoDia(dia.dia), y: yDoValor(projecaoPorDia[dia.dia - 1] ?? 0) })),
        ]
      : [];

  const anteriores: PontoGrafico[] =
    totalMesAnterior > 0
      ? acumuladoAnterior.map((valor, indice) => ({ x: xDoDia(indice + 1), y: yDoValor(valor) }))
      : [];

  /** Onde o mes anterior estava no dia de hoje: o ponto que se compara com o de agora. */
  const hoje = dias.find((dia) => dia.hoje);
  const anteriorHoje = hoje ? anteriores[hoje.dia - 1] : undefined;

  const nomeMesAnterior = dayjs(mes).subtract(1, 'month').format('MMMM');
  const rotuloMesAnterior = nomeMesAnterior.charAt(0).toUpperCase() + nomeMesAnterior.slice(1);

  return (
    <View style={sharedStyles.card}>
      <View style={styles.tituloRow}>
        <Text style={sharedStyles.sectionTitle}>Acumulado</Text>
        <Text style={styles.escalaTexto}>{toCurrencyCurto(escala)}</Text>
      </View>

      <Animated.View
        style={[styles.area, { transform: [{ scaleY: crescimento }] }]}
        onLayout={(evento): void => setLargura(evento.nativeEvent.layout.width)}
      >
        {largura > 0 && (
          <Svg width={largura} height={ALTURA_ACUMULADO + FOLGA * 2}>
            <Defs>
              <LinearGradient id="areaAcumulado" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            <G y={FOLGA}>
              {[0.25, 0.5, 0.75].map((fracao) => (
                <Line
                  key={fracao}
                  x1={0}
                  x2={largura}
                  y1={ALTURA_ACUMULADO * fracao}
                  y2={ALTURA_ACUMULADO * fracao}
                  stroke={colors.divider}
                  strokeWidth={1}
                />
              ))}
              <Line
                x1={0}
                x2={largura}
                y1={ALTURA_ACUMULADO}
                y2={ALTURA_ACUMULADO}
                stroke={colors.border}
                strokeWidth={1}
              />

              {/* Mes anterior ao fundo: cinza e mais fino, para nao disputar com o mes exibido. */}
              {anteriores.length > 1 && (
                <>
                  <Path
                    d={caminhoArea(anteriores, ALTURA_ACUMULADO)}
                    fill={colors.textSubtle}
                    fillOpacity={0.1}
                  />
                  <Path
                    d={caminhoSuave(anteriores)}
                    stroke={colors.textSubtle}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </>
              )}

              {projetados.length > 1 && (
                <>
                  <Path
                    d={caminhoArea(projetados, ALTURA_ACUMULADO)}
                    fill={colors.primary}
                    fillOpacity={0.06}
                  />
                  <Path
                    d={caminhoSuave(projetados)}
                    stroke={colors.primary}
                    strokeOpacity={0.55}
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    fill="none"
                  />
                </>
              )}

              {realizados.length > 1 && (
                <Path d={caminhoArea(realizados, ALTURA_ACUMULADO)} fill="url(#areaAcumulado)" />
              )}

              {realizados.length > 0 && (
                <Path
                  d={caminhoSuave(realizados)}
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}

              {mesCorrente && anteriorHoje && (
                <Circle
                  cx={anteriorHoje.x}
                  cy={anteriorHoje.y}
                  r={3.5}
                  fill={colors.surface}
                  stroke={colors.textSubtle}
                  strokeWidth={1.5}
                />
              )}

              {mesCorrente && ultimoRealizado && (
                <>
                  <Circle
                    cx={ultimoRealizado.x}
                    cy={ultimoRealizado.y}
                    r={8}
                    fill={colors.primary}
                    fillOpacity={0.18}
                  />
                  <Circle
                    cx={ultimoRealizado.x}
                    cy={ultimoRealizado.y}
                    r={4}
                    fill={colors.primary}
                    stroke={colors.surface}
                    strokeWidth={2}
                  />
                </>
              )}
            </G>
          </Svg>
        )}
      </Animated.View>

      <EixoDias diasNoMes={diasNoMes} />

      <View style={styles.legendaRow}>
        <View style={styles.legendaItem}>
          <View style={styles.legendaAcumulado} />
          <Text style={styles.legendaTexto}>Gasto realizado</Text>
        </View>

        {mesCorrente && (
          <View style={styles.legendaItem}>
            <View style={styles.legendaProjecao} />
            <Text style={styles.legendaTexto}>Projeção</Text>
          </View>
        )}

        {totalMesAnterior > 0 && (
          <View style={styles.legendaItem}>
            <View style={styles.legendaLinha} />
            <Text style={styles.legendaTexto}>
              {`${rotuloMesAnterior}: ${toCurrencyCurto(totalMesAnterior)}`}
            </Text>
          </View>
        )}
      </View>
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
  area: {
    height: ALTURA_ACUMULADO + FOLGA * 2,
    transformOrigin: 'bottom',
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
    width: 12,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  legendaLinha: {
    width: 12,
    height: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.textSubtle,
  },
  legendaTexto: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
}));
