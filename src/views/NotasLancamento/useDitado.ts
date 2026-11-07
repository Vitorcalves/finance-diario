import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';

type ModuloFala = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let moduloCarregado: ModuloFala | null | undefined;

/**
 * Reconhecedor de fala do proprio celular (SpeechRecognizer do Android, Speech
 * do iOS), via `expo-speech-recognition`.
 *
 * Carregado sob demanda: num build feito antes da biblioteca entrar, o modulo
 * nativo nao existe e o `import` direto derrubaria o app inteiro. Assim so o
 * botao de ditar some.
 */
const moduloFala = (): ModuloFala | null => {
  if (moduloCarregado === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = require('expo-speech-recognition') as typeof import('expo-speech-recognition');
      moduloCarregado = lib.ExpoSpeechRecognitionModule;
    } catch {
      moduloCarregado = null;
    }
  }

  return moduloCarregado;
};

/** Texto mostrado para cada falha do reconhecedor; `null` = nao avisar. */
export const mensagemErroFala = (codigo: ExpoSpeechRecognitionErrorCode): string | null => {
  switch (codigo) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'Permita o uso do microfone para ditar a nota.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Não ouvi nada. Toque no microfone e fale de novo.';
    case 'network':
      return 'O reconhecimento de voz deste celular precisa de internet.';
    case 'language-not-supported':
      return 'O reconhecimento de voz do celular não tem o português instalado.';
    case 'service-not-allowed':
      return 'O celular não tem um serviço de reconhecimento de voz ativo.';
    case 'busy':
      return 'O reconhecimento de voz está ocupado. Tente de novo.';
    default:
      return 'Não foi possível ouvir. Tente de novo.';
  }
};

export type UseDitado = {
  /** `false` quando o build nao tem o modulo nativo. */
  disponivel: boolean;
  ouvindo: boolean;
  /** O que o reconhecedor ja entendeu, enquanto a pessoa ainda fala. */
  parcial: string;
  iniciar: () => void;
  parar: () => void;
};

/**
 * Dita uma frase: `onTexto` recebe o texto final; `onErro`, a mensagem de
 * falha ja pronta para mostrar.
 */
export function useDitado(
  onTexto: (texto: string) => void,
  onErro: (mensagem: string) => void,
): UseDitado {
  const modulo = moduloFala();
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState('');

  // Os ouvintes sao registrados uma vez; as funcoes mais novas ficam no ref.
  const callbacks = useRef({ onTexto, onErro });
  useEffect(() => {
    callbacks.current = { onTexto, onErro };
  }, [onTexto, onErro]);

  useEffect(() => {
    if (!modulo) {
      return undefined;
    }

    const inscricoes = [
      modulo.addListener('start', () => setOuvindo(true)),
      modulo.addListener('end', () => {
        setOuvindo(false);
        setParcial('');
      }),
      modulo.addListener('result', (evento) => {
        const texto = evento.results[0]?.transcript.trim() ?? '';

        if (!evento.isFinal) {
          setParcial(texto);
          return;
        }

        setParcial('');
        if (texto) {
          callbacks.current.onTexto(texto);
        }
      }),
      modulo.addListener('error', (evento) => {
        setOuvindo(false);
        setParcial('');
        const mensagem = mensagemErroFala(evento.error);
        if (mensagem) {
          callbacks.current.onErro(mensagem);
        }
      }),
    ];

    return (): void => {
      inscricoes.forEach((inscricao) => inscricao.remove());
      // Sair da tela no meio da fala nao deixa o microfone ligado.
      modulo.abort();
    };
  }, [modulo]);

  const iniciar = useCallback((): void => {
    if (!modulo) {
      return;
    }

    void (async (): Promise<void> => {
      try {
        if (!modulo.isRecognitionAvailable()) {
          callbacks.current.onErro(mensagemErroFala('service-not-allowed') ?? '');
          return;
        }

        // O tipo da biblioteca vem de `expo-modules-core`, que no SDK 58 fica
        // dentro de `expo` e nao resolve daqui (viraria `any`): so o `granted` importa.
        const permissao = (await modulo.requestPermissionsAsync()) as { granted: boolean };

        if (!permissao.granted) {
          callbacks.current.onErro(mensagemErroFala('not-allowed') ?? '');
          return;
        }

        setParcial('');
        setOuvindo(true);
        modulo.start({
          lang: 'pt-BR',
          interimResults: true,
          continuous: false,
          maxAlternatives: 1,
        });
      } catch (error: unknown) {
        console.error('Erro ao iniciar o ditado', error);
        setOuvindo(false);
        callbacks.current.onErro(mensagemErroFala('unknown') ?? '');
      }
    })();
  }, [modulo]);

  const parar = useCallback((): void => {
    modulo?.stop();
  }, [modulo]);

  return { disponivel: modulo !== null, ouvindo, parcial, iniciar, parar };
}
