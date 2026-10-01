import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../theme';
import { vibrarAviso, vibrarSucesso } from '../../utils/haptics';
import Text from './Text';

export type TipoToast = 'sucesso' | 'erro' | 'info';

export type OpcoesToast = {
  tipo?: TipoToast;
  /** Botao a direita da mensagem, como "Desfazer". */
  acao?: { rotulo: string; onPress: () => void };
  /** Tempo na tela em ms; com acao o padrao e maior, para dar tempo de tocar. */
  duracao?: number;
};

type ToastAtual = OpcoesToast & { id: number; mensagem: string };

type ContextoToast = {
  mostrar: (mensagem: string, opcoes?: OpcoesToast) => void;
};

const Contexto = createContext<ContextoToast>({ mostrar: () => undefined });

/** Aviso rapido no topo da tela, que nao bloqueia o uso do app. */
export const useToast = (): ContextoToast => useContext(Contexto);

const ICONE: Record<TipoToast, React.ComponentProps<typeof Ionicons>['name']> = {
  sucesso: 'checkmark-circle',
  erro: 'alert-circle',
  info: 'information-circle',
};

/** Mantem um aviso por vez; um novo substitui o que estiver na tela. */
export function ToastProvider({ children }: { children: ReactNode }): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastAtual | null>(null);
  const [progresso] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proximoId = useRef(0);

  const esconder = useCallback((): void => {
    Animated.timing(progresso, { toValue: 0, duration: 180, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) {
          setToast(null);
        }
      },
    );
  }, [progresso]);

  const mostrar = useCallback(
    (mensagem: string, opcoes: OpcoesToast = {}): void => {
      if (timer.current) {
        clearTimeout(timer.current);
      }

      const tipo = opcoes.tipo ?? 'sucesso';

      if (tipo === 'erro') {
        vibrarAviso();
      } else if (tipo === 'sucesso') {
        vibrarSucesso();
      }

      proximoId.current += 1;
      setToast({ ...opcoes, tipo, mensagem, id: proximoId.current });
      progresso.setValue(0);
      Animated.spring(progresso, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 6,
      }).start();

      timer.current = setTimeout(esconder, opcoes.duracao ?? (opcoes.acao ? 5000 : 2800));
    },
    [esconder, progresso],
  );

  useEffect(
    () => (): void => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  const translateY = progresso.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });
  const tipo = toast?.tipo ?? 'sucesso';
  const corIcone: Record<TipoToast, string> = {
    sucesso: colors.success,
    erro: colors.danger,
    info: colors.info,
  };

  return (
    <Contexto.Provider value={valor}>
      {children}

      {toast && (
        <View pointerEvents="box-none" style={[styles.camada, { top: insets.top + spacing.sm }]}>
          <Animated.View
            key={toast.id}
            accessibilityLiveRegion="polite"
            style={[styles.toast, { opacity: progresso, transform: [{ translateY }] }]}
          >
            <Ionicons name={ICONE[tipo]} size={iconSize.md} color={corIcone[tipo]} />
            <Text style={styles.mensagem} numberOfLines={2}>
              {toast.mensagem}
            </Text>
            {toast.acao && (
              <Pressable
                hitSlop={spacing.sm}
                accessibilityRole="button"
                onPress={(): void => {
                  toast.acao?.onPress();
                  esconder();
                }}
              >
                <Text style={styles.acao}>{toast.acao.rotulo}</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </Contexto.Provider>
  );
}

const useStyles = makeStyles((colors) => ({
  camada: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.floating,
  },
  mensagem: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  acao: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
}));
