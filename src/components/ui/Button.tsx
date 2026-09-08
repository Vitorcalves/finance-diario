import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { sharedStyles } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Ocupa o espaco disponivel quando dentro de uma linha de acoes. */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
};

const containerByVariant: Record<ButtonVariant, StyleProp<ViewStyle>> = {
  primary: sharedStyles.buttonPrimary,
  secondary: sharedStyles.buttonSecondary,
  danger: sharedStyles.buttonDanger,
};

const textByVariant = {
  primary: sharedStyles.buttonTextPrimary,
  secondary: sharedStyles.buttonTextSecondary,
  danger: sharedStyles.buttonTextDanger,
};

/** Botao padrao do app nas tres variantes de uso. */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  flex = false,
  style,
}: ButtonProps): React.ReactNode {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        sharedStyles.buttonBase,
        containerByVariant[variant],
        flex && sharedStyles.buttonFlex,
        disabled && sharedStyles.buttonDisabled,
        style,
      ]}
    >
      <Text style={textByVariant[variant]}>{label}</Text>
    </Pressable>
  );
}
