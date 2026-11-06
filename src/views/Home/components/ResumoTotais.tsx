import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Aparecer, BarraProgresso, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../../theme';
import { corDaConta, progressoDaMeta } from '../../../utils/contas';
import { toCurrency } from '../../../utils/format';
import type { ResumoHome } from '../useHome';

type ResumoTotaisProps = {
  resumo: ResumoHome;
};

/**
 * Cartao de destaque da Home: saldo atual em gradiente, gasto e media do mes
 * e a barra do gasto realizado contra a projecao de fechamento.
 */
export default function ResumoTotais({ resumo }: ResumoTotaisProps): React.ReactNode {
  const { colors, corCategoria } = useTheme();
  const styles = useStyles();
  const {
    saldoAtual,
    gastoMes,
    mediaDiaria,
    comprometidoMes,
    projecaoMes,
    reservas,
    totalReservas,
  } = resumo;
  /** Tamanho medido do cartao: o SVG em porcentagem nao acompanha a altura final. */
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  return (
    <Aparecer>
      <View
        style={styles.card}
        onLayout={(evento): void =>
          setTamanho({
            largura: evento.nativeEvent.layout.width,
            altura: evento.nativeEvent.layout.height,
          })
        }
      >
        {/* Gradiente e circulos decorativos ficam atras do conteudo. */}
        {tamanho.largura > 0 && (
          <Svg style={styles.fundo} width={tamanho.largura} height={tamanho.altura}>
            <Defs>
              <LinearGradient id="gradienteSaldo" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.heroStart} />
                <Stop offset="1" stopColor={colors.heroEnd} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={tamanho.largura}
              height={tamanho.altura}
              fill="url(#gradienteSaldo)"
            />
            <Circle
              cx={tamanho.largura * 0.92}
              cy={tamanho.altura * 0.08}
              r={90}
              fill={colors.onHero}
              fillOpacity={0.07}
            />
            <Circle
              cx={tamanho.largura * 0.78}
              cy={tamanho.altura * 1.05}
              r={60}
              fill={colors.onHero}
              fillOpacity={0.05}
            />
          </Svg>
        )}

        <View style={styles.topo}>
          <Text style={styles.rotulo}>Saldo atual</Text>
          <Ionicons name="wallet-outline" size={iconSize.md} color={colors.onHeroMuted} />
        </View>
        <Text style={styles.saldo} numberOfLines={1} adjustsFontSizeToFit>
          {toCurrency(saldoAtual)}
        </Text>

        <View style={styles.estatisticas}>
          <View style={styles.estatistica}>
            <Text style={styles.rotulo}>Gasto no mês</Text>
            <Text style={styles.valor}>{toCurrency(gastoMes)}</Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.estatistica}>
            <Text style={styles.rotulo}>Média por dia</Text>
            <Text style={styles.valor}>{toCurrency(mediaDiaria)}</Text>
          </View>
        </View>

        {projecaoMes > 0 && (
          <View style={styles.projecao}>
            <BarraProgresso
              total={projecaoMes}
              corTrilho={colors.heroTrack}
              segmentos={[
                { valor: gastoMes, cor: colors.onHero },
                { valor: comprometidoMes, cor: colors.onHeroMuted },
              ]}
            />
            <Text style={styles.projecaoTexto}>
              {`Projeção do mês: ${toCurrency(projecaoMes)}`}
              {comprometidoMes > 0 ? ` · ${toCurrency(comprometidoMes)} a vencer` : ''}
            </Text>
          </View>
        )}
      </View>

      {reservas.length > 0 && (
        <View style={styles.cardReservas}>
          <View style={styles.reservasTopo}>
            <Text style={styles.reservasTitulo}>Reservas</Text>
            <Ionicons name="archive-outline" size={iconSize.md} color={colors.textSubtle} />
          </View>
          <Text style={styles.reservasTotal}>{toCurrency(totalReservas)}</Text>

          {reservas.map((reserva) => {
            // Mesmo calculo e mesma cor do card da reserva na tela de Contas.
            const progresso = progressoDaMeta(reserva)?.fracao ?? null;

            return (
              <View key={reserva.id} style={styles.reservaLinha}>
                <View style={styles.reservaTextos}>
                  <Text style={styles.reservaNome}>{reserva.nome}</Text>
                  <Text style={styles.reservaValores}>
                    {`${toCurrency(reserva.saldo)}${
                      reserva.meta_valor ? ` de ${toCurrency(reserva.meta_valor)}` : ''
                    }`}
                  </Text>
                </View>
                {progresso !== null ? (
                  <BarraProgresso
                    total={1}
                    corTrilho={colors.border}
                    segmentos={[{ valor: progresso, cor: corDaConta(reserva, corCategoria) }]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Aparecer>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    padding: spacing.xl,
    gap: spacing.xs,
    backgroundColor: colors.heroEnd,
    ...shadows.floating,
  },
  fundo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.onHeroMuted,
  },
  saldo: {
    fontSize: 36,
    fontWeight: fontWeight.heavy,
    color: colors.onHero,
    letterSpacing: -1,
  },
  estatisticas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  estatistica: {
    flex: 1,
    gap: 2,
  },
  divisor: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.heroTrack,
  },
  valor: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.onHero,
  },
  projecao: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  projecaoTexto: {
    fontSize: fontSize.caption,
    color: colors.onHeroMuted,
  },
  cardReservas: {
    marginTop: spacing.lg,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  reservasTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reservasTitulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  reservasTotal: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
    letterSpacing: -0.5,
  },
  reservaLinha: {
    gap: spacing.xs,
  },
  reservaTextos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reservaNome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  reservaValores: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
