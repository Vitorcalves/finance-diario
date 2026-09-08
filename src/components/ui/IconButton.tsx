import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { colors, iconSize, sharedStyles } from '../../theme';

export type IconButtonVariant = 'primary' | 'info' | 'danger';

type IconName = ComponentProps<typeof Ionicons>['name'];

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
};

const containerByVariant = {
  primary: sharedStyles.iconButtonPrimary,
  info: sharedStyles.iconButtonInfo,
  danger: sharedStyles.iconButtonDanger,
};

const colorByVariant: Record<IconButtonVariant, string> = {
  primary: colors.primary,
  info: colors.info,
  danger: colors.dangerStrong,
};

/** Botao de icone das listas (visualizar, editar, remover). */
export default function IconButton({
  icon,
  onPress,
  variant = 'primary',
  size = iconSize.md,
}: IconButtonProps): React.ReactNode {
  return (
    <Pressable style={[sharedStyles.iconButton, containerByVariant[variant]]} onPress={onPress}>
      <Ionicons name={icon} size={size} color={colorByVariant[variant]} />
    </Pressable>
  );
}
