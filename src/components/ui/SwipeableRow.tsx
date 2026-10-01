import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { fontSize, fontWeight, iconSize, makeStyles, useTheme } from '../../theme';
import { vibrarSelecao } from '../../utils/haptics';
import Text from './Text';

const LARGURA_ACAO = 76;

export type AcaoDeslize = {
  rotulo: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  tipo: 'danger' | 'info' | 'primary';
  onPress: () => void;
};

type SwipeableRowProps = {
  acoes: AcaoDeslize[];
  children: ReactNode;
  /** Estilo do contorno da linha (cantos arredondados, margens). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Linha que revela acoes ao ser arrastada para a esquerda (padrao de lista do
 * iOS e do Gmail). Tocar na linha aberta a fecha.
 */
export default function SwipeableRow({
  acoes,
  children,
  style,
}: SwipeableRowProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const [deslocamento] = useState(() => new Animated.Value(0));
  const [aberta, setAberta] = useState(false);
  const larguraAcoes = LARGURA_ACAO * acoes.length;
  /** Onde a linha estava quando o dedo encostou: fechada (0) ou aberta. */
  const inicio = aberta ? -larguraAcoes : 0;

  const animarPara = useCallback(
    (destino: number): void => {
      const abrindo = destino !== 0;

      if (abrindo && !aberta) {
        vibrarSelecao();
      }

      setAberta(abrindo);
      Animated.spring(deslocamento, {
        toValue: destino,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [deslocamento, aberta],
  );

  // Recriado quando a linha abre ou fecha, para o gesto partir da posicao certa.
  const gesto = useMemo(
    () =>
      PanResponder.create({
        // So reage a arrasto claramente horizontal: o vertical continua sendo da lista.
        onMoveShouldSetPanResponder: (_evento, estado) =>
          Math.abs(estado.dx) > 12 && Math.abs(estado.dx) > Math.abs(estado.dy) * 1.5,
        onPanResponderMove: (_evento, estado) => {
          const x = Math.min(0, Math.max(-larguraAcoes - 24, inicio + estado.dx));
          deslocamento.setValue(x);
        },
        onPanResponderRelease: (_evento, estado) => {
          const x = inicio + estado.dx;
          const abrir = (x < -larguraAcoes / 2 || estado.vx < -0.6) && estado.vx < 0.6;
          animarPara(abrir ? -larguraAcoes : 0);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => animarPara(0),
      }),
    [deslocamento, larguraAcoes, inicio, animarPara],
  );

  const corDoTipo: Record<AcaoDeslize['tipo'], string> = {
    danger: colors.danger,
    info: colors.info,
    primary: colors.primary,
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.acoes}>
        {acoes.map((acao) => (
          <Pressable
            key={acao.rotulo}
            style={[styles.acao, { backgroundColor: corDoTipo[acao.tipo] }]}
            accessibilityRole="button"
            accessibilityLabel={acao.rotulo}
            onPress={(): void => {
              animarPara(0);
              acao.onPress();
            }}
          >
            <Ionicons name={acao.icone} size={iconSize.md} color={colors.onPrimary} />
            <Text style={styles.acaoTexto}>{acao.rotulo}</Text>
          </Pressable>
        ))}
      </View>

      <Animated.View
        {...gesto.panHandlers}
        style={[styles.frente, { transform: [{ translateX: deslocamento }] }]}
      >
        {children}

        {/* Com a linha aberta, o primeiro toque so fecha, sem acionar o conteudo. */}
        {aberta && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(): void => animarPara(0)}
            accessibilityLabel="Fechar ações"
          />
        )}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  acoes: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'row',
  },
  acao: {
    width: LARGURA_ACAO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  acaoTexto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },
  frente: {
    backgroundColor: colors.surface,
  },
}));
