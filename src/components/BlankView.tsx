import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sharedStyles } from '../theme';

type BlankViewProps = {
  backgroundColor?: string;
};

export default function BlankView({
  backgroundColor = colors.background,
}: BlankViewProps): React.ReactNode {
  return (
    <SafeAreaView style={[sharedStyles.screen, { backgroundColor }]}>
      <View style={styles.container} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
