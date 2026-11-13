import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ChipSelector, type ChipOpcao, Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { vibrarSelecao } from '../../../utils/haptics';
import type { MesInflacao } from '../../../utils/inflacaoPessoal';
import {
  ALTURA_GRAFICO,
  MARGEM,
  caminhoBarra,
  colunaMaisProxima,
  ehJaneiro,
  escalaVariacao,
  formatarVariacao,
  marcasEixoMeses,
  nomeDoMes,
  posicaoY,
  rotuloMarca,
  rotuloMes,
} from '../grafico';
import type { ModoGrafico } from '../types';

type GraficoInflacaoProps = {
  /** Mes de onde o acumulado parte (ponto zero da linha). */
  mesBase: string;
  meses: MesInflacao[];
  modo: ModoGrafico;
  onTrocarModo: (modo: ModoGrafico) => void;
  /** Mes detalhado abaixo do grafico. */
  mesDestaque: MesInflacao | null;
  onSelecionarMes: (mes: string) => void;
};

const MODOS: ChipOpcao<ModoGrafico>[] = [
  { valor: 'mensal', rotulo: 'Mês a mês' },
  { valor: 'acumulado', rotulo: 'Acumulado' },
];

/** Largura maxima de uma barra e quanto da faixa do mes ela ocupa. */
const BARRA_MAXIMA = 26;
const BARRA_NA_FAIXA = 0.62;
const RAIO_BARRA = 4;
/** Altura minima de uma barra com valor, para uma variacao pequena nao sumir. */
const BARRA_MINIMA = 2;
const MARCAS_EIXO_X = 6;
/** Metade da largura de um rotulo do eixo (`out/26`), para ele nao sair do desenho. */
const MEIO_ROTULO = 18;
/** Ate quantos meses a linha mostra um ponto por mes. */
const PONTOS_VISIVEIS = 13;

type Coluna = {
  mes: string;
  x: number;
  /** Variacao do mes ou acumulado ate ele; `null` = mes sem item comparavel. */
  valor: number | null;
  /** O mes base so ancora a linha no zero: nao e um mes da serie. */
  base: boolean;
};

/**
 * Grafico da inflacao da cesta: barras com a variacao de cada mes (para cima
 * subiu, para baixo caiu) ou a linha do acumulado desde o mes base. Tocar
 * escolhe o mes detalhado abaixo.
 */
