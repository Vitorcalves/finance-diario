import React from 'react';
import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

type BrazilianIntegerInputProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeValue: (value: string) => void;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  style?: StyleProp<TextStyle>;
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

const formatBrazilianNumber = (
  rawNumberString: string,
  decimalScale: number,
  fixedDecimalScale: boolean,
): string => {
  if (!rawNumberString) {
    return '';
  }

  const normalizedScale = Math.max(0, decimalScale);
  const value = Number(rawNumberString);
  if (!Number.isFinite(value)) {
    return '';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fixedDecimalScale ? normalizedScale : 0,
    maximumFractionDigits: normalizedScale,
  }).format(value);
};

export default function BrazilianIntegerInput({
  value,
  onChangeValue,
  decimalScale = 0,
  fixedDecimalScale = false,
  style,
  ...rest
}: BrazilianIntegerInputProps): React.ReactNode {
  const normalizedScale = Math.max(0, decimalScale);
  const displayValue = formatBrazilianNumber(value, normalizedScale, fixedDecimalScale);

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
