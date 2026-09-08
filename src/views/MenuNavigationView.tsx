import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RootTabParamList } from '../routes/types';
import { recriarDatabase } from '../models/database';
import { ScreenHeader } from '../components/ui';
import { colors, fontSize, fontWeight, iconSize, radius, sharedStyles, spacing } from '../theme';

type MenuNavigation = BottomTabNavigationProp<RootTabParamList, 'Menu'>;

export default function MenuNavigationView(): React.ReactNode {
  const navigation = useNavigation<MenuNavigation>();

  const renderItem = (label: string, onPress: () => void): React.ReactNode => (
    <Pressable style={styles.item} onPress={onPress}>
      <Text style={styles.itemText}>{label}</Text>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textSubtle} />
    </Pressable>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Menu de navegacao" subtitle="Acesse rapidamente cada aba do app." />

      <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.content}>
        {renderItem('Ir para Home', () => navigation.navigate('Home'))}
        {renderItem('Ir para Gastos Mensais', () => navigation.navigate('GastosMensais'))}
        {renderItem('Ir para Produtos', () => navigation.navigate('Produtos'))}
        {renderItem('Ir para Categorias', () =>
          navigation.navigate('Menu', { screen: 'Categorias' }),
        )}
        {renderItem('Ir para Empresas', () => navigation.navigate('Menu', { screen: 'Empresas' }))}
        {renderItem('Ir para Marcas', () => navigation.navigate('Menu', { screen: 'Marcas' }))}
        {renderItem('Ir para Historico de Precos', () =>
          navigation.navigate('Menu', { screen: 'HistoricoPrecos' }),
        )}
        {renderItem('Ir para Orcamento', () =>
          navigation.navigate('Menu', { screen: 'Orcamento' }),
        )}

        <Pressable
          style={[styles.item, styles.itemDanger]}
          onPress={() => {
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
          }}
        >
          <Text style={[styles.itemText, styles.itemTextDanger]}>Recriar Banco de Dados</Text>
          <Ionicons name="trash" size={iconSize.sm} color={colors.danger} />
        </Pressable>

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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemText: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textBody,
  },
  spacer: {
    height: spacing.sm,
  },
  itemDanger: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerBorder,
  },
  itemTextDanger: {
    color: colors.danger,
  },
});
