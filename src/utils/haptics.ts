import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Vibracoes curtas de confirmacao.
 *
 * Nenhuma delas pode quebrar o fluxo: sem o modulo nativo (build antigo do app)
 * ou sem suporte no aparelho, a chamada simplesmente nao faz nada.
 */

const ignorar = (): void => undefined;

/** Toque em botao, chip ou item de lista. */
export const vibrarToque = (): void => {
  const vibracao =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  vibracao.catch(ignorar);
};

/** Troca de opcao em seletor (chips, abas, meses). */
export const vibrarSelecao = (): void => {
  const vibracao =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync();

  vibracao.catch(ignorar);
};

/** Acao concluida (lancamento salvo, precos registrados). */
export const vibrarSucesso = (): void => {
  const vibracao =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  vibracao.catch(ignorar);
};

/** Acao destrutiva ou erro de validacao. */
export const vibrarAviso = (): void => {
  const vibracao =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

  vibracao.catch(ignorar);
};
