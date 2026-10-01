import { type ReactNode, useEffect, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

type AparecerProps = {
  children: ReactNode;
  /** Atraso em ms, para escalonar blocos que entram juntos. */
  atraso?: number;
  /** Deslocamento vertical inicial, em pixels. */
  deslocamento?: number;
  style?: StyleProp<ViewStyle>;
};

/** Entrada suave: o bloco surge esmaecido e sobe alguns pixels ao montar. */
export default function Aparecer({
  children,
  atraso = 0,
  deslocamento = 12,
  style,
}: AparecerProps): React.ReactNode {
  const [progresso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animacao = Animated.timing(progresso, {
      toValue: 1,
      duration: 320,
      delay: atraso,
      useNativeDriver: true,
    });

    animacao.start();

    return (): void => animacao.stop();
  }, [progresso, atraso]);

  const translateY = progresso.interpolate({
    inputRange: [0, 1],
    outputRange: [deslocamento, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progresso, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
