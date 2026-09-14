import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import { recriarDatabase } from '../../models/database';
import { getLocalPadrao, saveLocalPadrao } from '../../models/settingsModel';
import type { MenuStackParamList, RootTabParamList } from '../../routes/types';
import { sharedStyles, spacing } from '../../theme';
import { Locais } from '../../utils/local';
import MenuGrupo from './components/MenuGrupo';
import PreferenciasCard from './components/PreferenciasCard';

type MenuNavigation = BottomTabNavigationProp<RootTabParamList, 'Menu'>;

/** Menu de navegacao com atalhos para as abas e os cadastros, agrupados em sanfona. */
export default function MenuNavigationView(): React.ReactNode {
  const navigation = useNavigation<MenuNavigation>();
  const [localPadrao, setLocalPadrao] = useState(Locais.padrao);

  useFocusEffect(
    useCallback(() => {
      void getLocalPadrao().then(setLocalPadrao);
    }, []),
  );

  const alterarLocalPadrao = (id: number): void => {
    setLocalPadrao(id);
    void saveLocalPadrao(id);
  };

  const irPara = (screen: keyof MenuStackParamList): void =>
    navigation.navigate('Menu', { screen });

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
        <MenuGrupo
          titulo="Principal"
          icone="home-outline"
          aberturaInicial
          itens={[
            { label: 'Home', onPress: (): void => navigation.navigate('Home') },
            {
              label: 'Gastos Mensais',
              onPress: (): void => navigation.navigate('GastosMensais'),
            },
            { label: 'Produtos', onPress: (): void => navigation.navigate('Produtos') },
            { label: 'Dashboard', onPress: (): void => navigation.navigate('Dashboard') },
          ]}
        />

        <MenuGrupo
          titulo="Cadastros"
          icone="pricetags-outline"
          itens={[
            { label: 'Categorias', onPress: (): void => irPara('Categorias') },
            { label: 'Marcas', onPress: (): void => irPara('Marcas') },
            { label: 'Empresas', onPress: (): void => irPara('Empresas') },
          ]}
        />

        <MenuGrupo
          titulo="Analises"
          icone="stats-chart-outline"
          itens={[
            { label: 'Historico de Precos', onPress: (): void => irPara('HistoricoPrecos') },
            { label: 'Orcamento', onPress: (): void => irPara('Orcamento') },
          ]}
        />

        <MenuGrupo
          titulo="Financeiro"
          icone="card-outline"
          itens={[{ label: 'Assinaturas e Parcelas', onPress: (): void => irPara('Planos') }]}
        />

        <MenuGrupo
          titulo="Sistema"
          icone="settings-outline"
          itens={[
            { label: 'Integracao (backup JSON e API)', onPress: (): void => irPara('Integracao') },
            {
              label: 'Recriar Banco de Dados',
              icone: 'trash',
              perigo: true,
              onPress: confirmarRecriacaoDoBanco,
            },
          ]}
        />

        <PreferenciasCard localPadrao={localPadrao} onAlterarLocalPadrao={alterarLocalPadrao} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
});
