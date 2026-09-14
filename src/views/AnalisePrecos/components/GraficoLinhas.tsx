import { useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import { formatarData, toCurrency, toCurrencyCurto } from '../../../utils/format';
import {
  ALTURA_GRAFICO,
  MARGEM,
  calcularDominio,
  caminhoLinha,
  pontoMaisProximo,
  posicaoY,
  projetarPontos,
  ticksEixoX,
} from '../series';
import type { PontoProjetado, Serie, SerieId } from '../types';

type GraficoLinhasProps = {
  series: Serie[];
};

/** Cor de cada serie; `pago` e a marca, `historico` fica em azul de apoio. */
const COR_SERIE: Record<SerieId, string> = {
  pago: colors.primary,
  historico: colors.info,
};

const RAIO_PONTO = 3.5;
const RAIO_PONTO_ATIVO = 6;
const MARCAS_EIXO_X = 4;

type SerieProjetada = {
  serie: Serie;
  pontos: PontoProjetado[];
  caminho: string;
};

/**
 * Grafico de linhas: uma linha por serie sobre a mesma escala de datas e valores.
 * Tocar no grafico destaca o ponto mais proximo e mostra os valores do dia.
 */
export default function GraficoLinhas({ series }: GraficoLinhasProps): React.ReactNode {
  const [larguraTotal, setLarguraTotal] = useState(0);
  const [selecionado, setSelecionado] = useState<{ serie: SerieId; indice: number } | null>(null);

  const largura = Math.max(0, larguraTotal - MARGEM.esquerda - MARGEM.direita);
  const dominio = useMemo(() => calcularDominio(series), [series]);

  const projetadas = useMemo((): SerieProjetada[] => {
    if (!dominio || largura === 0) {
      return [];
    }

    return series
      .filter((serie) => serie.pontos.length > 0)
      .map((serie) => {
        const pontos = projetarPontos(serie.pontos, dominio, largura, ALTURA_GRAFICO);
        return { serie, pontos, caminho: caminhoLinha(pontos) };
      });
  }, [series, dominio, largura]);

  const aoMedir = (event: LayoutChangeEvent): void => {
    setLarguraTotal(event.nativeEvent.layout.width);
  };

  /** Escolhe, entre todas as series, o ponto mais proximo do toque. */
  const aoTocar = (x: number): void => {
    const xArea = x - MARGEM.esquerda;
    let melhor: { serie: SerieId; indice: number; distancia: number } | null = null;

    for (const { serie, pontos } of projetadas) {
      const indice = pontoMaisProximo(pontos, xArea);

      if (indice === null) {
        continue;
      }

      const distancia = Math.abs(pontos[indice].x - xArea);

      if (!melhor || distancia < melhor.distancia) {
        melhor = { serie: serie.id, indice, distancia };
      }
    }

    setSelecionado(melhor ? { serie: melhor.serie, indice: melhor.indice } : null);
  };

  const pontoSelecionado = useMemo((): PontoProjetado | null => {
    if (!selecionado) {
      return null;
    }

    const alvo = projetadas.find(({ serie }) => serie.id === selecionado.serie);
    return alvo?.pontos[selecionado.indice] ?? null;
  }, [selecionado, projetadas]);

  const alturaTotal = MARGEM.topo + ALTURA_GRAFICO + MARGEM.base;

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Preco ao longo do tempo</Text>

      <Pressable onLayout={aoMedir} onPress={(event): void => aoTocar(event.nativeEvent.locationX)}>
        {dominio && larguraTotal > 0 ? (
          <Svg width={larguraTotal} height={alturaTotal}>
            <G x={MARGEM.esquerda} y={MARGEM.topo}>
              {dominio.ticks.map((tick) => {
                const y = posicaoY(tick, dominio, ALTURA_GRAFICO);
                return (
                  <G key={tick}>
                    <Line x1={0} x2={largura} y1={y} y2={y} stroke={colors.divider} />
                    <SvgText
                      x={-spacing.sm}
                      y={y + 4}
                      fontSize={fontSize.micro}
                      fill={colors.textSubtle}
                      textAnchor="end"
                    >
                      {toCurrencyCurto(tick)}
                    </SvgText>
                  </G>
                );
              })}

              {ticksEixoX(dominio, MARCAS_EIXO_X).map((data, index, todas) => {
                const x = (largura / (todas.length - 1)) * index;
                const ancora =
                  index === 0 ? 'start' : index === todas.length - 1 ? 'end' : 'middle';
                return (
                  <SvgText
                    key={data}
                    x={x}
                    y={ALTURA_GRAFICO + MARGEM.base - 6}
                    fontSize={fontSize.micro}
                    fill={colors.textSubtle}
                    textAnchor={ancora}
                  >
                    {formatarData(data).slice(0, 5)}
                  </SvgText>
                );
              })}

              {pontoSelecionado && (
                <Line
                  x1={pontoSelecionado.x}
                  x2={pontoSelecionado.x}
                  y1={0}
                  y2={ALTURA_GRAFICO}
                  stroke={colors.borderStrong}
                  strokeDasharray="4 3"
                />
              )}

              {projetadas.map(({ serie, pontos, caminho }) => (
                <G key={serie.id}>
                  <Path
                    d={caminho}
                    stroke={COR_SERIE[serie.id]}
                    strokeWidth={2}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {pontos.map((ponto, indice) => {
                    const ativo = selecionado?.serie === serie.id && selecionado.indice === indice;
                    return (
                      <Circle
                        key={ponto.ponto.data}
                        cx={ponto.x}
                        cy={ponto.y}
                        r={ativo ? RAIO_PONTO_ATIVO : RAIO_PONTO}
                        fill={ativo ? COR_SERIE[serie.id] : colors.surface}
                        stroke={COR_SERIE[serie.id]}
                        strokeWidth={2}
                      />
                    );
                  })}
                </G>
              ))}
            </G>
          </Svg>
        ) : (
          <View style={styles.placeholder} />
        )}
      </Pressable>

      <View style={styles.legendaRow}>
        {series.map((serie) => (
          <View key={serie.id} style={styles.legendaItem}>
            <View style={[styles.legendaLinha, ESTILO_LEGENDA[serie.id]]} />
            <Text style={styles.legendaTexto}>
              {serie.rotulo}
              {serie.pontos.length === 0 ? ' (sem dados)' : ''}
            </Text>
          </View>
        ))}
      </View>

      {pontoSelecionado && selecionado && (
        <View style={styles.detalhe}>
          <Text style={styles.detalheData}>{formatarData(pontoSelecionado.ponto.data)}</Text>
          <Text style={[styles.detalheValor, ESTILO_VALOR[selecionado.serie]]}>
            {toCurrency(pontoSelecionado.ponto.valor)}
          </Text>
          <Text style={styles.detalheHint}>
            {selecionado.serie === 'pago' ? 'pago' : 'no historico'}
            {pontoSelecionado.ponto.registros > 1
              ? ` • media de ${pontoSelecionado.ponto.registros} registros`
              : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: MARGEM.topo + ALTURA_GRAFICO + MARGEM.base,
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
  legendaLinha: {
    width: 14,
    height: 3,
    borderRadius: radius.sm,
  },
  legendaTexto: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  detalhe: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  detalheData: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  detalheValor: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
  },
  detalheHint: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  legendaPago: {
    backgroundColor: COR_SERIE.pago,
  },
  legendaHistorico: {
    backgroundColor: COR_SERIE.historico,
  },
  valorPago: {
    color: COR_SERIE.pago,
  },
  valorHistorico: {
    color: COR_SERIE.historico,
  },
});

/** Estilos por serie ficam no StyleSheet (regra `react-native/no-inline-styles`). */
const ESTILO_LEGENDA: Record<SerieId, ViewStyle> = {
  pago: styles.legendaPago,
  historico: styles.legendaHistorico,
};

const ESTILO_VALOR: Record<SerieId, TextStyle> = {
  pago: styles.valorPago,
  historico: styles.valorHistorico,
};
