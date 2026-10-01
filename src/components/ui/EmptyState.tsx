import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { makeStyles, radius, useTheme } from '../../theme';
import Aparecer from './Aparecer';
import Button from './Button';
import Text from './Text';

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
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();

  return (
    <Aparecer style={sharedStyles.centerContent}>
      {icon ? (
        <View style={styles.icone}>
          <Ionicons name={icon} size={40} color={colors.primary} />
        </View>
      ) : null}
      <Text style={sharedStyles.emptyText}>{message}</Text>
      {hint ? <Text style={sharedStyles.emptyHint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="add" onPress={onAction} />
      ) : null}
    </Aparecer>
  );
}

const useStyles = makeStyles((colors) => ({
  icone: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
