import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import { colors, iconSize, sharedStyles } from '../../theme';
import DetalheDia from './components/DetalheDia';
import GraficoAcumulado from './components/GraficoAcumulado';
import GraficoDiario from './components/GraficoDiario';
import ResumoMes from './components/ResumoMes';
import SeletorMes from './components/SeletorMes';
import { useMensal } from './useMensal';

/** Gastos do mes: evolucao acumulada, gasto diario e detalhe do dia. */
export default function MensalView(): React.ReactNode {
  const {
    loading,
    mesSelecionado,
    trocarMes,
    mesCorrente,
    mesFuturo,
    diasNoMes,
    diasDecorridos,
    dias,
    resumo,
    comparativo,
    projecaoPorDia,
    escalaAcumulado,
    escalaDiaria,
    diaSelecionado,
    alternarDia,
    detalheDia,
    nomeEmpresa,
    semMovimento,
  } = useMensal();

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Gastos do mes"
        subtitle="Como o gasto evolui do dia 1 ate o fim do mes"
        right={
          mesCorrente ? null : (
            <Pressable onPress={(): void => trocarMes(dayjs())} style={sharedStyles.headerAction}>
              <Ionicons name="today-outline" size={iconSize.lg} color={colors.primary} />
            </Pressable>
          )
        }
      />

      {loading ? (
        <LoadingState message="Carregando o mes..." />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <SeletorMes mes={mesSelecionado} onTrocarMes={trocarMes} />

          {semMovimento ? (
            <EmptyState
              icon="calendar-outline"
              message="Nenhum lancamento neste mes"
              hint="Registre um gasto na tela inicial para acompanhar o ritmo do mes."
            />
          ) : (
            <>
              <ResumoMes
                resumo={resumo}
                comparativo={comparativo}
                mes={mesSelecionado}
                mesCorrente={mesCorrente}
                mesFuturo={mesFuturo}
                diasDecorridos={diasDecorridos}
              />

              <GraficoAcumulado
                dias={dias}
                projecaoPorDia={projecaoPorDia}
                escala={escalaAcumulado}
                totalMesAnterior={comparativo.totalAnterior}
                mesCorrente={mesCorrente}
                diasNoMes={diasNoMes}
              />

              <GraficoDiario
                dias={dias}
                escala={escalaDiaria}
                diasNoMes={diasNoMes}
                diaSelecionado={diaSelecionado}
                onSelecionarDia={alternarDia}
                maiorDia={resumo.maiorDia}
              >
                <DetalheDia detalhe={detalheDia} nomeEmpresa={nomeEmpresa} />
              </GraficoDiario>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
