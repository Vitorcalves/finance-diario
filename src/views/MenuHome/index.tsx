import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import { recriarDatabase } from '../../models/database';
import type { MenuStackParamList, RootTabParamList } from '../../routes/types';
import { sharedStyles, spacing } from '../../theme';
import MenuItem from './components/MenuItem';

type MenuNavigation = BottomTabNavigationProp<RootTabParamList, 'Menu'>;

/** Telas do MenuStack alcancadas por esta tela. */
const TELAS_DO_MENU: { label: string; screen: keyof MenuStackParamList }[] = [
  { label: 'Ir para Categorias', screen: 'Categorias' },
  { label: 'Ir para Empresas', screen: 'Empresas' },
  { label: 'Ir para Marcas', screen: 'Marcas' },
  { label: 'Ir para Historico de Precos', screen: 'HistoricoPrecos' },
  { label: 'Ir para Orcamento', screen: 'Orcamento' },
];

/** Menu de navegacao com atalhos para as abas e os cadastros. */
export default function MenuNavigationView(): React.ReactNode {
  const navigation = useNavigation<MenuNavigation>();

  const confirmarRecriacaoDoBanco = (): void => {
    Alert.alert(
      'Recriar Banco de Dados',
      'Todos os dados serão apagados permanentemente. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: (): void => void recriarDatabase(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Menu de navegacao" subtitle="Acesse rapidamente cada aba do app." />

      <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.content}>
        <MenuItem label="Ir para Home" onPress={(): void => navigation.navigate('Home')} />
        <MenuItem
          label="Ir para Gastos Mensais"
          onPress={(): void => navigation.navigate('GastosMensais')}
        />
        <MenuItem label="Ir para Produtos" onPress={(): void => navigation.navigate('Produtos')} />

        {TELAS_DO_MENU.map((item) => (
          <MenuItem
            key={item.screen}
            label={item.label}
            onPress={(): void => navigation.navigate('Menu', { screen: item.screen })}
          />
        ))}

        <MenuItem
          label="Recriar Banco de Dados"
          icone="trash"
          perigo
          onPress={confirmarRecriacaoDoBanco}
        />

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  spacer: {
    height: spacing.sm,
  },
});
