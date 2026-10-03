import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, useToast } from '../../components/ui';
import { recriarDatabase } from '../../models/database';
import { getLocalPadrao, saveLocalPadrao } from '../../models/settingsModel';
import type { MenuStackParamList, RootTabParamList } from '../../routes/types';
import { makeStyles, spacing, useTheme } from '../../theme';
import { Locais } from '../../utils/local';
import MenuGrupo from './components/MenuGrupo';
import PreferenciasCard from './components/PreferenciasCard';

type MenuNavigation = BottomTabNavigationProp<RootTabParamList, 'Menu'>;

/** Menu do app: cadastros, financeiro, preferencias e sistema. */
export default function MenuNavigationView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const navigation = useNavigation<MenuNavigation>();
  const [localPadrao, setLocalPadrao] = useState(Locais.padrao);

  useFocusEffect(
    useCallback(() => {
      void getLocalPadrao().then(setLocalPadrao);
    }, []),
  );

  const alterarLocalPadrao = (id: number): void => {
    setLocalPadrao(id);
    saveLocalPadrao(id).catch((error: unknown) => {
      console.error('Erro ao salvar o local padrao', error);
      Alert.alert('Erro', 'Não foi possível salvar o local padrão');
    });
  };

  const irPara = (screen: keyof MenuStackParamList): void =>
    navigation.navigate('Menu', { screen });

  const recriarBanco = (): void => {
    void (async (): Promise<void> => {
      try {
        await recriarDatabase();
        toast.mostrar('Banco de dados recriado. Todos os dados foram apagados.');
      } catch (error: unknown) {
        console.error('Erro ao recriar o banco de dados', error);
        Alert.alert(
          'Erro',
          'Não foi possível recriar o banco de dados. Feche e abra o app antes de tentar de novo.',
        );
      }
    })();
  };

  const confirmarRecriacaoDoBanco = (): void => {
    Alert.alert(
      'Recriar banco de dados',
      'Todos os lançamentos, produtos e cadastros serão apagados permanentemente. Exporte um backup antes, na tela de Integração. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar tudo', style: 'destructive', onPress: recriarBanco },
      ],
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Menu" subtitle="Cadastros, preferências e sistema" />

      <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.content}>
        <MenuGrupo
          titulo="Cadastros"
          itens={[
            {
              label: 'Categorias de lançamento',
              descricao: 'Mercado, Transporte, Lazer... para ver onde o dinheiro vai',
              icone: 'pie-chart-outline',
              onPress: (): void => irPara('CategoriasLancamento'),
            },
            {
              label: 'Categorias de produto',
              descricao: 'Agrupe os produtos por tipo',
              icone: 'pricetag-outline',
              onPress: (): void => irPara('Categorias'),
            },
            {
              label: 'Marcas',
              descricao: 'Usadas nas variantes de produto',
              icone: 'ribbon-outline',
              onPress: (): void => irPara('Marcas'),
            },
            {
              label: 'Empresas',
              descricao: 'Mercados e lojas onde você compra',
              icone: 'storefront-outline',
              onPress: (): void => irPara('Empresas'),
            },
          ]}
        />

        <MenuGrupo
          titulo="Financeiro"
          itens={[
            {
              label: 'Assinaturas e parcelas',
              descricao: 'Gastos que se repetem todo mês',
              icone: 'repeat-outline',
              onPress: (): void => irPara('Planos'),
            },
          ]}
        />

        <PreferenciasCard localPadrao={localPadrao} onAlterarLocalPadrao={alterarLocalPadrao} />

        <MenuGrupo
          titulo="Sistema"
          itens={[
            {
              label: 'Integração',
              descricao: 'Backup em JSON, API e perguntas à IA',
              icone: 'cloud-upload-outline',
              onPress: (): void => irPara('Integracao'),
            },
          ]}
        />

        <MenuGrupo
          titulo="Zona de perigo"
          itens={[
            {
              label: 'Recriar banco de dados',
              descricao: 'Apaga todos os dados do app',
              icone: 'warning-outline',
              perigo: true,
              onPress: confirmarRecriacaoDoBanco,
            },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(() => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
}));
