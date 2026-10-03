import React from 'react';
import {
  type StyleProp,
  type TextInput as RNTextInput,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { TextInput } from './ui';

type BrazilianIntegerInputProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeValue: (value: string) => void;
  decimalScale?: number;
  style?: StyleProp<TextStyle>;
  /** Para focar o campo por codigo (ex.: pular para o proximo preco). */
  ref?: React.Ref<RNTextInput>;
};

const normalizeDigits = (raw: string): string => {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly.replace(/^0+(?=\d)/, '');
};

const toRawNumberString = (rawDigits: string, decimalScale: number): string => {
  if (!rawDigits) {
    return '';
  }

  if (decimalScale <= 0) {
    return rawDigits;
  }

  const value = Number(rawDigits) / 10 ** decimalScale;
  return value.toFixed(decimalScale);
};

const formatBrazilianNumber = (rawNumberString: string, decimalScale: number): string => {
  if (!rawNumberString) {
    return '';
  }

  const normalizedScale = Math.max(0, decimalScale);
  const value = Number(rawNumberString);
  if (!Number.isFinite(value)) {
    return '';
  }

  // Os dígitos são digitados da direita para a esquerda, então todas as casas
  // decimais precisam aparecer; senão zeros à direita somem do texto e se perdem.
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: normalizedScale,
    maximumFractionDigits: normalizedScale,
  }).format(value);
};

export default function BrazilianIntegerInput({
  value,
  onChangeValue,
  decimalScale = 0,
  style,
  ...rest
}: BrazilianIntegerInputProps): React.ReactNode {
  const normalizedScale = Math.max(0, decimalScale);
  const displayValue = formatBrazilianNumber(value, normalizedScale);

  return (
    <TextInput
      {...rest}
      style={style}
      value={displayValue}
      keyboardType="number-pad"
      onChangeText={(text): void => {
        const rawDigits = normalizeDigits(text);
        onChangeValue(toRawNumberString(rawDigits, normalizedScale));
      }}
    />
  );
}
