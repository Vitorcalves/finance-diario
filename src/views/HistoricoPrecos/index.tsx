import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { MenuStackParamList } from '../../routes/types';
import { sharedStyles } from '../../theme';
import FiltrosHistorico from './components/FiltrosHistorico';
import GrupoPrecoCard from './components/GrupoPrecoCard';
import { useHistoricoPrecos } from './useHistoricoPrecos';

type HistoricoPrecosNavigation = NativeStackNavigationProp<MenuStackParamList, 'HistoricoPrecos'>;

/** Comparativo dos precos ja registrados, agrupados por variante ou produto. */
export default function HistoricoPrecosView(): React.ReactNode {
  const navigation = useNavigation<HistoricoPrecosNavigation>();
  const {
    loading,
    produtos,
    grupos,
    baseComparacao,
    ehMelhorPreco,
    produtoFiltro,
    alternarProdutoFiltro,
    varianteFiltro,
    codigoFiltro,
    filtrarPorCodigoBarras,
    limparFiltroCodigo,
    agrupamento,
    trocarAgrupamento,
    ordenacao,
    setOrdenacao,
    expandidos,
    alternarExpandido,
    nomeEmpresa,
    rotuloVariante,
  } = useHistoricoPrecos();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Historico de Precos" onBack={(): void => navigation.goBack()} />

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <FiltrosHistorico
            produtos={produtos}
            produtoFiltro={produtoFiltro}
            onAlternarProduto={alternarProdutoFiltro}
            varianteFiltro={varianteFiltro}
            codigoFiltro={codigoFiltro}
            onLerCodigo={filtrarPorCodigoBarras}
            onLimparCodigo={limparFiltroCodigo}
            rotuloVariante={rotuloVariante}
            agrupamento={agrupamento}
            onTrocarAgrupamento={trocarAgrupamento}
            ordenacao={ordenacao}
            onTrocarOrdenacao={setOrdenacao}
          />

          {grupos.length === 0 ? (
            <EmptyState
              icon="time-outline"
              message={
                produtoFiltro || varianteFiltro
                  ? 'Nenhum preco registrado para este filtro'
                  : 'Nenhum preco registrado ainda'
              }
              hint="Os precos sao registrados ao lancar itens com variante na tela inicial."
            />
          ) : (
            grupos.map((grupo) => (
              <GrupoPrecoCard
                key={grupo.chave}
                grupo={grupo}
                agrupamento={agrupamento}
                expandido={expandidos.includes(grupo.chave)}
                onAlternar={(): void => alternarExpandido(grupo.chave)}
                melhor={ehMelhorPreco(grupo)}
                baseComparacao={baseComparacao}
                nomeEmpresa={nomeEmpresa}
                rotuloVariante={rotuloVariante}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
