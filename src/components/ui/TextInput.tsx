import { type ComponentPropsWithRef, useState } from 'react';
import { DeviceEventEmitter, Keyboard, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { EVENTO_CAMPO_FOCADO } from './ScrollComTeclado';
import { familiaPorPeso, makeStyles, useTheme } from '../../theme';

type TextInputProps = ComponentPropsWithRef<typeof RNTextInput>;

/**
 * Campo de texto padrao: fonte e cores do tema, cursor na cor da marca e
 * borda destacada enquanto o campo esta em foco.
 */
export default function TextInput({
  style,
  onFocus,
  onBlur,
  placeholderTextColor,
  editable,
  ...rest
}: TextInputProps): React.ReactNode {
  const { colors, esquema, fontesCarregadas } = useTheme();
  const styles = useStyles();
  const [focado, setFocado] = useState(false);
  const plano = StyleSheet.flatten(style) ?? {};

  // Mesma regra do `Text`: o peso vira a familia da Inter correspondente.
  const trocarFamilia = fontesCarregadas && plano.fontFamily === undefined;

  return (
    <RNTextInput
      {...rest}
      editable={editable}
      placeholderTextColor={placeholderTextColor ?? colors.placeholder}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      keyboardAppearance={esquema}
      onFocus={(evento): void => {
        setFocado(true);

        // Trocar de campo com o teclado aberto nao gera evento de teclado: a
        // lista precisa ser avisada para rolar ate o novo campo.
        if (Keyboard.isVisible()) {
          DeviceEventEmitter.emit(EVENTO_CAMPO_FOCADO);
        }

        onFocus?.(evento);
      }}
      onBlur={(evento): void => {
        setFocado(false);
        onBlur?.(evento);
      }}
      style={[
        styles.base,
        style,
        trocarFamilia && { fontFamily: familiaPorPeso(plano.fontWeight), fontWeight: undefined },
        focado && editable !== false && styles.focado,
      ]}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    color: colors.text,
  },
  focado: {
    borderColor: colors.primary,
  },
}));
