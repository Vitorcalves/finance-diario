import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, PressableScale, ScreenHeader } from '../../components/ui';
import { iconSize, spacing, useTheme } from '../../theme';
import DetalheDia from './components/DetalheDia';
import GraficoAcumulado from './components/GraficoAcumulado';
import GraficoCategoria from './components/GraficoCategoria';
import GraficoDiario from './components/GraficoDiario';
import GraficoLocal from './components/GraficoLocal';
import ResumoMes from './components/ResumoMes';
import SeletorMes from './components/SeletorMes';
import { useMensal } from './useMensal';

/** Arrasto horizontal minimo, em px, para trocar de mes. */
const ARRASTO_TROCA_MES = 60;

/** Gastos do mes: evolucao acumulada, gasto diario e detalhe do dia. */
export default function MensalView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const {
    loading,
    carregando,
    atualizando,
    atualizar,
    mesSelecionado,
    trocarMes,
    direcao,
    mesCorrente,
    mesFuturo,
    diasNoMes,
    diasDecorridos,
    dias,
    resumo,
    gastoPorLocal,
    gastoPorCategoria,
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

  // O conteudo entra deslizando do lado para onde o usuario navegou.
  const [entrada] = useState(() => new Animated.Value(1));
  const mesNaTela = dias[0]?.data ?? '';

  useEffect(() => {
    entrada.setValue(0);
    Animated.spring(entrada, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [mesNaTela, entrada]);

  /** Arrastar a tela para o lado troca de mes, como virar a pagina de uma agenda. */
  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evento, estado) =>
          Math.abs(estado.dx) > 24 && Math.abs(estado.dx) > Math.abs(estado.dy) * 2,
        onPanResponderRelease: (_evento, estado) => {
          if (Math.abs(estado.dx) < ARRASTO_TROCA_MES) {
            return;
          }

          trocarMes(mesSelecionado.add(estado.dx < 0 ? 1 : -1, 'month'));
        },
      }),
    [trocarMes, mesSelecionado],
  );

  const translateX = entrada.interpolate({
    inputRange: [0, 1],
    outputRange: [direcao * 48, 0],
  });

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Gastos do mês"
        subtitle="Como o gasto evolui do dia 1 até o fim do mês"
        right={
          mesCorrente ? null : (
            <PressableScale
              onPress={(): void => trocarMes(dayjs())}
              style={sharedStyles.headerAction}
              escala={0.9}
              accessibilityRole="button"
              accessibilityLabel="Voltar para o mês atual"
            >
              <Ionicons name="today-outline" size={iconSize.md} color={colors.primary} />
            </PressableScale>
          )
        }
      />

      {loading ? (
        <LoadingState message="Carregando o mês..." />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          <SeletorMes mes={mesSelecionado} onTrocarMes={trocarMes} carregando={carregando} />

          <Animated.View
            {...gesto.panHandlers}
            style={{ gap: spacing.md, opacity: entrada, transform: [{ translateX }] }}
          >
            {semMovimento ? (
              <EmptyState
                icon="calendar-outline"
                message="Nenhum lançamento neste mês"
                hint="Registre um gasto na tela inicial para acompanhar o ritmo do mês."
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

                <GraficoCategoria gastoPorCategoria={gastoPorCategoria} mes={mesSelecionado} />

                <GraficoLocal gastoPorLocal={gastoPorLocal} />
              </>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
