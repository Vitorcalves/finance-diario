import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { makeStyles, radius } from '../../theme';

export type SegmentoProgresso = {
  valor: number;
  cor: string;
};

type BarraProgressoProps = {
  /** Fatias empilhadas da esquerda para a direita. */
  segmentos: SegmentoProgresso[];
  /** Valor que representa a barra cheia. */
  total: number;
  altura?: number;
  /** Cor do trilho; padrao e a superficie apagada do tema. */
  corTrilho?: string;
};

/** Barra horizontal com uma ou mais fatias, que se enche ao aparecer. */
export default function BarraProgresso({
  segmentos,
  total,
  altura = 8,
  corTrilho,
}: BarraProgressoProps): React.ReactNode {
  const styles = useStyles();
  const [enchimento] = useState(() => new Animated.Value(0));

  useEffect(() => {
    enchimento.setValue(0);
    Animated.timing(enchimento, {
      toValue: 1,
      duration: 700,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, [enchimento, total]);

  const fatias = segmentos
    .map((segmento) => ({
      ...segmento,
      proporcao: total > 0 ? Math.max(0, segmento.valor) / total : 0,
    }))
    .filter((segmento) => segmento.proporcao > 0);

  return (
    <View
      style={[
        styles.trilho,
        { height: altura, borderRadius: altura / 2 },
        corTrilho ? { backgroundColor: corTrilho } : null,
      ]}
    >
      <Animated.View style={[styles.preenchimento, { transform: [{ scaleX: enchimento }] }]}>
        {fatias.map((fatia, indice) => (
          <View
            key={indice}
            style={{ flex: Math.min(1, fatia.proporcao), backgroundColor: fatia.cor }}
          />
        ))}
        {/* Espaco vazio ate completar a barra. */}
        <View
          style={{
            flex: Math.max(0, 1 - fatias.reduce((soma, fatia) => soma + fatia.proporcao, 0)),
          }}
        />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  trilho: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  preenchimento: {
    flex: 1,
    flexDirection: 'row',
    transformOrigin: 'left',
  },
}));
