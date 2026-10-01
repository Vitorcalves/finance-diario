import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aparecer, ScreenHeader } from '../../components/ui';
import type { DashboardStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import AnaliseCard from './components/AnaliseCard';

type DashboardNavigation = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

/** Hub da aba Analises: as telas de consulta e comparacao de precos. */
export default function DashboardHomeView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const navigation = useNavigation<DashboardNavigation>();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Análises" subtitle="Preços, comparações e pesquisa de mercado" />

      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.scrollContent}
      >
        <Aparecer>
          <AnaliseCard
            titulo="Análise de preços"
            descricao="Quanto você pagou por produto ao longo do tempo, contra o histórico de preços."
            icone="trending-up-outline"
            onPress={(): void => navigation.navigate('AnalisePrecos')}
          />
        </Aparecer>

        <Aparecer atraso={60}>
          <AnaliseCard
            titulo="Histórico de preços"
            descricao="Compare o preço de cada variante entre mercados e encontre o mais barato."
            icone="pricetags-outline"
            tom="info"
            onPress={(): void => navigation.navigate('HistoricoPrecos')}
          />
        </Aparecer>

        <Aparecer atraso={120}>
          <AnaliseCard
            titulo="Orçamento"
            descricao="Pesquise preços na gôndola e veja em qual mercado a lista sai mais barata."
            icone="cart-outline"
            tom="warning"
            onPress={(): void => navigation.navigate('Orcamento')}
          />
        </Aparecer>
      </ScrollView>
    </SafeAreaView>
  );
}
