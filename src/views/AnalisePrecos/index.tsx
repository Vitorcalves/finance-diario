import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { DashboardStackParamList } from '../../routes/types';
import { sharedStyles } from '../../theme';
import FiltrosAnalise from './components/FiltrosAnalise';
import GraficoLinhas from './components/GraficoLinhas';
import ResumoPrecosCard from './components/ResumoPrecosCard';
import { useAnalisePrecos } from './useAnalisePrecos';

type AnalisePrecosNavigation = NativeStackNavigationProp<DashboardStackParamList, 'AnalisePrecos'>;
type AnalisePrecosRoute = RouteProp<DashboardStackParamList, 'AnalisePrecos'>;

/** Valor pago por produto ao longo do tempo, contra o historico de precos. */
export default function AnalisePrecosView(): React.ReactNode {
  const navigation = useNavigation<AnalisePrecosNavigation>();
  const route = useRoute<AnalisePrecosRoute>();
  const {
    loading,
    carregandoSeries,
    produtos,
    produtoId,
    selecionarProduto,
    variantes,
    varianteId,
    selecionarVariante,
    series,
    resumo,
  } = useAnalisePrecos(route.params?.produtoId);

  const semDados = series.every((serie) => serie.pontos.length === 0);

  const renderConteudo = (): React.ReactNode => {
    if (carregandoSeries) {
      return <LoadingState />;
    }

    if (semDados) {
      return (
        <EmptyState
          icon="time-outline"
          message="Sem precos para este filtro"
          hint="Escolha outra variante ou outro produto."
        />
      );
    }

    return (
      <>
        <ResumoPrecosCard resumo={resumo} />
        {/* A chave zera o ponto selecionado ao trocar de produto/variante. */}
        <GraficoLinhas key={`${produtoId ?? ''}:${varianteId ?? ''}`} series={series} />
      </>
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Analise de precos"
        subtitle="Valor pago x historico de precos"
        onBack={(): void => navigation.goBack()}
      />

      {loading ? (
        <LoadingState />
      ) : produtos.length === 0 ? (
        <EmptyState
          icon="trending-up-outline"
          message="Nenhum produto com compra ou preco registrado"
          hint="Lance compras com itens de produto na tela inicial para a analise aparecer aqui."
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <FiltrosAnalise
            produtos={produtos}
            produtoId={produtoId}
            onSelecionarProduto={selecionarProduto}
            variantes={variantes}
            varianteId={varianteId}
            onSelecionarVariante={selecionarVariante}
          />

          {renderConteudo()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
