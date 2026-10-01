import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../theme';

type BlankViewProps = {
  backgroundColor?: string;
};

export default function BlankView({ backgroundColor }: BlankViewProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  return (
    <SafeAreaView
      style={[sharedStyles.screen, { backgroundColor: backgroundColor ?? colors.background }]}
    >
      <View style={styles.container} />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    flex: 1,
  },
}));
