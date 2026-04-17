import { SafeAreaView, StyleSheet, View } from 'react-native';

type BlankViewProps = {
  backgroundColor?: string;
};

export default function BlankView({ backgroundColor = '#ffffff' }: BlankViewProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}> 
      <View style={styles.container} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
