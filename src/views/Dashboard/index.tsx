import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import type { DashboardStackParamList } from '../../routes/types';
import { sharedStyles } from '../../theme';
import AnaliseCard from './components/AnaliseCard';

type DashboardNavigation = NativeStackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

/** Hub do dashboard: lista as analises disponiveis. */
export default function DashboardHomeView(): React.ReactNode {
  const navigation = useNavigation<DashboardNavigation>();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Dashboard" subtitle="Analises a partir do que ja foi lancado." />

      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.scrollContent}
      >
        <AnaliseCard
          titulo="Analise de precos"
          descricao="Quanto voce pagou por produto ao longo do tempo, contra o historico de precos."
          icone="trending-up-outline"
          onPress={(): void => navigation.navigate('AnalisePrecos')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
