import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, radius, shadows, spacing, useTheme } from '../../theme';
import IconButton from './IconButton';
import ScrollComTeclado from './ScrollComTeclado';
import Text from './Text';

/** Arrasto (em px) ou velocidade a partir dos quais soltar o painel o fecha. */
const ARRASTO_PARA_FECHAR = 110;
const VELOCIDADE_PARA_FECHAR = 1.2;

/**
 * Quanto o teclado cobre do painel, medido pela posicao do teclado na tela.
 *
 * Medir (em vez de usar a altura do teclado) evita somar o espaco duas vezes
 * quando o sistema ja encolheu a janela do modal sozinho.
 */
const useSobreposicaoTeclado = (alturaRaiz: number): number => {
  const [topoTeclado, setTopoTeclado] = useState<number | null>(null);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const aoMostrar = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (evento) =>
      setTopoTeclado(evento.endCoordinates.screenY),
    );
    const aoEsconder = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setTopoTeclado(null),
    );

    return (): void => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, []);

  return topoTeclado === null || alturaRaiz === 0 ? 0 : Math.max(0, alturaRaiz - topoTeclado);
};

type BottomSheetProps = {
  visivel: boolean;
  onFechar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
  /** Fica fixo abaixo do conteudo rolavel (botoes de acao, total). */
  rodape?: ReactNode;
  /** `false` para conteudo curto, que nao precisa de rolagem. */
  rolavel?: boolean;
  /** Chamado depois que a animacao de saida termina e o painel some. */
  aoTerminarDeFechar?: () => void;
};

/**
 * Painel que sobe da parte de baixo da tela. Fecha tocando fora, no X,
 * arrastando a alca para baixo ou com o voltar do Android.
 */
export default function BottomSheet({
  visivel,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  rolavel = true,
  aoTerminarDeFechar,
}: BottomSheetProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();

  const [montado, setMontado] = useState(visivel);
  const [alturaRaiz, setAlturaRaiz] = useState(0);
  const teclado = useSobreposicaoTeclado(alturaRaiz);

  const [progresso] = useState(() => new Animated.Value(0));
  const [arrasto] = useState(() => new Animated.Value(0));

  /** Lida so no fim da animacao de saida, fora do render. */
  const aoTerminarRef = useRef(aoTerminarDeFechar);

  useEffect(() => {
    aoTerminarRef.current = aoTerminarDeFechar;
  }, [aoTerminarDeFechar]);

  // Abrir monta o modal na hora; fechar so desmonta depois da animacao de saida.
  if (visivel && !montado) {
    setMontado(true);
  }

  useEffect(() => {
    if (visivel) {
      arrasto.setValue(0);
      Animated.spring(progresso, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 210,
        mass: 0.9,
      }).start();
      return;
    }

    Animated.timing(progresso, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) {
          setMontado(false);
          aoTerminarRef.current?.();
        }
      },
    );
  }, [visivel, progresso, arrasto]);

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evento, estado) => Math.abs(estado.dy) > 4,
        onPanResponderMove: (_evento, estado) => arrasto.setValue(Math.max(0, estado.dy)),
        onPanResponderRelease: (_evento, estado) => {
          if (estado.dy > ARRASTO_PARA_FECHAR || estado.vy > VELOCIDADE_PARA_FECHAR) {
            onFechar();
            return;
          }

          Animated.spring(arrasto, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(arrasto, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [arrasto, onFechar],
  );

  if (!montado) {
    return null;
  }

  const translateY = Animated.add(
    progresso.interpolate({ inputRange: [0, 1], outputRange: [alturaTela, 0] }),
    arrasto,
  );

  const alturaMaxima = (alturaRaiz || alturaTela) - insets.top - spacing.xl;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onFechar}
    >
      <View
        style={styles.raiz}
        onLayout={(evento): void => setAlturaRaiz(evento.nativeEvent.layout.height)}
      >
        <Animated.View style={[styles.fundo, { opacity: progresso }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.painel,
            {
              maxHeight: alturaMaxima,
              paddingBottom: Math.max(insets.bottom, teclado) + spacing.sm,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...gesto.panHandlers} style={styles.alca}>
            <View style={styles.pegador} />

            {titulo ? (
              <View style={styles.cabecalho}>
                <View style={styles.cabecalhoTexto}>
                  <Text style={sharedStyles.sectionTitle}>{titulo}</Text>
                  {subtitulo ? <Text style={sharedStyles.listCardDetail}>{subtitulo}</Text> : null}
                </View>
                <IconButton
                  icon="close"
                  variant="neutral"
                  size={18}
                  onPress={onFechar}
                  accessibilityLabel="Fechar"
                />
              </View>
            ) : null}
          </View>

          {rolavel ? (
            <ScrollComTeclado
              style={styles.rolagem}
              contentContainerStyle={styles.conteudo}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {children}
            </ScrollComTeclado>
          ) : (
            <View style={styles.conteudo}>{children}</View>
          )}

          {rodape ? <View style={styles.rodape}>{rodape}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  raiz: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fundo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  painel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl + 4,
    borderTopRightRadius: radius.xxl + 4,
    ...shadows.floating,
  },
  alca: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pegador: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cabecalhoTexto: {
    flex: 1,
    gap: 2,
  },
  rolagem: {
    flexGrow: 0,
    flexShrink: 1,
  },
  conteudo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  rodape: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
}));
