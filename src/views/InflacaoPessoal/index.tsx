import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type ChipOpcao,
  ChipSelector,
  EmptyState,
  LoadingState,
  ScreenHeader,
} from '../../components/ui';
import type { DashboardStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import ComoCalculado from './components/ComoCalculado';
import GraficoInflacao from './components/GraficoInflacao';
import ItensInflacao from './components/ItensInflacao';
import ResumoInflacao from './components/ResumoInflacao';
import type { PeriodoInflacao } from './types';
import { useInflacaoPessoal } from './useInflacaoPessoal';

type InflacaoNavigation = NativeStackNavigationProp<DashboardStackParamList, 'InflacaoPessoal'>;

const PERIODOS: ChipOpcao<PeriodoInflacao>[] = [
  { valor: '6', rotulo: '6 meses' },
  { valor: '12', rotulo: '12 meses' },
  { valor: 'tudo', rotulo: 'Tudo' },
];

/**
 * Inflacao pessoal: quanto a cesta de compras de verdade subiu mes a mes,
 * calculada do historico de precos e pesada pelo que foi comprado.
 */
export default function InflacaoPessoalView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const navigation = useNavigation<InflacaoNavigation>();
  const {
    loading,
    periodo,
    trocarPeriodo,
    modo,
    trocarModo,
    inflacao,
    itens,
    mesDestaque,
    selecionarMes,
  } = useInflacaoPessoal();

  const { mesBase, acumulado } = inflacao;

  const renderConteudo = (): React.ReactNode => {
    if (mesBase === null || inflacao.meses.length === 0) {
      return (
        <EmptyState
          icon="basket-outline"
          message="Ainda não dá para calcular"
          hint="A inflação compara o preço dos mesmos itens em meses diferentes. Lance compras com itens de produto (com a marca) em pelo menos dois meses."
        />
      );
    }

    return (
      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.scrollContent}
      >
        <ChipSelector opcoes={PERIODOS} selecionado={periodo} onSelecionar={trocarPeriodo} />

        {acumulado === null ? (
          <EmptyState
            icon="basket-outline"
            message="Nenhum item da cesta neste período"
            hint="O peso de cada item vem das suas compras. Escolha um período maior ou lance compras com itens de produto para montar a cesta."
          />
        ) : (
          <>
            <ResumoInflacao inflacao={inflacao} acumulado={acumulado} mesBase={mesBase} />

            <GraficoInflacao
              mesBase={mesBase}
              meses={inflacao.meses}
              modo={modo}
              onTrocarModo={trocarModo}
              mesDestaque={mesDestaque}
              onSelecionarMes={selecionarMes}
            />

            <ItensInflacao
              itens={itens}
              onAbrirProduto={(produtoId): void =>
                navigation.navigate('AnalisePrecos', { produtoId })
              }
            />

            <ComoCalculado />
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Inflação pessoal"
        subtitle="Quanto a sua cesta de compras subiu"
        onBack={(): void => navigation.goBack()}
      />

      {loading ? <LoadingState message="Calculando a cesta..." /> : renderConteudo()}
    </SafeAreaView>
  );
}
