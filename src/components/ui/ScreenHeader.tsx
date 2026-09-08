import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { colors, iconSize, sharedStyles } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Quando informado, exibe a seta de voltar a esquerda do titulo. */
  onBack?: () => void;
  /** Icone do botao a esquerda: `arrow-back` nas telas, `close` nos modais. */
  backIcon?: IconName;
  /** Atalho para o botao "+" a direita do titulo. */
  onAdd?: () => void;
  /** Conteudo livre a direita (tem prioridade sobre `onAdd`). */
  right?: React.ReactNode;
};

/** Cabecalho padrao de todas as telas: titulo, voltar opcional e acao a direita. */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backIcon = 'arrow-back',
  onAdd,
  right,
}: ScreenHeaderProps): React.ReactNode {
  const renderRight = (): React.ReactNode => {
    if (right) {
      return right;
    }

    if (onAdd) {
      return (
        <Pressable style={sharedStyles.headerAction} onPress={onAdd}>
          <Ionicons name="add-circle" size={iconSize.xxl} color={colors.primary} />
        </Pressable>
      );
    }

    return null;
  };

  return (
    <View style={sharedStyles.headerBar}>
      {onBack ? (
        <Pressable style={sharedStyles.headerAction} onPress={onBack}>
          <Ionicons name={backIcon} size={iconSize.xl} color={colors.primaryDark} />
        </Pressable>
      ) : null}

      <View style={sharedStyles.headerContent}>
        <Text style={sharedStyles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={sharedStyles.headerSubtitle}>{subtitle}</Text> : null}
      </View>

      <View style={sharedStyles.headerSlot}>{renderRight()}</View>
    </View>
  );
}
