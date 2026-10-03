import { useCallback, useEffect, useRef } from 'react';
import {
  DeviceEventEmitter,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  type ScrollViewProps,
  TextInput as RNTextInput,
} from 'react-native';

/** Elemento nativo medido na tela (campo, lista aberta de um seletor...). */
type Elemento = NonNullable<ReturnType<typeof RNTextInput.State.currentlyFocusedInput>>;

/** Evento emitido pelo `TextInput` do app ao ganhar foco com o teclado ja aberto. */
export const EVENTO_CAMPO_FOCADO = 'finance-diario:campo-focado';

/** Pede para a rolagem que contem o elemento deixa-lo inteiro a vista. */
const EVENTO_MOSTRAR_ELEMENTO = 'finance-diario:mostrar-elemento';

/** Folga entre o elemento e a borda de baixo da area visivel. */
const MARGEM = 24;

/**
 * Espera o layout reagir ao teclado (o painel ganha recuo, a tela encolhe)
 * antes de medir a posicao do elemento.
 */
export const ESPERA_LAYOUT = Platform.OS === 'ios' ? 280 : 120;

/**
 * Campo -> elemento que deve aparecer quando ele ganha foco. Na busca de um
 * seletor, o que importa e a lista de opcoes abaixo dela, e nao so o campo.
 */
export const alvoDoCampo = new WeakMap<Elemento, Elemento>();

/**
 * Faz a rolagem que contem `elemento` rolar ate ele aparecer inteiro - usado,
 * por exemplo, quando um seletor abre a lista de opcoes abaixo do campo.
 */
export const mostrarNaRolagem = (elemento: Elemento | null | undefined): void => {
  if (elemento) {
    DeviceEventEmitter.emit(EVENTO_MOSTRAR_ELEMENTO, elemento);
  }
};

/**
 * ScrollView que garante que o campo em foco fique visivel acima do teclado.
 *
 * Encolher a tela (KeyboardAvoidingView) ou dar recuo ao painel nao basta: a
 * rolagem continua onde estava e o campo, se estava mais abaixo, segue coberto
 * pelo teclado ou pelo rodape fixo. Aqui, quando o teclado abre, quando o
 * foco muda de campo com ele aberto ou quando um elemento pede para aparecer,
 * a lista rola so o necessario.
 */
export default function ScrollComTeclado({
  onScroll,
  scrollEventThrottle,
  keyboardShouldPersistTaps = 'handled',
  children,
  ...rest
}: ScrollViewProps): React.ReactNode {
  const ref = useRef<ScrollView>(null);
  const deslocamento = useRef(0);

  const garantirVisivel = useCallback((elemento: Elemento): void => {
    const rolagem = ref.current?.getNativeScrollRef();

    if (!rolagem) {
      return;
    }

    // So rola se o elemento estiver dentro desta lista: telas escondidas
    // (outras abas) tambem ficam montadas e nao devem se mexer.
    elemento.measureLayout(
      rolagem,
      () => {
        rolagem.measureInWindow((_rx, topoLista, _rl, alturaLista) => {
          elemento.measureInWindow((_x, topo, _largura, altura) => {
            // A area util termina no que vier primeiro: o fim da lista (acima de
            // um rodape fixo) ou o topo do teclado.
            const teclado = Keyboard.isVisible() ? Keyboard.metrics()?.screenY : undefined;
            const limite = Math.min(topoLista + alturaLista, teclado ?? Infinity) - MARGEM;
            const excesso = topo + altura - limite;

            if (excesso <= 0) {
              return;
            }

            // Elemento maior que a area visivel: alinha o topo dele, sem passar.
            const ate = Math.min(excesso, topo - topoLista - MARGEM);

            if (ate > 0) {
              ref.current?.scrollTo({ y: deslocamento.current + ate, animated: true });
            }
          });
        });
      },
      () => undefined,
    );
  }, []);

  useEffect(() => {
    const evento = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    let timer: ReturnType<typeof setTimeout> | undefined;

    const agendar = (elemento: Elemento | null): void => {
      if (!elemento) {
        return;
      }

      const alvo = alvoDoCampo.get(elemento) ?? elemento;
      clearTimeout(timer);
      timer = setTimeout(() => garantirVisivel(alvo), ESPERA_LAYOUT);
    };

    const aoAbrirTeclado = Keyboard.addListener(evento, () =>
      agendar(RNTextInput.State.currentlyFocusedInput()),
    );
    const aoFocarCampo = DeviceEventEmitter.addListener(EVENTO_CAMPO_FOCADO, () =>
      agendar(RNTextInput.State.currentlyFocusedInput()),
    );
    const aoPedirElemento = DeviceEventEmitter.addListener(
      EVENTO_MOSTRAR_ELEMENTO,
      (elemento: Elemento) => agendar(elemento),
    );

    return (): void => {
      clearTimeout(timer);
      aoAbrirTeclado.remove();
      aoFocarCampo.remove();
      aoPedirElemento.remove();
    };
  }, [garantirVisivel]);

  return (
    <ScrollView
      {...rest}
      ref={ref}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      onScroll={(evento: NativeSyntheticEvent<NativeScrollEvent>): void => {
        deslocamento.current = evento.nativeEvent.contentOffset.y;
        onScroll?.(evento);
      }}
    >
      {children}
    </ScrollView>
  );
}
