import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import Button from './Button';
import { colors, iconSize, sharedStyles } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type EmptyStateProps = {
  icon?: IconName;
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Estado vazio padrao: icone, mensagem, dica opcional e acao opcional. */
export default function EmptyState({
  icon,
  message,
  hint,
  actionLabel,
  onAction,
}: EmptyStateProps): React.ReactNode {
  return (
    <View style={sharedStyles.centerContent}>
      {icon ? <Ionicons name={icon} size={iconSize.empty} color={colors.textSubtle} /> : null}
      <Text style={sharedStyles.emptyText}>{message}</Text>
      {hint ? <Text style={sharedStyles.emptyHint}>{hint}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
