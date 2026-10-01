import { useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { vibrarToque } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala no toque; 0.97 nos botoes, um pouco menos nos cartoes grandes. */
  escala?: number;
  /** Vibracao curta ao confirmar o toque. */
  vibrar?: boolean;
};

/**
 * Area tocavel com resposta visual: encolhe e esmaece levemente enquanto o
 * dedo esta pressionando. Base de botoes, cartoes e itens de menu.
 */
export default function PressableScale({
  style,
  escala = 0.97,
  vibrar = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: PressableScaleProps): React.ReactNode {
  const [progresso] = useState(() => new Animated.Value(0));

  const animar = (valor: number): void => {
    Animated.spring(progresso, {
      toValue: valor,
      useNativeDriver: true,
      speed: 40,
      bounciness: valor === 0 ? 6 : 0,
    }).start();
  };

  const escalaAnimada = progresso.interpolate({ inputRange: [0, 1], outputRange: [1, escala] });
  const opacidade = progresso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(evento: GestureResponderEvent): void => {
        animar(1);
        onPressIn?.(evento);
      }}
      onPressOut={(evento: GestureResponderEvent): void => {
        animar(0);
        onPressOut?.(evento);
      }}
      onPress={(evento: GestureResponderEvent): void => {
        if (vibrar) {
          vibrarToque();
        }

        onPress?.(evento);
      }}
      style={[style, { opacity: opacidade, transform: [{ scale: escalaAnimada }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
