import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  EmptyState,
  KeyboardAvoidingScreen,
  LoadingState,
  ScreenHeader,
  ScrollComTeclado,
} from '../../components/ui';
import type { DashboardStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import FiltrosHistorico from './components/FiltrosHistorico';
import GrupoPrecoCard from './components/GrupoPrecoCard';
import { useHistoricoPrecos } from './useHistoricoPrecos';

type HistoricoPrecosNavigation = NativeStackNavigationProp<
  DashboardStackParamList,
  'HistoricoPrecos'
>;

/** Comparativo dos precos ja registrados, agrupados por variante ou produto. */
export default function HistoricoPrecosView(): React.ReactNode {
  const { sharedStyles } = useTheme();
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
      <ScreenHeader title="Histórico de Preços" onBack={(): void => navigation.goBack()} />

      {loading ? (
        <LoadingState />
      ) : (
        <KeyboardAvoidingScreen>
          <ScrollComTeclado
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
                    ? 'Nenhum preço registrado para este filtro'
                    : 'Nenhum preço registrado ainda'
                }
                hint="Os preços são registrados ao lançar itens com variante na tela inicial."
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
          </ScrollComTeclado>
        </KeyboardAvoidingScreen>
      )}
    </SafeAreaView>
  );
}
