import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootTabParamList } from '../routes/types';

type MenuNavigation = BottomTabNavigationProp<RootTabParamList, 'Menu'>;

export default function MenuNavigationView(): React.ReactNode {
  const navigation = useNavigation<MenuNavigation>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Menu de navegacao</Text>
        <Text style={styles.subtitle}>Acesse rapidamente cada aba do app.</Text>

        <Pressable style={styles.item} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.itemText}>Ir para Home</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigation.navigate('GastosMensais')}>
          <Text style={styles.itemText}>Ir para Gastos Mensais</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigation.navigate('Produtos')}>
          <Text style={styles.itemText}>Ir para Produtos</Text>
        </Pressable>

        <Pressable
          style={styles.item}
          onPress={() => navigation.navigate('Menu', { screen: 'Categorias' })}
        >
          <Text style={styles.itemText}>Ir para Categorias</Text>
        </Pressable>
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
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0b3d2e',
  },
  subtitle: {
    fontSize: 15,
    color: '#3e4b46',
    marginBottom: 6,
  },
  item: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d6dfdb',
  },
  itemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17342b',
  },
});
