import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { fontSize, fontWeight, makeStyles, radius, shadows, spacing, useTheme } from '../../theme';
import { vibrarSelecao } from '../../utils/haptics';
import Text from './Text';

export type OpcaoSegmento<T extends string> = {
  valor: T;
  rotulo: string;
  /** Cor do indicador quando a opcao esta ativa; padrao e a cor da marca. */
  cor?: string;
};

type SegmentedControlProps<T extends string> = {
  opcoes: OpcaoSegmento<T>[];
  valor: T;
  onChange: (valor: T) => void;
};

/** Alternador de opcoes exclusivas com indicador que desliza ate a ativa. */
export default function SegmentedControl<T extends string>({
  opcoes,
  valor,
  onChange,
}: SegmentedControlProps<T>): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const [largura, setLargura] = useState(0);
  const indice = Math.max(
    0,
    opcoes.findIndex((opcao) => opcao.valor === valor),
  );
  const [posicao] = useState(() => new Animated.Value(indice));

  useEffect(() => {
    Animated.spring(posicao, {
      toValue: indice,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [indice, posicao]);

  const larguraSegmento = largura > 0 ? (largura - spacing.xs * 2) / opcoes.length : 0;
  const translateX = Animated.multiply(posicao, larguraSegmento);
  const corAtiva = opcoes[indice]?.cor ?? colors.primary;

  return (
    <View
      style={styles.trilho}
      onLayout={(evento): void => setLargura(evento.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {larguraSegmento > 0 && (
        <Animated.View
          style={[
            styles.indicador,
            { width: larguraSegmento, backgroundColor: corAtiva, transform: [{ translateX }] },
          ]}
        />
      )}

      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;

        return (
          <Pressable
            key={opcao.valor}
            style={styles.segmento}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            onPress={(): void => {
              if (!ativa) {
                vibrarSelecao();
                onChange(opcao.valor);
              }
            }}
          >
            <Text style={[styles.rotulo, ativa && styles.rotuloAtivo]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  trilho: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  indicador: {
    position: 'absolute',
    top: spacing.xs,
    bottom: spacing.xs,
    left: spacing.xs,
    borderRadius: radius.md,
    ...shadows.card,
  },
  segmento: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  rotulo: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  rotuloAtivo: {
    color: colors.onPrimary,
  },
}));
