import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { sharedStyles } from '../../theme';

type KeyboardAvoidingScreenProps = {
  children: ReactNode;
};

/**
 * Envolve a area rolavel de uma tela ou modal que tem campo de texto.
 *
 * Sem isso o teclado sobrepoe o campo focado em vez de empurrar o conteudo -
 * o Android com edge-to-edge nao resolve isso sozinho, por isso o `behavior`
 * e explicito nas duas plataformas em vez de confiar no ajuste automatico.
 */
export default function KeyboardAvoidingScreen({
  children,
}: KeyboardAvoidingScreenProps): React.ReactNode {
  return (
    <KeyboardAvoidingView
      style={sharedStyles.scrollArea}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
