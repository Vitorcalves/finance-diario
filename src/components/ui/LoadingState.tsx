import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../theme';
import Text from './Text';

type LoadingStateProps = {
  message?: string;
};

/** Indicador de carregamento centralizado, usado so na primeira carga da tela. */
export default function LoadingState({ message }: LoadingStateProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();

  return (
    <View style={sharedStyles.centerContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={sharedStyles.emptyHint}>{message}</Text> : null}
    </View>
  );
}
