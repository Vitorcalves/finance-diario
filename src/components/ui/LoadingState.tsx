import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors, sharedStyles } from '../../theme';

type LoadingStateProps = {
  message?: string;
};

/** Indicador de carregamento centralizado, usado enquanto a tela busca dados. */
export default function LoadingState({ message }: LoadingStateProps): React.ReactNode {
  return (
    <View style={sharedStyles.centerContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={sharedStyles.emptyHint}>{message}</Text> : null}
    </View>
  );
}