export default function GraficoInflacao({
  mesBase,
  meses,
  modo,
  onTrocarModo,
  mesDestaque,
  onSelecionarMes,
}: GraficoInflacaoProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [larguraTotal, setLarguraTotal] = useState(0);

  const largura = Math.max(0, larguraTotal - MARGEM.esquerda - MARGEM.direita);
  const faixa = meses.length > 0 ? largura / meses.length : 0;

  const colunas = useMemo((): Coluna[] => {
    if (modo === 'mensal') {
      return meses.map((mes, indice) => ({
        mes: mes.mes,
        x: faixa * (indice + 0.5),
        valor: mes.variacao,
        base: false,
      }));
    }

    return [
      { mes: mesBase, x: 0, valor: 0, base: true },
      ...meses.map((mes, indice) => ({
        mes: mes.mes,
        x: faixa * (indice + 1),
        valor: mes.acumulado,
        base: false,
      })),
    ];
  }, [modo, meses, mesBase, faixa]);

  const escala = useMemo(
    () => escalaVariacao(colunas.map((coluna) => coluna.valor ?? 0)),
    [colunas],
  );

  const yZero = posicaoY(0, escala, ALTURA_GRAFICO);
  const destaque = colunas.find((coluna) => !coluna.base && coluna.mes === mesDestaque?.mes);
  const rotulados = marcasEixoMeses(colunas.length, MARCAS_EIXO_X);

  const aoMedir = (evento: LayoutChangeEvent): void => {
    setLarguraTotal(evento.nativeEvent.layout.width);
  };

  const aoTocar = (x: number): void => {
    const tocaveis = colunas.filter((coluna) => !coluna.base);
    const indice = colunaMaisProxima(
      tocaveis.map((coluna) => coluna.x),
      x - MARGEM.esquerda,
    );

    if (indice !== null) {
      vibrarSelecao();
      onSelecionarMes(tocaveis[indice].mes);
    }
  };

  const renderBarras = (): React.ReactNode => {
    const larguraBarra = Math.min(BARRA_MAXIMA, faixa * BARRA_NA_FAIXA);

    return colunas.map((coluna) => {
      if (coluna.valor === null || coluna.valor === 0) {
        return null;
      }

      const subiu = coluna.valor > 0;
      const yValor = posicaoY(coluna.valor, escala, ALTURA_GRAFICO);
      // Variacao pequena ainda desenha uma barra visivel, do lado certo do zero.
      const yPonta = subiu
        ? Math.min(yValor, yZero - BARRA_MINIMA)
        : Math.max(yValor, yZero + BARRA_MINIMA);

      return (
        <Path
          key={coluna.mes}
          d={caminhoBarra(coluna.x - larguraBarra / 2, larguraBarra, yZero, yPonta, RAIO_BARRA)}
          fill={subiu ? colors.danger : colors.success}
        />
      );
    });
  };

  const renderLinha = (): React.ReactNode => {
    const pontos = colunas.map((coluna) => ({
      x: coluna.x,
      y: posicaoY(coluna.valor ?? 0, escala, ALTURA_GRAFICO),
    }));
    const linha = pontos
      .map(
        (ponto, indice) => `${indice === 0 ? 'M' : 'L'}${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`,
      )
      .join(' ');
    const ultimo = pontos[pontos.length - 1];

    return (
      <>
        <Path
          d={`${linha} L${ultimo.x.toFixed(1)} ${yZero.toFixed(1)} L0 ${yZero.toFixed(1)} Z`}
          fill={colors.info}
          fillOpacity={0.1}
        />
        <Path
          d={linha}
          stroke={colors.info}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        {colunas.length <= PONTOS_VISIVEIS &&
          pontos.map((ponto, indice) => (
            <Circle
              key={colunas[indice].mes}
              cx={ponto.x}
              cy={ponto.y}
              r={3}
              fill={colors.info}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
      </>
    );
  };

  const renderDestaque = (): React.ReactNode => {
    if (!destaque) {
      return null;
    }

    if (modo === 'mensal') {
      // Faixa do mes escolhido atras da barra: marca o mes sem mudar a cor dela.
      return (
        <Rect
          x={destaque.x - faixa / 2}
          y={0}
          width={faixa}
          height={ALTURA_GRAFICO}
          rx={radius.sm}
          fill={colors.surfaceMuted}
        />
      );
    }

    return (
      <Line
        x1={destaque.x}
        x2={destaque.x}
        y1={0}
        y2={ALTURA_GRAFICO}
        stroke={colors.borderStrong}
        strokeDasharray="4 3"
      />
    );
  };

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>
        {modo === 'mensal' ? 'Variação de cada mês' : `Acumulado desde ${rotuloMes(mesBase)}`}
      </Text>

      <ChipSelector opcoes={MODOS} selecionado={modo} onSelecionar={onTrocarModo} />

      <Pressable
        onLayout={aoMedir}
        onPress={(evento): void => aoTocar(evento.nativeEvent.locationX)}
        accessibilityRole="button"
        accessibilityLabel="Gráfico da inflação. Toque em um mês para ver o detalhe."
      >
        {larguraTotal > 0 ? (
          <Svg width={larguraTotal} height={MARGEM.topo + ALTURA_GRAFICO + MARGEM.base}>
            <G x={MARGEM.esquerda} y={MARGEM.topo}>
              {renderDestaque()}

              {escala.marcas.map((marca) => {
                const y = posicaoY(marca, escala, ALTURA_GRAFICO);

                return (
                  <G key={marca}>
                    <Line
                      x1={0}
                      x2={largura}
                      y1={y}
                      y2={y}
                      stroke={marca === 0 ? colors.borderStrong : colors.divider}
                    />
                    <SvgText
                      x={-spacing.sm}
                      y={y + 4}
                      fontSize={fontSize.micro}
                      fill={colors.textSubtle}
                      textAnchor="end"
                    >
                      {rotuloMarca(marca, escala.passo)}
                    </SvgText>
                  </G>
                );
              })}

              {modo === 'mensal' ? renderBarras() : renderLinha()}

              {modo === 'acumulado' && destaque && (
                <Circle
                  cx={destaque.x}
                  cy={posicaoY(destaque.valor ?? 0, escala, ALTURA_GRAFICO)}
                  r={5}
                  fill={colors.info}
                  stroke={colors.surface}
                  strokeWidth={2}
                />
              )}

              {rotulados.map((indice, posicao) => {
                const coluna = colunas[indice];

                return (
                  <SvgText
                    key={coluna.mes}
                    x={Math.min(coluna.x, largura + MARGEM.direita - MEIO_ROTULO)}
                    y={ALTURA_GRAFICO + MARGEM.base - 6}
                    fontSize={fontSize.micro}
                    fill={colors.textSubtle}
                    textAnchor="middle"
                  >
                    {rotuloMes(coluna.mes, posicao === 0 || ehJaneiro(coluna.mes))}
                  </SvgText>
                );
              })}
            </G>
          </Svg>
        ) : (
          <View style={styles.placeholder} />
        )}
      </Pressable>

      {modo === 'mensal' && (
        <View style={styles.legendaRow}>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaMarca, styles.legendaSubiu]} />
            <Text style={styles.legendaTexto}>Cesta subiu</Text>
          </View>
          <View style={styles.legendaItem}>
            <View style={[styles.legendaMarca, styles.legendaCaiu]} />
            <Text style={styles.legendaTexto}>Cesta caiu</Text>
          </View>
        </View>
      )}

      {mesDestaque && (
        <View style={styles.detalhe}>
          <Text style={styles.detalheMes}>{nomeDoMes(mesDestaque.mes)}</Text>

          <View style={styles.detalheNumeros}>
            <View style={styles.detalheBloco}>
              <Text style={styles.detalheRotulo}>No mês</Text>
              <Text style={styles.detalheValor}>
                {mesDestaque.variacao === null ? '—' : formatarVariacao(mesDestaque.variacao)}
              </Text>
            </View>
            <View style={styles.detalheBloco}>
              <Text style={styles.detalheRotulo}>{`Acumulado desde ${rotuloMes(mesBase)}`}</Text>
              <Text style={styles.detalheValor}>{formatarVariacao(mesDestaque.acumulado)}</Text>
            </View>
          </View>

          <Text style={styles.detalheHint}>
            {mesDestaque.itens === 0
              ? 'Nenhum item da cesta com preço para comparar neste mês.'
              : `${mesDestaque.itensComPrecoNovo} de ${mesDestaque.itens} itens com preço registrado no mês; os outros repetem o último preço.`}
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
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
  legendaMarca: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
  },
  legendaSubiu: {
    backgroundColor: colors.danger,
  },
  legendaCaiu: {
    backgroundColor: colors.success,
  },
  legendaTexto: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  detalhe: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  detalheMes: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  detalheNumeros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detalheBloco: {
    flex: 1,
    gap: 2,
  },
  detalheRotulo: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  detalheValor: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  detalheHint: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));
