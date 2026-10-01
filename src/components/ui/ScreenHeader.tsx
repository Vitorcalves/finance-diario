import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { iconSize, useTheme } from '../../theme';
import PressableScale from './PressableScale';
import Text from './Text';

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

/** Cabecalho padrao de todas as telas: titulo grande, voltar opcional e acao a direita. */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backIcon = 'arrow-back',
  onAdd,
  right,
}: ScreenHeaderProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();

  const renderRight = (): React.ReactNode => {
    if (right) {
      return right;
    }

    if (onAdd) {
      return (
        <PressableScale
          style={[sharedStyles.headerAction, { backgroundColor: colors.primary }]}
          onPress={onAdd}
          escala={0.9}
          vibrar
          accessibilityRole="button"
          accessibilityLabel="Adicionar"
        >
          <Ionicons name="add" size={iconSize.lg} color={colors.onPrimary} />
        </PressableScale>
      );
    }

    return null;
  };

  return (
    <View style={sharedStyles.headerBar}>
      {onBack ? (
        <PressableScale
          style={sharedStyles.headerAction}
          onPress={onBack}
          escala={0.9}
          accessibilityRole="button"
          accessibilityLabel={backIcon === 'close' ? 'Fechar' : 'Voltar'}
        >
          <Ionicons name={backIcon} size={iconSize.md} color={colors.textStrong} />
        </PressableScale>
      ) : null}

      <View style={sharedStyles.headerContent}>
        <Text style={sharedStyles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={sharedStyles.headerSubtitle}>{subtitle}</Text> : null}
      </View>

      <View style={sharedStyles.headerSlot}>{renderRight()}</View>
    </View>
  );
}
