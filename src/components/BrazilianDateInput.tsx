import { useState } from 'react';
import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

type BrazilianDateInputProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  defaultValue?: string;
  onChangeValue: (value: string) => void;
  style?: StyleProp<TextStyle>;
};

const toBrazilianDate = (isoDate: string): string => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const formatDateDigits = (digits: string): string => {
  const limited = digits.slice(0, 8);
  const day = limited.slice(0, 2);
  const month = limited.slice(2, 4);
  const year = limited.slice(4, 8);

  if (limited.length <= 2) {
    return day;
  }

  if (limited.length <= 4) {
    return `${day}/${month}`;
  }

  return `${day}/${month}/${year}`;
};

const toIsoDate = (formattedDate: string): string => {
  const match = formattedDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return '';
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  if (!isValidDate) {
    return '';
  }

  return `${yearText}-${monthText}-${dayText}`;
};

export default function BrazilianDateInput({
  defaultValue = '',
  onChangeValue,
  style,
  ...rest
}: BrazilianDateInputProps): React.ReactNode {
  const [displayValue, setDisplayValue] = useState(toBrazilianDate(defaultValue));

  return (
    <TextInput
      {...rest}
      style={style}
      value={displayValue}
      keyboardType="number-pad"
      onChangeText={(text): void => {
        const digits = text.replace(/\D/g, '');
        const formatted = formatDateDigits(digits);
        setDisplayValue(formatted);
        onChangeValue(toIsoDate(formatted));
      }}
    />
  );
}
