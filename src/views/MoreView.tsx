import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function MoreView() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Mais funcionalidades</Text>
        <Text style={styles.subtitle}>
          Esta tela e um placeholder para futuras features como categorias, relatorios e metas.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0b3d2e',
  },
  subtitle: {
    fontSize: 16,
    color: '#3e4b46',
    lineHeight: 22,
  },
});
